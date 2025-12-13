/**
 * Servicio de sincronización de datos
 * Sincroniza productos y ventas con el servidor
 * Maneja sincronización de datos pendientes cuando se está offline
 */

import { productsAPI } from '../api/products';
import { salesAPI } from '../api/sales';
import { storageService } from './storageService';

export const syncService = {
  /**
   * Verifica si hay conexión a internet
   */
  isOnline: () => {
    return navigator.onLine;
  },

  /**
   * Sincroniza todos los datos con el servidor
   * @returns {Promise<{success: boolean, data: object, errors: array}>}
   */
  syncAll: async () => {
    if (!syncService.isOnline()) {
      return {
        success: false,
        message: 'Sin conexión a internet',
        errors: [],
      };
    }

    const results = {
      success: true,
      data: {
        products: null,
        sales: null,
        pendingSales: 0,
        pendingProducts: 0,
      },
      errors: [],
    };

    try {
      // 1. Sincronizar productos pendientes primero
      const pendingProductsResult = await syncService.syncPendingProducts();
      results.data.pendingProducts = pendingProductsResult.synced || 0;
      if (pendingProductsResult.errors?.length > 0) {
        results.errors.push(...pendingProductsResult.errors);
      }

      // 2. Sincronizar ventas pendientes
      const pendingSalesResult = await syncService.syncPendingSales();
      results.data.pendingSales = pendingSalesResult.synced || 0;
      if (pendingSalesResult.errors?.length > 0) {
        results.errors.push(...pendingSalesResult.errors);
      }

      // 3. Obtener productos actualizados del servidor
      try {
        const productsResponse = await productsAPI.getAll();
        if (productsResponse.success) {
          storageService.saveProducts(productsResponse.data.products || []);
          results.data.products = productsResponse.data.products?.length || 0;
        }
      } catch (error) {
        results.errors.push({
          type: 'products',
          message: 'Error obteniendo productos del servidor',
          error: error.message,
        });
        results.success = false;
      }

      // 4. Obtener ventas actualizadas del servidor
      try {
        const salesResponse = await salesAPI.getAll();
        if (salesResponse.success) {
          storageService.saveSales(salesResponse.data.sales || []);
          results.data.sales = salesResponse.data.sales?.length || 0;
        }
      } catch (error) {
        results.errors.push({
          type: 'sales',
          message: 'Error obteniendo ventas del servidor',
          error: error.message,
        });
        results.success = false;
      }

      // 5. Guardar timestamp de última sincronización
      if (results.success) {
        storageService.saveLastSync();
      }

      return results;
    } catch (error) {
      return {
        success: false,
        message: 'Error durante la sincronización',
        errors: [{ type: 'general', message: error.message }],
        data: results.data,
      };
    }
  },

  /**
   * Sincroniza productos pendientes con el servidor
   * @returns {Promise<{synced: number, errors: array}>}
   */
  syncPendingProducts: async () => {
    const pendingProducts = storageService.getPendingProducts();
    if (pendingProducts.length === 0) {
      return { synced: 0, errors: [] };
    }

    const errors = [];
    let synced = 0;

    for (const product of pendingProducts) {
      try {
        const { _action, _pendingId, _pendingTimestamp, ...productData } = product;

        switch (_action) {
          case 'create':
            await productsAPI.create(productData);
            break;
          case 'update':
            if (productData._id || productData.id) {
              await productsAPI.update(productData._id || productData.id, productData);
            }
            break;
          case 'delete':
            if (productData._id || productData.id) {
              await productsAPI.delete(productData._id || productData.id);
            }
            break;
          default:
            continue;
        }

        storageService.removePendingProduct(_pendingId);
        synced++;
      } catch (error) {
        errors.push({
          pendingId: product._pendingId,
          action: product._action,
          message: error.response?.data?.message || error.message,
        });
      }
    }

    return { synced, errors };
  },

  /**
   * Sincroniza ventas pendientes con el servidor
   * @returns {Promise<{synced: number, errors: array}>}
   */
  syncPendingSales: async () => {
    const pendingSales = storageService.getPendingSales();
    if (pendingSales.length === 0) {
      return { synced: 0, errors: [] };
    }

    const errors = [];
    let synced = 0;

    for (const sale of pendingSales) {
      try {
        const { _pendingId, _pendingTimestamp, ...saleData } = sale;
        await salesAPI.create(saleData);
        storageService.removePendingSale(_pendingId);
        synced++;
      } catch (error) {
        errors.push({
          pendingId: sale._pendingId,
          message: error.response?.data?.message || error.message,
        });
      }
    }

    return { synced, errors };
  },

  /**
   * Sincroniza solo productos
   * @returns {Promise<{success: boolean, count: number}>}
   */
  syncProducts: async () => {
    if (!syncService.isOnline()) {
      return {
        success: false,
        message: 'Sin conexión a internet',
        count: 0,
      };
    }

    try {
      // Sincronizar productos pendientes primero
      await syncService.syncPendingProducts();

      // Obtener productos actualizados
      const response = await productsAPI.getAll();
      if (response.success) {
        storageService.saveProducts(response.data.products || []);
        storageService.saveLastSync();
        return {
          success: true,
          count: response.data.products?.length || 0,
        };
      }

      return {
        success: false,
        message: 'Error obteniendo productos',
        count: 0,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        count: 0,
      };
    }
  },

  /**
   * Sincroniza solo ventas
   * @returns {Promise<{success: boolean, count: number}>}
   */
  syncSales: async () => {
    if (!syncService.isOnline()) {
      return {
        success: false,
        message: 'Sin conexión a internet',
        count: 0,
      };
    }

    try {
      // Sincronizar ventas pendientes primero
      await syncService.syncPendingSales();

      // Obtener ventas actualizadas
      const response = await salesAPI.getAll();
      if (response.success) {
        storageService.saveSales(response.data.sales || []);
        storageService.saveLastSync();
        return {
          success: true,
          count: response.data.sales?.length || 0,
        };
      }

      return {
        success: false,
        message: 'Error obteniendo ventas',
        count: 0,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        count: 0,
      };
    }
  },

  /**
   * Obtiene el estado de sincronización
   * @returns {object}
   */
  getSyncStatus: () => {
    const lastSync = storageService.getLastSync();
    const pendingSales = storageService.getPendingSales();
    const pendingProducts = storageService.getPendingProducts();
    const isOnline = syncService.isOnline();

    return {
      isOnline,
      lastSync,
      lastSyncFormatted: lastSync ? new Date(lastSync).toLocaleString('es-ES') : 'Nunca',
      pendingSales: pendingSales.length,
      pendingProducts: pendingProducts.length,
      hasPendingData: pendingSales.length > 0 || pendingProducts.length > 0,
    };
  },
};

export default syncService;

