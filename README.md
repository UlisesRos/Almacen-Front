# 🏪 Almacen Manager - Frontend

Aplicación web moderna y responsive para gestión de almacén con funcionalidades offline, sincronización automática y exportación de datos.

## 📋 Descripción

Frontend desarrollado en React con Vite que proporciona una interfaz intuitiva y moderna para gestionar inventario, ventas, reportes y configuración de almacén. Incluye funcionalidades PWA (Progressive Web App) para uso offline.

## ✨ Características Principales

### 🎨 Interfaz de Usuario
- Diseño moderno y responsive con Chakra UI
- Tema oscuro optimizado
- Navegación intuitiva entre secciones
- Componentes reutilizables y modulares
- Animaciones suaves con Framer Motion

### 📦 Gestión de Productos
- Listado completo de productos con búsqueda y filtros
- Crear, editar y eliminar productos
- Control de stock en tiempo real
- Alertas visuales de stock bajo
- Alertas de productos por vencer
- Escaneo de códigos de barras (cámara y escáner físico)
- Importación masiva de productos
- Categorización de productos

### 💰 Sistema de Ventas
- Interfaz de punto de venta (POS) intuitiva
- Carrito de compras dinámico
- Búsqueda rápida de productos
- Escaneo de códigos de barras para agregar productos
- Múltiples métodos de pago
- Generación de comprobantes en PDF
- Envío de comprobantes por email
- Historial completo de ventas

### 📊 Reportes y Estadísticas
- Dashboard con métricas clave
- Gráficos de ventas (Recharts)
- Estadísticas por período
- Filtros avanzados por fecha y método de pago
- Exportación de reportes

### 🔄 Funcionalidades Offline
- **Modo Offline Completo**: La aplicación funciona sin conexión a internet
- **Sincronización Automática**: Sincroniza datos cuando vuelve la conexión
- **Almacenamiento Local**: Guarda datos en localStorage para acceso offline
- **Datos Pendientes**: Gestiona productos y ventas creados offline
- **Indicadores de Estado**: Muestra estado de conexión y sincronización

### 📤 Exportación de Datos
- Exportación en formato JSON (completo)
- Exportación en formato CSV (productos y ventas)
- Opción de exportar desde servidor o caché local
- Descarga de múltiples archivos

### 🔐 Autenticación
- Registro e inicio de sesión
- Autenticación con Google OAuth
- Protección de rutas
- Gestión de sesiones

### 📱 Progressive Web App (PWA)
- Instalable en dispositivos móviles
- Funciona como aplicación nativa
- Service Workers para funcionalidad offline
- Notificaciones push (futuro)

## 🛠️ Tecnologías

- **React 18** - Biblioteca de UI
- **Vite** - Build tool y dev server
- **Chakra UI** - Sistema de diseño
- **React Router** - Navegación
- **Axios** - Cliente HTTP
- **Framer Motion** - Animaciones
- **jsPDF** - Generación de PDFs
- **html2canvas** - Captura de pantalla
- **@zxing/library** - Escaneo de códigos QR/barras
- **html5-qrcode** - Escaneo con cámara
- **Recharts** - Gráficos y visualizaciones
- **Workbox** - Service Workers para PWA

## 📦 Instalación

### Prerrequisitos

- Node.js (v16 o superior)
- npm o yarn

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd almacen-app/frontend
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**

Crear un archivo `.env` en la raíz del proyecto:

```env
# URL del backend API
VITE_API_URL=http://localhost:5000/api

# Google OAuth (Opcional)
VITE_GOOGLE_CLIENT_ID=tu_google_client_id
```

4. **Iniciar servidor de desarrollo**
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

5. **Build para producción**
```bash
npm run build
```

Los archivos optimizados se generarán en la carpeta `dist/`

## 📁 Estructura del Proyecto

