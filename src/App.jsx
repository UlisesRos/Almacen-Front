import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import BackButton from './components/BackButton';
import PWAInstallPrompt from './components/PWAInstallPrompt';

// Páginas
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Products from './pages/Products';
import Sale from './pages/Sale';
import History from './pages/History';
import Settings from './pages/Settings';

function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
    
      <Routes>
        {/* Rutas públicas */}
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/" /> : <Register />} 
        />

        {/* Rutas protegidas */}
        <Route path="/" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />
        <Route path="/products" element={
          <ProtectedRoute>
            <Products />
          </ProtectedRoute>
        } />
        <Route path="/sale" element={
          <ProtectedRoute>
            <Sale />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute>
            <History />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        {/* Ruta por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <BackButton />
      {isAuthenticated && <PWAInstallPrompt />}
    </>
  );
}

export default App;