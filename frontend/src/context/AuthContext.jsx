import { createContext, useContext } from 'react';

// AuthContext holds { user, setUser, logout }
// user shape: { id, email, fullName, role, isAuthenticated } | null
export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}