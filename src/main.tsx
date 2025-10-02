import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/index.css';
import { AuthProvider } from './context/auth-context';
import { DataProvider } from './context/data-context';
import { Toaster } from './components/ui/toaster';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <DataProvider>
        <AuthProvider>
          <App />
          <Toaster />
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
  </React.StrictMode>
);
