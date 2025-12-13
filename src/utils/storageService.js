/**
 * Servicio para manejar el almacenamiento local (localStorage)
 * Gestiona el cache de productos, ventas y datos pendientes de sincronización
 */

const STORAGE_KEYS = {
  PRODUCTS: 'almacen_products',
  SALES: 'almacen_sales',
  PENDING_SALES: 'almacen_pending_sales',
  PENDING_PRODUCTS: 'almacen_pending_products',
  LAST_SYNC: 'almacen_last_sync',
  SYNC_QUEUE: 'almacen_sync_queue',
};

export const storageService = {
  // ========== PRODUCTOS ==========
  /**
   * Guarda productos en el cache local
   */
  saveProducts: (products) => {
    try {
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify({
        data: products,
        timestamp: Date.now(),
      }));
      return true;
    } catch (error) {
      console.error('Error guardando productos:', error);
      return false;
    }
  },

  /**
   * Obtiene productos del cache local
   */
  getProducts: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return parsed.data || null;
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      return null;
    }
  },

  /**
   * Obtiene la fecha de última actualización de productos
   */
  getProductsTimestamp: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return parsed.timestamp || null;
    } catch (error) {
      return null;
    }
  },

  // ========== VENTAS ==========
  /**
   * Guarda ventas en el cache local
   */
  saveSales: (sales) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify({
        data: sales,
        timestamp: Date.now(),
      }));
      return true;
    } catch (error) {
      console.error('Error guardando ventas:', error);
      return false;
    }
  },

  /**
   * Obtiene ventas del cache local
   */
  getSales: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return parsed.data || null;
    } catch (error) {
      console.error('Error obteniendo ventas:', error);
      return null;
    }
  },

  /**
   * Obtiene la fecha de última actualización de ventas
   */
  getSalesTimestamp: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      return parsed.timestamp || null;
    } catch (error) {
      return null;
    }
  },

  // ========== VENTAS PENDIENTES (OFFLINE) ==========
  /**
   * Agrega una venta pendiente de sincronización
   */
  addPendingSale: (sale) => {
    try {
      const pending = storageService.getPendingSales();
      const newPending = [...(pending || []), {
        ...sale,
        _pendingId: Date.now().toString(),
        _pendingTimestamp: Date.now(),
      }];
      localStorage.setItem(STORAGE_KEYS.PENDING_SALES, JSON.stringify(newPending));
      return true;
    } catch (error) {
      console.error('Error agregando venta pendiente:', error);
      return false;
    }
  },

  /**
   * Obtiene ventas pendientes de sincronización
   */
  getPendingSales: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_SALES);
      if (!stored) return [];
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error obteniendo ventas pendientes:', error);
      return [];
    }
  },

  /**
   * Elimina una venta pendiente después de sincronizarla
   */
  removePendingSale: (pendingId) => {
    try {
      const pending = storageService.getPendingSales();
      const filtered = pending.filter(s => s._pendingId !== pendingId);
      localStorage.setItem(STORAGE_KEYS.PENDING_SALES, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error eliminando venta pendiente:', error);
      return false;
    }
  },

  /**
   * Limpia todas las ventas pendientes
   */
  clearPendingSales: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_SALES);
      return true;
    } catch (error) {
      console.error('Error limpiando ventas pendientes:', error);
      return false;
    }
  },

  // ========== PRODUCTOS PENDIENTES (OFFLINE) ==========
  /**
   * Agrega un producto pendiente de sincronización
   */
  addPendingProduct: (product, action = 'create') => {
    try {
      const pending = storageService.getPendingProducts();
      const newPending = [...(pending || []), {
        ...product,
        _action: action, // 'create', 'update', 'delete'
        _pendingId: Date.now().toString(),
        _pendingTimestamp: Date.now(),
      }];
      localStorage.setItem(STORAGE_KEYS.PENDING_PRODUCTS, JSON.stringify(newPending));
      return true;
    } catch (error) {
      console.error('Error agregando producto pendiente:', error);
      return false;
    }
  },

  /**
   * Obtiene productos pendientes de sincronización
   */
  getPendingProducts: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PENDING_PRODUCTS);
      if (!stored) return [];
      
      return JSON.parse(stored);
    } catch (error) {
      console.error('Error obteniendo productos pendientes:', error);
      return [];
    }
  },

  /**
   * Elimina un producto pendiente después de sincronizarlo
   */
  removePendingProduct: (pendingId) => {
    try {
      const pending = storageService.getPendingProducts();
      const filtered = pending.filter(p => p._pendingId !== pendingId);
      localStorage.setItem(STORAGE_KEYS.PENDING_PRODUCTS, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error eliminando producto pendiente:', error);
      return false;
    }
  },

  /**
   * Limpia todos los productos pendientes
   */
  clearPendingProducts: () => {
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_PRODUCTS);
      return true;
    } catch (error) {
      console.error('Error limpiando productos pendientes:', error);
      return false;
    }
  },

  // ========== ÚLTIMA SINCRONIZACIÓN ==========
  /**
   * Guarda la fecha de última sincronización
   */
  saveLastSync: (timestamp = Date.now()) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp.toString());
      return true;
    } catch (error) {
      console.error('Error guardando última sincronización:', error);
      return false;
    }
  },

  /**
   * Obtiene la fecha de última sincronización
   */
  getLastSync: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return stored ? parseInt(stored, 10) : null;
    } catch (error) {
      return null;
    }
  },

  // ========== LIMPIEZA ==========
  /**
   * Limpia todo el cache excepto token y store
   */
  clearCache: () => {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      return true;
    } catch (error) {
      console.error('Error limpiando cache:', error);
      return false;
    }
  },

  /**
   * Obtiene información del uso de almacenamiento
   */
  getStorageInfo: () => {
    try {
      const info = {
        products: storageService.getProducts()?.length || 0,
        sales: storageService.getSales()?.length || 0,
        pendingSales: storageService.getPendingSales().length,
        pendingProducts: storageService.getPendingProducts().length,
        lastSync: storageService.getLastSync(),
        storageSize: 0,
      };

      // Calcular tamaño aproximado del almacenamiento
      let totalSize = 0;
      Object.values(STORAGE_KEYS).forEach(key => {
        const item = localStorage.getItem(key);
        if (item) {
          totalSize += item.length;
        }
      });
      info.storageSize = totalSize;

      return info;
    } catch (error) {
      console.error('Error obteniendo información de almacenamiento:', error);
      return null;
    }
  },
};

export default storageService;

