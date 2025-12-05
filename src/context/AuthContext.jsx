import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [store, setStore] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedStore = localStorage.getItem('store');

      if (storedToken && storedStore) {
        setToken(storedToken);
        setStore(JSON.parse(storedStore));
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    
    if (response.success) {
      const { token, store } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('store', JSON.stringify(store));
      
      setToken(token);
      setStore(store);
      
      return response;
    }
    
    throw new Error(response.message);
  };

  const register = async (data) => {
    const response = await authAPI.register(data);
    
    if (response.success) {
      const { token, store } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('store', JSON.stringify(store));
      
      setToken(token);
      setStore(store);
      
      return response;
    }
    
    throw new Error(response.message);
  };

  const loginGoogle = async (googleData) => {
    const response = await authAPI.loginGoogle(googleData);
    
    if (response.success) {
      const { token, store } = response.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('store', JSON.stringify(store));
      
      setToken(token);
      setStore(store);
      
      return response;
    }
    
    throw new Error(response.message);
  };

  const updateStore = (updatedStore) => {
    localStorage.setItem('store', JSON.stringify(updatedStore));
    setStore(updatedStore);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('store');
    setToken(null);
    setStore(null);
  };

  const value = {
    store,
    token,
    isAuthenticated: !!token,
    loading,
    login,
    register,
    loginGoogle,
    updateStore, // 👈 Exportar nueva función
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};