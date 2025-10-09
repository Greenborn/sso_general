# Ejemplos de Integración con SSO

Este documento muestra cómo integrar tu aplicación con el servicio SSO.

## 📝 Ejemplo 1: Integración JavaScript Vanilla

```javascript
// config.js
const SSO_CONFIG = {
  baseUrl: 'https://auth.greenborn.com.ar',
  appCallbackUrl: 'https://tu-app.com/auth/callback',
  tokenStorageKey: 'sso_bearer_token',
  userStorageKey: 'sso_user_data'
};

// auth.js
class SSOClient {
  constructor(config) {
    this.config = config;
  }

  // 1. Iniciar proceso de login
  login() {
    const uniqueId = this.generateUniqueId();
    localStorage.setItem('sso_pending_unique_id', uniqueId);
    
    const params = new URLSearchParams({
      url_redireccion_app: this.config.appCallbackUrl,
      unique_id: uniqueId
    });
    
    window.location.href = `${this.config.baseUrl}/auth/google?${params}`;
  }

  // 2. Manejar callback (ejecutar en la página de callback)
  async handleCallback() {
    const params = new URLSearchParams(window.location.search);
    const temporalToken = params.get('token');
    const uniqueId = params.get('unique_id');
    
    if (!temporalToken) {
      throw new Error('Token temporal no recibido');
    }
    
    // Verificar unique_id
    const pendingUniqueId = localStorage.getItem('sso_pending_unique_id');
    if (pendingUniqueId !== uniqueId) {
      throw new Error('Unique ID no coincide');
    }
    
    // Intercambiar token temporal por bearer token
    const response = await fetch(`${this.config.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token: temporalToken })
    });
    
    if (!response.ok) {
      throw new Error('Error al obtener bearer token');
    }
    
    const data = await response.json();
    
    // Guardar bearer token y usuario
    localStorage.setItem(this.config.tokenStorageKey, data.data.bearer_token);
    localStorage.setItem(this.config.userStorageKey, JSON.stringify(data.data.user));
    localStorage.removeItem('sso_pending_unique_id');
    
    return data.data;
  }

  // 3. Verificar si hay sesión activa
  async verifySession() {
    const token = this.getToken();
    
    if (!token) {
      return { authenticated: false };
    }
    
    try {
      const response = await fetch(`${this.config.baseUrl}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        
        if (error.require_reauth) {
          // Sesión Google expirada, requiere re-login
          this.clearSession();
          return { authenticated: false, requireReauth: true };
        }
        
        throw new Error('Token inválido');
      }
      
      const data = await response.json();
      
      // Actualizar datos de usuario
      localStorage.setItem(this.config.userStorageKey, JSON.stringify(data.data.user));
      
      return {
        authenticated: true,
        user: data.data.user,
        extended: data.data.extended
      };
    } catch (error) {
      this.clearSession();
      return { authenticated: false, error: error.message };
    }
  }

  // 4. Hacer peticiones autenticadas
  async authenticatedFetch(url, options = {}) {
    const token = this.getToken();
    
    if (!token) {
      throw new Error('No hay token de autenticación');
    }
    
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
    
    return fetch(url, { ...options, headers });
  }

  // 5. Cerrar sesión
  async logout() {
    const token = this.getToken();
    
    if (token) {
      try {
        await fetch(`${this.config.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }
    
    this.clearSession();
  }

  // Helpers
  getToken() {
    return localStorage.getItem(this.config.tokenStorageKey);
  }

  getUser() {
    const userData = localStorage.getItem(this.config.userStorageKey);
    return userData ? JSON.parse(userData) : null;
  }

  clearSession() {
    localStorage.removeItem(this.config.tokenStorageKey);
    localStorage.removeItem(this.config.userStorageKey);
    localStorage.removeItem('sso_pending_unique_id');
  }

  generateUniqueId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Uso
const ssoClient = new SSOClient(SSO_CONFIG);

// En tu página principal
document.getElementById('loginButton').addEventListener('click', () => {
  ssoClient.login();
});

// En tu página de callback (/auth/callback)
window.addEventListener('load', async () => {
  try {
    const result = await ssoClient.handleCallback();
    console.log('Login exitoso:', result);
    window.location.href = '/dashboard';
  } catch (error) {
    console.error('Error en callback:', error);
    window.location.href = '/login?error=auth_failed';
  }
});

// Verificar sesión al cargar la app
ssoClient.verifySession().then(result => {
  if (result.authenticated) {
    console.log('Usuario autenticado:', result.user);
  } else if (result.requireReauth) {
    console.log('Sesión expirada, redirigiendo a login...');
    window.location.href = '/login';
  }
});

// Cerrar sesión
document.getElementById('logoutButton').addEventListener('click', async () => {
  await ssoClient.logout();
  window.location.href = '/';
});
```

## 📝 Ejemplo 2: Integración React

```javascript
// hooks/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';

const SSO_BASE_URL = 'https://auth.greenborn.com.ar';
const APP_CALLBACK_URL = 'https://tu-app.com/auth/callback';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  useEffect(() => {
    // Cargar token del localStorage
    const savedToken = localStorage.getItem('sso_bearer_token');
    if (savedToken) {
      setToken(savedToken);
      verifySession(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const verifySession = async (bearerToken) => {
    try {
      const response = await fetch(`${SSO_BASE_URL}/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${bearerToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.require_reauth) {
          logout();
        }
        throw new Error('Sesión inválida');
      }

      const data = await response.json();
      setUser(data.data.user);
    } catch (error) {
      console.error('Error verificando sesión:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    const uniqueId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('sso_pending_unique_id', uniqueId);
    
    const params = new URLSearchParams({
      url_redireccion_app: APP_CALLBACK_URL,
      unique_id: uniqueId
    });
    
    window.location.href = `${SSO_BASE_URL}/auth/google?${params}`;
  };

  const handleCallback = async (temporalToken, uniqueId) => {
    try {
      const pendingUniqueId = localStorage.getItem('sso_pending_unique_id');
      if (pendingUniqueId !== uniqueId) {
        throw new Error('Unique ID no coincide');
      }

      const response = await fetch(`${SSO_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: temporalToken })
      });

      if (!response.ok) {
        throw new Error('Error al obtener bearer token');
      }

      const data = await response.json();
      
      localStorage.setItem('sso_bearer_token', data.data.bearer_token);
      localStorage.removeItem('sso_pending_unique_id');
      
      setToken(data.data.bearer_token);
      setUser(data.data.user);
      
      return data.data;
    } catch (error) {
      console.error('Error en callback:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch(`${SSO_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (error) {
        console.error('Error al cerrar sesión:', error);
      }
    }
    
    localStorage.removeItem('sso_bearer_token');
    localStorage.removeItem('sso_pending_unique_id');
    setToken(null);
    setUser(null);
  };

  const authenticatedFetch = async (url, options = {}) => {
    if (!token) {
      throw new Error('No autenticado');
    }

    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };

    return fetch(url, { ...options, headers });
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        login, 
        logout, 
        handleCallback,
        authenticatedFetch,
        isAuthenticated: !!user 
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

// App.js
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

// components/AuthCallback.js
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const uniqueId = searchParams.get('unique_id');

    if (token && uniqueId) {
      handleCallback(token, uniqueId)
        .then(() => {
          navigate('/dashboard');
        })
        .catch(error => {
          console.error('Error:', error);
          navigate('/?error=auth_failed');
        });
    } else {
      navigate('/?error=missing_params');
    }
  }, []);

  return <div>Autenticando...</div>;
}

// components/ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// components/LoginButton.js
import { useAuth } from '../hooks/useAuth';

function LoginButton() {
  const { login } = useAuth();

  return (
    <button onClick={login}>
      Iniciar sesión con Google
    </button>
  );
}

// components/LogoutButton.js
import { useAuth } from '../hooks/useAuth';

function LogoutButton() {
  const { logout } = useAuth();

  return (
    <button onClick={logout}>
      Cerrar sesión
    </button>
  );
}
```

## 📝 Ejemplo 3: Integración Node.js/Express (Backend)

```javascript
// middleware/auth.js
const axios = require('axios');

const SSO_BASE_URL = 'https://auth.greenborn.com.ar';

async function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token no proporcionado'
      });
    }

    const token = authHeader.substring(7);

    // Verificar token con SSO
    const response = await axios.get(`${SSO_BASE_URL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.data.success) {
      req.user = response.data.data.user;
      next();
    } else {
      throw new Error('Token inválido');
    }
  } catch (error) {
    if (error.response?.data?.require_reauth) {
      return res.status(401).json({
        error: 'Sesión expirada',
        require_reauth: true
      });
    }

    return res.status(401).json({
      error: 'No autorizado'
    });
  }
}

module.exports = { verifyToken };

// routes/protected.js
const express = require('express');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

router.get('/api/user/profile', verifyToken, (req, res) => {
  res.json({
    user: req.user
  });
});

router.get('/api/data', verifyToken, (req, res) => {
  // req.user está disponible aquí
  res.json({
    message: 'Datos protegidos',
    user: req.user
  });
});

module.exports = router;
```

## 🔄 Ejemplo de Flujo Completo

```javascript
// 1. Usuario hace clic en "Login"
loginButton.click() → ssoClient.login()
  → Redirige a: https://auth.greenborn.com.ar/auth/google?url_redireccion_app=...&unique_id=...

// 2. Usuario se autentica con Google

// 3. SSO redirige de vuelta a tu app
  → https://tu-app.com/auth/callback?token=TEMPORAL_TOKEN&unique_id=abc123

// 4. Tu app intercambia el token temporal
POST https://auth.greenborn.com.ar/auth/login
{ "token": "TEMPORAL_TOKEN" }
  → Recibe: { bearer_token: "BEARER_TOKEN", user: {...} }

// 5. Tu app guarda el bearer token
localStorage.setItem('sso_bearer_token', bearer_token);

// 6. Tu app hace peticiones con el bearer token
GET /api/data
Headers: Authorization: Bearer BEARER_TOKEN

// 7. Periódicamente verificar y extender token
GET https://auth.greenborn.com.ar/auth/verify
Headers: Authorization: Bearer BEARER_TOKEN
  → Token extendido automáticamente

// 8. Logout
POST https://auth.greenborn.com.ar/auth/logout
Headers: Authorization: Bearer BEARER_TOKEN
  → Sesión cerrada en SSO y Google
```

## ⚠️ Manejo de Errores

```javascript
// Error: Token expirado
{
  "success": false,
  "error": "TOKEN_EXPIRED"
}
→ Acción: Redirigir a login

// Error: Sesión Google expirada
{
  "success": false,
  "error": "GOOGLE_SESSION_EXPIRED",
  "require_reauth": true
}
→ Acción: Forzar re-autenticación

// Error: URL no autorizada
{
  "success": false,
  "error": "UNAUTHORIZED_REDIRECT_URL"
}
→ Acción: Contactar administrador para agregar URL
```

## 📚 Recursos Adicionales

- [Documentación completa](./DOCUMENTATION.md)
- [API Reference](./README.md)
- Soporte: https://github.com/Greenborn/sso_general/issues