```
frontend/
├── public/
│   ├── manifest.json          # Configuración PWA
│   └── pwa-*.png              # Iconos PWA
├── src/
│   ├── api/
│   │   ├── auth.jsx           # API de autenticación
│   │   ├── axios.jsx          # Configuración Axios
│   │   ├── products.jsx       # API de productos
│   │   └── sales.jsx          # API de ventas
│   ├── components/
│   │   ├── BackButton.jsx     # Botón de retroceso
│   │   ├── BarcodeCameraScanner.jsx # Escáner de códigos
│   │   ├── ProtectedRoute.jsx # Ruta protegida
│   │   └── PWAInstallPrompt.jsx # Prompt de instalación PWA
│   ├── context/
│   │   └── AuthContext.jsx    # Context de autenticación
│   ├── hooks/
│   │   └── useBarcode.js      # Hook para escáner físico
│   ├── pages/
│   │   ├── Home.jsx           # Dashboard principal
│   │   ├── Products.jsx       # Gestión de productos
│   │   ├── Sale.jsx           # Punto de venta
│   │   ├── History.jsx        # Historial de ventas
│   │   ├── Reports.jsx        # Reportes y estadísticas
│   │   ├── Settings.jsx       # Configuración
│   │   ├── Login.jsx         # Inicio de sesión
│   │   └── Register.jsx      # Registro
│   ├── utils/
│   │   ├── storageService.js  # Servicio de almacenamiento local
│   │   ├── syncService.js     # Servicio de sincronización
│   │   ├── exportService.js   # Servicio de exportación
│   │   └── pdfGenerator.js   # Generador de PDFs
│   ├── App.jsx                # Componente principal
│   ├── main.jsx               # Punto de entrada
│   └── index.css              # Estilos globales
├── .env                       # Variables de entorno
├── vite.config.js             # Configuración Vite
├── package.json
└── README.md
```

## 🎯 Páginas Principales

### 🏠 Home (Dashboard)
- Resumen de ventas del día
- Productos con stock bajo
- Productos por vencer
- Accesos rápidos a funciones principales

### 📦 Products (Productos)
- Listado completo con búsqueda
- Filtros por categoría
- Crear/editar/eliminar productos
- Escaneo de códigos de barras
- Importación masiva

### 🛒 Sale (Ventas)
- Interfaz de punto de venta
- Búsqueda rápida de productos
- Carrito de compras
- Múltiples métodos de pago
- Generación de comprobantes

### 📜 History (Historial)
- Listado de todas las ventas
- Filtros por fecha y método de pago
- Detalles de cada venta
- Cancelación de ventas
- Envío de comprobantes

### 📊 Reports (Reportes)
- Gráficos de ventas
- Estadísticas por período
- Análisis de productos más vendidos
- Exportación de reportes

### ⚙️ Settings (Configuración)
- Perfil del almacén
- Sincronización de datos
- Exportación de datos
- Limpieza de caché
- Notificaciones

## 🔄 Funcionalidades Offline

### Almacenamiento Local
- Los datos se guardan automáticamente en `localStorage`
- Productos y ventas disponibles sin conexión
- Sincronización automática al volver la conexión

### Sincronización
- **Manual**: Botón "Sincronizar Ahora" en Settings
- **Automática**: Se sincroniza cuando detecta conexión
- **Datos Pendientes**: Gestiona productos y ventas creados offline

### Indicadores
- Badge de estado online/offline
- Contador de datos pendientes
- Última sincronización
- Notificaciones de sincronización

## 📤 Exportación de Datos

### Formatos Disponibles
- **JSON**: Exporta todos los datos (productos, ventas, estadísticas)
- **CSV**: Exporta productos y ventas en formato tabular

### Opciones
- Exportar desde servidor (datos actualizados)
- Exportar desde caché local (datos offline)

## 🔐 Autenticación

- Registro de nuevos almacenes
- Inicio de sesión con email/password
- Autenticación con Google OAuth
- Protección de rutas privadas
- Gestión de tokens JWT

## 📱 PWA (Progressive Web App)

### Características
- Instalable en dispositivos móviles
- Funciona offline con Service Workers
- Iconos y splash screens personalizados
- Manifest configurado

### Instalación
1. Abre la aplicación en un navegador móvil
2. Aparecerá un prompt para instalar
3. O usa el menú del navegador: "Agregar a pantalla de inicio"

## 🚀 Scripts Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview
```

## 🎨 Personalización

### Tema
El tema se puede personalizar en `src/App.jsx` modificando la configuración de Chakra UI.

### Colores
Los colores principales están definidos en el tema de Chakra UI (negro y morado).

## 🧪 Testing

Para ejecutar tests (cuando estén implementados):
```bash
npm test
```

## 📄 Licencia

ISC

## 👨‍💻 Autor

Desarrollado por [Ulises Ros](https://ulisesros-desarrolloweb.vercel.app/)

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📞 Soporte

Para soporte, envía un email o abre un issue en el repositorio.
