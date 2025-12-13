/**
 * Servicio para exportar datos
 * Permite exportar productos, ventas y toda la información en formato JSON o CSV
 */

import { productsAPI } from '../api/products';
import { salesAPI } from '../api/sales';
import { storageService } from './storageService';

export const exportService = {
  /**
   * Exporta todos los datos en formato JSON
   * @param {boolean} useCache - Si es true, usa datos del cache local, si es false, obtiene del servidor
   * @returns {Promise<{success: boolean, data: object, filename: string}>}
   */
  exportAllDataJSON: async (useCache = false) => {
    try {
      let products = [];
      let sales = [];

      if (useCache) {
        // Usar datos del cache local
        products = storageService.getProducts() || [];
        sales = storageService.getSales() || [];
      } else {
        // Obtener datos del servidor
        try {
          const productsResponse = await productsAPI.getAll();
          if (productsResponse.success) {
            products = productsResponse.data.products || [];
          }
        } catch (error) {
          console.error('Error obteniendo productos:', error);
          // Intentar usar cache como fallback
          products = storageService.getProducts() || [];
        }

        try {
          const salesResponse = await salesAPI.getAll();
          if (salesResponse.success) {
            sales = salesResponse.data.sales || [];
          }
        } catch (error) {
          console.error('Error obteniendo ventas:', error);
          // Intentar usar cache como fallback
          sales = storageService.getSales() || [];
        }
      }

      // Obtener información del almacén desde localStorage
      const store = JSON.parse(localStorage.getItem('store') || '{}');
      const storageInfo = storageService.getStorageInfo();

      const exportData = {
        exportDate: new Date().toISOString(),
        store: {
          storeName: store.storeName || 'N/A',
          ownerName: store.ownerName || 'N/A',
          email: store.email || 'N/A',
          phone: store.phone || 'N/A',
          address: store.address || 'N/A',
        },
        statistics: {
          totalProducts: products.length,
          totalSales: sales.length,
          pendingSales: storageInfo?.pendingSales || 0,
          pendingProducts: storageInfo?.pendingProducts || 0,
          lastSync: storageInfo?.lastSync ? new Date(storageInfo.lastSync).toISOString() : null,
        },
        products: products,
        sales: sales,
        pendingSales: storageService.getPendingSales(),
        pendingProducts: storageService.getPendingProducts(),
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `almacen_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return {
        success: true,
        data: exportData,
        filename: link.download,
      };
    } catch (error) {
      console.error('Error exportando datos:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  /**
   * Exporta productos en formato CSV
   * @param {boolean} useCache - Si es true, usa datos del cache local
   * @returns {Promise<{success: boolean, filename: string}>}
   */
  exportProductsCSV: async (useCache = false) => {
    try {
      let products = [];

      if (useCache) {
        products = storageService.getProducts() || [];
      } else {
        try {
          const response = await productsAPI.getAll();
          // El backend devuelve: { success: true, count: X, data: products[] }
          if (response.success && response.data) {
            if (Array.isArray(response.data)) {
              products = response.data;
            } else if (response.data.products && Array.isArray(response.data.products)) {
              products = response.data.products;
            } else {
              products = [];
            }
          } else {
            products = storageService.getProducts() || [];
          }
        } catch (error) {
          console.error('Error obteniendo productos del servidor:', error);
          products = storageService.getProducts() || [];
        }
      }

      if (products.length === 0) {
        return {
          success: false,
          message: 'No hay productos para exportar',
        };
      }

      // Crear encabezados CSV
      const headers = [
        'Código de Barras',
        'Nombre',
        'Precio',
        'Stock',
        'Stock Mínimo',
        'Categoría',
        'Fecha de Vencimiento',
        'Fecha de Creación',
      ];

      // Crear filas CSV
      const rows = products.map(product => [
        product.barcode || '',
        `"${(product.name || '').replace(/"/g, '""')}"`,
        product.price || 0,
        product.stock || 0,
        product.minStock || 0,
        product.category || '',
        product.expirationDate || '',
        product.createdAt ? new Date(product.createdAt).toLocaleDateString('es-ES') : '',
      ]);

      // Combinar encabezados y filas
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Descargar archivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `productos_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      try {
        link.click();
      } catch (error) {
        console.error('Error al hacer click en el link de descarga:', error);
        // Fallback: abrir en nueva ventana
        window.open(url, '_blank');
      }
      
      // Limpiar después de un delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      return {
        success: true,
        filename: link.download,
        count: products.length,
      };
    } catch (error) {
      console.error('Error exportando productos CSV:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  /**
   * Exporta ventas en formato CSV
   * @param {boolean} useCache - Si es true, usa datos del cache local
   * @returns {Promise<{success: boolean, filename: string}>}
   */
  exportSalesCSV: async (useCache = false) => {
    try {
      let sales = [];

      if (useCache) {
        sales = storageService.getSales() || [];
      } else {
        try {
          const response = await salesAPI.getAll();
          // El backend devuelve: { success: true, data: { sales: [], ... } } o { success: true, data: sales[] }
          if (response.success && response.data) {
            if (Array.isArray(response.data)) {
              sales = response.data;
            } else if (response.data.sales && Array.isArray(response.data.sales)) {
              sales = response.data.sales;
            } else {
              sales = [];
            }
          } else {
            sales = storageService.getSales() || [];
          }
        } catch (error) {
          console.error('Error obteniendo ventas del servidor:', error);
          sales = storageService.getSales() || [];
        }
      }

      if (sales.length === 0) {
        return {
          success: false,
          message: 'No hay ventas para exportar',
        };
      }

      // Crear encabezados CSV
      const headers = [
        'ID',
        'Fecha',
        'Total',
        'Método de Pago',
        'Productos',
        'Email Cliente',
      ];

      // Crear filas CSV
      const rows = sales.map(sale => {
        // Manejar tanto 'products' como 'items' para compatibilidad
        const saleProducts = sale.products || sale.items || [];
        const productsList = saleProducts.map(item => {
          const productName = item.name || item.product?.name || 'N/A';
          const quantity = item.quantity || 0;
          return `${productName} (x${quantity})`;
        }).join('; ') || 'N/A';

        return [
          sale._id || sale.id || sale.ticketNumber || '',
          sale.createdAt ? new Date(sale.createdAt).toLocaleString('es-ES') : '',
          sale.total || 0,
          sale.paymentMethod || '',
          `"${productsList.replace(/"/g, '""')}"`,
          sale.customerEmail || sale.customer?.email || '',
        ];
      });

      // Combinar encabezados y filas
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      // Descargar archivo
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ventas_${new Date().toISOString().split('T')[0]}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      try {
        link.click();
      } catch (error) {
        console.error('Error al hacer click en el link de descarga:', error);
        // Fallback: abrir en nueva ventana
        window.open(url, '_blank');
      }
      
      // Limpiar después de un delay
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      return {
        success: true,
        filename: link.download,
        count: sales.length,
      };
    } catch (error) {
      console.error('Error exportando ventas CSV:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  },

  /**
   * Exporta todos los datos en formato CSV (combinado)
   * @param {boolean} useCache - Si es true, usa datos del cache local
   * @returns {Promise<{success: boolean, filename: string}>}
   */
  exportAllDataCSV: async (useCache = false) => {
    try {
      // Exportar productos y ventas por separado con un delay entre descargas
      const productsResult = await exportService.exportProductsCSV(useCache);
      
      // Esperar antes de descargar el segundo archivo para evitar bloqueos del navegador
      // Algunos navegadores bloquean múltiples descargas simultáneas
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const salesResult = await exportService.exportSalesCSV(useCache);

      // Si ambos fueron exitosos, retornar éxito
      if (productsResult.success && salesResult.success) {
        return {
          success: true,
          products: productsResult,
          sales: salesResult,
          message: `Se exportaron ${productsResult.count || 0} productos y ${salesResult.count || 0} ventas`,
        };
      } else {
        // Si alguno falló, retornar información detallada
        return {
          success: false,
          products: productsResult,
          sales: salesResult,
          message: productsResult.success 
            ? `Productos exportados, pero hubo un error con ventas: ${salesResult.message || 'Error desconocido'}`
            : salesResult.success
            ? `Ventas exportadas, pero hubo un error con productos: ${productsResult.message || 'Error desconocido'}`
            : `Error exportando: ${productsResult.message || 'Error productos'} y ${salesResult.message || 'Error ventas'}`,
        };
      }
    } catch (error) {
      console.error('Error exportando todos los datos CSV:', error);
      return {
        success: false,
        message: error.message || 'Error al exportar datos CSV',
      };
    }
  },
};

export default exportService;

