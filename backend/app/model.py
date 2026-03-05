from sentence_transformers import SentenceTransformer
import numpy as np
import logging

logger = logging.getLogger(__name__)

# Global model instance (loaded once)
_model = None

def get_model():
    # Get or initialize the SBERT model (singleton pattern)
    global _model
    if _model is None:
        logger.info("Loading SBERT model...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
        logger.info("Model loaded successfully!")
    return _model

def encode_text(text: str, normalize: bool = True) -> np.ndarray:
    
    # Encode a single text to embedding vector
    
    # Args:
    #     text: Text string to encode
    #     normalize: Whether to L2 normalize the embedding
    
    # Returns:
    #     numpy array (embedding vector)

    model = get_model()
    
    # Encode single text
    embedding = model.encode(
        text,
        convert_to_numpy=True,
        normalize_embeddings=normalize,
        show_progress_bar=False
    )
    
    return embedding

def encode_texts(texts: list[str], normalize: bool = True) -> np.ndarray:

    # Encode multiple texts to embeddings
    
    # Args:
    #     texts: List of text strings
    #     normalize: Whether to L2 normalize embeddings
    
    # Returns:
    #     numpy array of embeddings (n_texts, embedding_dim)
 
    model = get_model()
    
    embeddings = model.encode(
        texts,
        convert_to_numpy=True,
        normalize_embeddings=normalize,
        show_progress_bar=True,
        batch_size=32
    )
    
    return embeddings

