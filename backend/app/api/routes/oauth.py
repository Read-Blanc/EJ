# app/api/routes/oauth.py
"""
OAuth 2.0 Authentication Routes
Supports Google, Microsoft, and GitHub OAuth flows
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
import httpx
import secrets
from datetime import datetime, timedelta

from app.database import get_db
from app.schemas.auth import Token, UserResponse
from app.crud import auth_crud
from app.utils.auth import create_tokens_for_user
from app.core.config import settings
import logging

logger = logging.getLogger("evalai")
router = APIRouter()

# OAuth Configuration
OAUTH_PROVIDERS = {
    "google": {
        "authorize_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "scope": "openid email profile",
    },
    "microsoft": {
        "authorize_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
        "userinfo_url": "https://graph.microsoft.com/v1.0/me",
        "client_id": settings.MICROSOFT_CLIENT_ID,
        "client_secret": settings.MICROSOFT_CLIENT_SECRET,
        "scope": "openid email profile",
    },
    "github": {
        "authorize_url": "https://github.com/login/oauth/authorize",
        "token_url": "https://github.com/login/oauth/access_token",
        "userinfo_url": "https://api.github.com/user",
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "scope": "read:user user:email",
    },
}

# In-memory state storage (use Redis in production)
oauth_states = {}


# ============================================
# OAuth Initiation
# ============================================

@router.get("/oauth/{provider}/login")
async def oauth_login(provider: str):
    """
    Initiate OAuth flow for specified provider
    
    Redirects user to provider's authorization page
    """
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    config = OAUTH_PROVIDERS[provider]
    
    # Generate random state for CSRF protection
    state = secrets.token_urlsafe(32)
    oauth_states[state] = {
        "provider": provider,
        "created_at": datetime.utcnow()
    }
    
    # Build authorization URL
    redirect_uri = f"{settings.BACKEND_URL}/auth/oauth/{provider}/callback"
    
    params = {
        "client_id": config["client_id"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": config["scope"],
        "state": state,
    }
    
    # Add provider-specific parameters
    if provider == "microsoft":
        params["response_mode"] = "query"
    
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    auth_url = f"{config['authorize_url']}?{query_string}"
    
    return RedirectResponse(url=auth_url)


# ============================================
# OAuth Callback
# ============================================

@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: str,
    code: str,
    state: str,
    error: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Handle OAuth callback from provider
    
    Exchanges authorization code for access token,
    fetches user info, and creates/logs in user
    """
    # Check for OAuth errors
    if error:
        logger.error(f"OAuth error from {provider}: {error}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"OAuth authentication failed: {error}"
        )
    
    # Validate state (CSRF protection)
    if state not in oauth_states:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth state"
        )
    
    stored_state = oauth_states.pop(state)
    
    # Check state expiration (5 minutes)
    if datetime.utcnow() - stored_state["created_at"] > timedelta(minutes=5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OAuth state expired"
        )
    
    if provider not in OAUTH_PROVIDERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported OAuth provider: {provider}"
        )
    
    config = OAUTH_PROVIDERS[provider]
    
    # Exchange code for access token
    redirect_uri = f"{settings.BACKEND_URL}/auth/oauth/{provider}/callback"
    
    async with httpx.AsyncClient() as client:
        # Get access token
        token_response = await client.post(
            config["token_url"],
            data={
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "code": code,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            },
            headers={"Accept": "application/json"}
        )
        
        if token_response.status_code != 200:
            logger.error(f"Failed to get access token: {token_response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to obtain access token"
            )
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        # Get user info
        userinfo_response = await client.get(
            config["userinfo_url"],
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json"
            }
        )
        
        if userinfo_response.status_code != 200:
            logger.error(f"Failed to get user info: {userinfo_response.text}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch user information"
            )
        
        user_data = userinfo_response.json()
    
    # Extract email and name from provider response
    email = None
    name = None
    
    if provider == "google":
        email = user_data.get("email")
        name = user_data.get("name")
    elif provider == "microsoft":
        email = user_data.get("mail") or user_data.get("userPrincipalName")
        name = user_data.get("displayName")
    elif provider == "github":
        email = user_data.get("email")
        name = user_data.get("name") or user_data.get("login")
    
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not retrieve email from OAuth provider"
        )
    
    # Check if user exists
    user = auth_crud.get_user_by_email(db, email)
    
    if not user:
        # Create new user
        # Generate username from email
        username = email.split("@")[0]
        
        # Make username unique if needed
        base_username = username
        counter = 1
        while auth_crud.get_user_by_username(db, username):
            username = f"{base_username}{counter}"
            counter += 1
        
        # Create user with OAuth provider
        user = auth_crud.create_oauth_user(
            db=db,
            email=email,
            username=username,
            full_name=name or username,
            oauth_provider=provider,
            oauth_provider_id=user_data.get("id") or user_data.get("sub"),
            role="student"  # Default to student, can be changed later
        )
        
        logger.info(f"New OAuth user created: {email} via {provider}")
    else:
        # Update OAuth info if not set
        if not user.oauth_provider:
            user.oauth_provider = provider
            user.oauth_provider_id = user_data.get("id") or user_data.get("sub")
            db.commit()
    
    # Create JWT tokens
    tokens = create_tokens_for_user(user.id, user.username, user.role.value)
    
    # Store refresh token
    auth_crud.create_refresh_token(
        db=db,
        user_id=user.id,
        token=tokens["refresh_token"]
    )
    
    logger.info(f"OAuth login successful: {email} via {provider}")
    
    # Redirect to frontend with tokens
    frontend_url = settings.FRONTEND_URL
    redirect_url = (
        f"{frontend_url}/auth/callback?"
        f"access_token={tokens['access_token']}&"
        f"refresh_token={tokens['refresh_token']}&"
        f"token_type={tokens['token_type']}"
    )
    
    return RedirectResponse(url=redirect_url)

    
    # ✅ URL-encode the tokens so JWT special chars (+, /, =) don't corrupt the redirect
    
    params = urlencode({
        "access_token": tokens["access_token"],
        "refresh_token": tokens["refresh_token"],
        "token_type": tokens["token_type"],
    })
    
    frontend_url = settings.FRONTEND_URL
    redirect_url = f"{frontend_url}/auth/callback?{params}"
    
    return RedirectResponse(url=redirect_url)


# ============================================
# Cleanup expired states (background task)
# ============================================

def cleanup_expired_oauth_states():
    """Remove OAuth states older than 5 minutes"""
    now = datetime.utcnow()
    expired = [
        state for state, data in oauth_states.items()
        if now - data["created_at"] > timedelta(minutes=5)
    ]
    for state in expired:
        oauth_states.pop(state, None)
    
    logger.info(f"Cleaned up {len(expired)} expired OAuth states")