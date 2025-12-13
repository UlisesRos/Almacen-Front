import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import BackButton from './components/BackButton';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import { syncService } from './utils/syncService';
import { useToast } from '@chakra-ui/react';

// Páginas
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Products from './pages/Products';
import Sale from './pages/Sale';
import History from './pages/History';
import Settings from './pages/Settings';
import Reports from './pages/Reports';

function App() {
  const { isAuthenticated } = useAuth();
  const toast = useToast();

  // Sincronización automática cuando vuelve la conexión
  useEffect(() => {
    if (!isAuthenticated) return;

    let syncTimeout = null;

    const handleOnline = async () => {
      // Esperar un poco para asegurar que la conexión es estable
      syncTimeout = setTimeout(async () => {
        const syncStatus = syncService.getSyncStatus();
        
        if (syncStatus.hasPendingData) {
          // Mostrar notificación de sincronización en progreso
          const toastId = toast({
            title: 'Sincronizando datos...',
            description: 'Se detectó conexión a internet. Sincronizando datos pendientes.',
            status: 'info',
            duration: null,
            isClosable: false,
          });

          try {
            const result = await syncService.syncAll();
            
            toast.close(toastId);
            
            if (result.success) {
              toast({
                title: 'Sincronización completada',
                description: `Se sincronizaron ${(result.data.pendingProducts || 0) + (result.data.pendingSales || 0)} elementos pendientes`,
                status: 'success',
                duration: 5000,
                isClosable: true,
              });
            } else {
              toast({
                title: 'Error en sincronización',
                description: 'Algunos datos no se pudieron sincronizar',
                status: 'warning',
                duration: 5000,
                isClosable: true,
              });
            }
          } catch (error) {
            toast.close(toastId);
            console.error('Error en sincronización automática:', error);
          }
        }
      }, 2000); // Esperar 2 segundos después de detectar conexión
    };

    const handleOffline = () => {
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar si hay datos pendientes al cargar la app
    if (navigator.onLine) {
      handleOnline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (syncTimeout) {
        clearTimeout(syncTimeout);
      }
    };
  }, [isAuthenticated, toast]);

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
        <Route path="/reports" element={
          <ProtectedRoute>
            <Reports />
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