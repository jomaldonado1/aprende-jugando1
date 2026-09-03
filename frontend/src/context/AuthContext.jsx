import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

const safeGetStorage = (key) => {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined' || val === 'null') return null;
    return val;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return null;
  }
};

const safeGetJSONStorage = (key) => {
  try {
    const val = safeGetStorage(key);
    return val ? JSON.parse(val) : null;
  } catch (e) {
    console.error(`Error parsing ${key} from localStorage:`, e);
    try { localStorage.removeItem(key); } catch (_) {}
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => safeGetJSONStorage('user'));
  const [token, setToken] = useState(() => safeGetStorage('token'));
  const [loading, setLoading] = useState(true);

  const logout = () => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } catch (e) {
      console.error('Error removing token/user from localStorage:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      if (token) {
        try {
          // Timeout rápido de 8s para evitar que el usuario se quede en pantalla de carga si Render duerme
          const res = await api.get('/api/auth/me', { timeout: 8000 });
          if (isMounted) {
            setUser(res.data);
            try { localStorage.setItem('user', JSON.stringify(res.data)); } catch (_) {}
          }
        } catch (err) {
          console.warn('Error al verificar sesión (servidor inaccesible o token expirado):', err);
          if (isMounted) {
            logout();
          }
        }
      } else {
        if (isMounted) {
          setUser(null);
        }
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const login = async (email, password) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPassword = password ? password.trim() : '';
    const res = await api.post('/api/auth/login', { email: cleanEmail, password: cleanPassword });
    const { access_token, user: loggedUser } = res.data;
    setToken(access_token);
    setUser(loggedUser);
    try {
      localStorage.setItem('token', access_token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
    } catch (e) {
      console.error('Error saving to localStorage:', e);
    }
    return loggedUser;
  };

  const register = async (email, password, secret_question = null, secret_answer = null) => {
    const cleanEmail = email ? email.trim().toLowerCase() : '';
    const cleanPassword = password ? password.trim() : '';
    await api.post('/api/auth/register', { 
      email: cleanEmail, 
      password: cleanPassword, 
      secret_question, 
      secret_answer 
    });
    // Tras registrarse, iniciar sesión automáticamente
    return await login(cleanEmail, cleanPassword);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

