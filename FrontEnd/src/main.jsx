import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Global Axios Request Interceptor:
//Securely attaches the JWT Token to every HTTP Request sent to the Backend
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    const isBackendRequest = !config.url?.startsWith('http') || config.url?.includes('localhost:8080');

    if (token && isBackendRequest) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)