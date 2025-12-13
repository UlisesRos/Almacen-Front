import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  useToast,
  Divider,
  Switch,
  Icon,
  Badge,
  Avatar,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Link,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from '@chakra-ui/react';
import {
  MdStore,
  MdPerson,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdLogout,
  MdDownload,
  MdCleaningServices,
  MdNotifications,
  MdSync,
  MdCheckCircle,
  MdWarning,
  MdArrowDropDown,
  MdStorage,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import { syncService } from '../utils/syncService';
import { storageService } from '../utils/storageService';
import { exportService } from '../utils/exportService';

const Settings = () => {
  const { store, logout, updateStore } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const [formData, setFormData] = useState({
    storeName: store?.storeName || '',
    ownerName: store?.ownerName || '',
    email: store?.email || '',
    phone: store?.phone || '',
    address: store?.address || '',
  });

  const [notifications, setNotifications] = useState({
    lowStock: store?.settings?.notifications?.lowStock ?? true,
    newSales: store?.settings?.notifications?.newSales ?? true,
  });
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  // Cargar notificaciones desde el store solo al montar el componente
  useEffect(() => {
    if (store?.settings?.notifications) {
      const storeNotifications = {
        lowStock: store.settings.notifications.lowStock ?? true,
        newSales: store.settings.notifications.newSales ?? true,
      };
      // Solo actualizar si son diferentes para evitar loops
      if (storeNotifications.lowStock !== notifications.lowStock || 
          storeNotifications.newSales !== notifications.newSales) {
        setNotifications(storeNotifications);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo al montar

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const [isExporting, setIsExporting] = useState(false);
  const { isOpen: isExportModalOpen, onOpen: onExportModalOpen, onClose: onExportModalClose } = useDisclosure();
  const { isOpen: isClearCacheModalOpen, onOpen: onClearCacheModalOpen, onClose: onClearCacheModalClose } = useDisclosure();

  // Actualizar estado online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Actualizar estado de sincronización periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSaveProfile = async () => {
    try {
      const response = await authAPI.updateProfile({
        storeName: formData.storeName,
        ownerName: formData.ownerName,
        phone: formData.phone,
        address: formData.address,
        settings: {
          notifications: {
            lowStock: notifications.lowStock,
            newSales: notifications.newSales,
          }
        }
      });

      if (response.success) {
        // Actualizar el store en el Context
        updateStore(response.data.store);

        toast({
          title: 'Perfil actualizado',
          description: 'Los cambios se guardaron exitosamente',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Error al guardar perfil:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudieron guardar los cambios',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSaveNotifications = async () => {
    try {
      setIsSavingNotifications(true);
      
      const response = await authAPI.updateProfile({
        settings: {
          notifications: {
            lowStock: notifications.lowStock,
            newSales: notifications.newSales,
          }
        }
      });

      if (response.success) {
        // Actualizar el store en el Context con los datos actualizados
        updateStore(response.data.store);
        
        // Pequeño delay para asegurar que el estado se actualice
        setTimeout(() => {
          setIsSavingNotifications(false);
        }, 100);

        toast({
          title: 'Notificaciones guardadas',
          description: 'Las preferencias de notificaciones se actualizaron correctamente',
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
      } else {
        setIsSavingNotifications(false);
      }
    } catch (error) {
      console.error('Error al guardar notificaciones:', error);
      setIsSavingNotifications(false);
      
      // Revertir el cambio si falla
      if (store?.settings?.notifications) {
        setNotifications({
          lowStock: store.settings.notifications.lowStock ?? true,
          newSales: store.settings.notifications.newSales ?? true,
        });
      }
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudieron guardar las notificaciones',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSyncNow = async () => {
    if (!isOnline) {
      toast({
        title: 'Sin conexión',
        description: 'No hay conexión a internet. Conecta a una red para sincronizar.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSyncing(true);
    const toastId = toast({
      title: 'Sincronizando...',
      description: 'Sincronizando datos con el servidor',
      status: 'info',
      duration: null,
      isClosable: false,
    });

    try {
      const result = await syncService.syncAll();

      if (result.success) {
        toast.close(toastId);
        toast({
          title: 'Sincronización completada',
          description: `Productos: ${result.data.products || 0}, Ventas: ${result.data.sales || 0}, Pendientes sincronizados: ${(result.data.pendingProducts || 0) + (result.data.pendingSales || 0)}`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setSyncStatus(syncService.getSyncStatus());
      } else {
        toast.close(toastId);
        toast({
          title: 'Error en sincronización',
          description: result.message || 'Algunos datos no se pudieron sincronizar',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast.close(toastId);
      toast({
        title: 'Error',
        description: error.message || 'Error al sincronizar datos',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportData = async (format = 'json', useCache = false) => {
    setIsExporting(true);
    onExportModalClose();

    const toastId = toast({
      title: 'Exportando datos...',
      description: 'Preparando archivo de exportación',
      status: 'info',
      duration: null,
      isClosable: false,
    });

    try {
      let result;

      if (format === 'json') {
        result = await exportService.exportAllDataJSON(useCache);
      } else if (format === 'csv') {
        result = await exportService.exportAllDataCSV(useCache);
      }

      if (result.success) {
        toast.close(toastId);
        const description = format === 'csv' 
          ? result.message || `Se descargaron 2 archivos CSV (productos y ventas)`
          : 'Archivo JSON descargado exitosamente';
        toast({
          title: 'Exportación completada',
          description: description,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
      } else {
        toast.close(toastId);
        const errorMessage = result.message || 'No se pudieron exportar los datos';
        toast({
          title: 'Error al exportar',
          description: errorMessage,
          status: 'error',
          duration: 7000,
          isClosable: true,
        });
        console.error('Error en exportación:', result);
      }
    } catch (error) {
      toast.close(toastId);
      toast({
        title: 'Error',
        description: error.message || 'Error al exportar datos',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearCache = () => {
    onClearCacheModalClose();
    
    try {
      const storageInfo = storageService.getStorageInfo();
      const cleared = storageService.clearCache();

      if (cleared) {
        toast({
          title: 'Caché limpiado',
          description: `Se eliminaron ${storageInfo?.products || 0} productos y ${storageInfo?.sales || 0} ventas del caché local. Los datos del servidor no se afectaron.`,
          status: 'success',
          duration: 5000,
          isClosable: true,
        });
        setSyncStatus(syncService.getSyncStatus());
      } else {
        toast({
          title: 'Error',
          description: 'No se pudo limpiar el caché',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Error al limpiar el caché',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleLogout = () => {
    onClose();
    logout();
    navigate('/login');
  };

  return (
    <Box minH="100vh" bg="black" bgGradient="linear(to-b, black, purple.900)" pb={20}>
      <Container maxW="container.xl" py={6}>
        <Heading size="lg" mb={6} color="white">Configuración</Heading>

        <VStack spacing={6} align="stretch">
          {/* Información del Almacén */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4} mb={6}>
              <Avatar
                size="xl"
                name={store?.ownerName}
                bg="purple.500"
              />
              <VStack align="start" spacing={0}>
                <Heading size="md" color="white">{store?.storeName}</Heading>
                <Text color="gray.400">{store?.ownerName}</Text>
                <Badge bg="green.500" color="white" mt={1}>Cuenta Activa</Badge>
              </VStack>
            </HStack>

            <Divider mb={6} borderColor="gray.600" />

            <Heading size="sm" mb={4} color="white">Información del Almacén</Heading>

            <VStack spacing={4}>
              <FormControl>
                <FormLabel color="white">
                  <HStack>
                    <Icon as={MdStore} />
                    <Text>Nombre del Almacén</Text>
                  </HStack>
                </FormLabel>
                <Input
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  size="lg"
                  bg="gray.700"
                  border="none"
                  color="white"
                  _placeholder={{ color: 'gray.400' }}
                  _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                  _hover={{ bg: 'gray.700' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="white">
                  <HStack>
                    <Icon as={MdPerson} />
                    <Text>Propietario</Text>
                  </HStack>
                </FormLabel>
                <Input
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleChange}
                  size="lg"
                  bg="gray.700"
                  border="none"
                  color="white"
                  _placeholder={{ color: 'gray.400' }}
                  _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                  _hover={{ bg: 'gray.700' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="white">
                  <HStack>
                    <Icon as={MdEmail} />
                    <Text>Email</Text>
                  </HStack>
                </FormLabel>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  size="lg"
                  isReadOnly
                  bg="gray.700"
                  border="none"
                  color="gray.400"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  El email no se puede cambiar
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="white">
                  <HStack>
                    <Icon as={MdPhone} />
                    <Text>Teléfono</Text>
                  </HStack>
                </FormLabel>
                <Input
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  size="lg"
                  bg="gray.700"
                  border="none"
                  color="white"
                  _placeholder={{ color: 'gray.400' }}
                  _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                  _hover={{ bg: 'gray.700' }}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="white">
                  <HStack>
                    <Icon as={MdLocationOn} />
                    <Text>Dirección</Text>
                  </HStack>
                </FormLabel>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  size="lg"
                  bg="gray.700"
                  border="none"
                  color="white"
                  _placeholder={{ color: 'gray.400' }}
                  _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                  _hover={{ bg: 'gray.700' }}
                />
              </FormControl>
            </VStack>

            <Button
              mt={6}
              w="full"
              bgGradient="linear(to-r, purple.500, purple.600)"
              color="white"
              size="lg"
              _hover={{
                bgGradient: 'linear(to-r, purple.600, purple.700)',
              }}
              onClick={handleSaveProfile}
            >
              Guardar Cambios
            </Button>
          </Box>

          {/* Sincronización */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack justify="space-between" mb={4}>
              <HStack>
                <Icon as={MdSync} boxSize={6} color="purple.400" />
                <Heading size="sm" color="white">Sincronización</Heading>
              </HStack>
              {isOnline ? (
                <Badge bg="green.500" color="white" fontSize="md" px={3} py={1}>
                  <HStack spacing={1}>
                    <Icon as={MdCheckCircle} />
                    <Text>Conectado</Text>
                  </HStack>
                </Badge>
              ) : (
                <Badge bg="orange.500" color="white" fontSize="md" px={3} py={1}>
                  <HStack spacing={1}>
                    <Icon as={MdWarning} />
                    <Text>Offline</Text>
                  </HStack>
                </Badge>
              )}
            </HStack>

            <VStack spacing={3} align="stretch" mb={4}>
              <Text fontSize="sm" color="gray.400">
                {isOnline 
                  ? syncStatus.hasPendingData
                    ? `Hay ${syncStatus.pendingProducts + syncStatus.pendingSales} elementos pendientes de sincronizar`
                    : 'Todos los datos están sincronizados con el servidor'
                  : 'Sin conexión. Los datos se sincronizarán cuando vuelva la conexión'}
              </Text>

              {syncStatus.lastSync && (
                <HStack spacing={2}>
                  <Text fontSize="xs" color="gray.500">
                    Última sincronización:
                  </Text>
                  <Text fontSize="xs" color="gray.400" fontWeight="semibold">
                    {syncStatus.lastSyncFormatted}
                  </Text>
                </HStack>
              )}

              {syncStatus.hasPendingData && (
                <Alert status="warning" borderRadius="lg" bg="gray.700" borderColor="orange.500">
                  <AlertIcon color="orange.400" />
                  <Box flex="1">
                    <AlertTitle fontSize="xs" color="white">
                      Datos pendientes
                    </AlertTitle>
                    <AlertDescription fontSize="xs" color="gray.300">
                      {syncStatus.pendingProducts > 0 && `${syncStatus.pendingProducts} productos pendientes`}
                      {syncStatus.pendingProducts > 0 && syncStatus.pendingSales > 0 && ', '}
                      {syncStatus.pendingSales > 0 && `${syncStatus.pendingSales} ventas pendientes`}
                    </AlertDescription>
                  </Box>
                </Alert>
              )}
            </VStack>

            <Button
              w="full"
              leftIcon={isSyncing ? <Spinner size="sm" /> : <Icon as={MdSync} />}
              bg="green.500"
              color="white"
              variant="outline"
              borderColor="green.500"
              _hover={{ bg: 'green.600' }}
              isDisabled={!isOnline || isSyncing}
              onClick={handleSyncNow}
            >
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}
            </Button>
          </Box>

          {/* Notificaciones */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack mb={4}>
              <Icon as={MdNotifications} boxSize={6} color="purple.400" />
              <Heading size="sm" color="white">Notificaciones</Heading>
            </HStack>

            <VStack spacing={4}>
              <HStack justify="space-between" w="full" p={3} bg="gray.700" borderRadius="lg">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="semibold" color="white">Stock Bajo</Text>
                  <Text fontSize="sm" color="gray.400">
                    Recibir alertas cuando productos necesiten reposición
                  </Text>
                </VStack>
                <Switch
                  size="lg"
                  colorScheme="purple"
                  isChecked={notifications.lowStock}
                  isDisabled={isSavingNotifications}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    const updatedNotifications = {...notifications, lowStock: newValue};
                    // Actualizar estado local primero para feedback inmediato
                    setNotifications(updatedNotifications);
                    // Guardar automáticamente cuando cambia
                    await handleSaveNotifications(updatedNotifications);
                  }}
                />
              </HStack>

              <HStack justify="space-between" w="full" p={3} bg="gray.700" borderRadius="lg">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="semibold" color="white">Nuevas Ventas</Text>
                  <Text fontSize="sm" color="gray.400">
                    Recibir confirmación por cada venta realizada
                  </Text>
                </VStack>
                <Switch
                  size="lg"
                  colorScheme="purple"
                  isChecked={notifications.newSales}
                  isDisabled={isSavingNotifications}
                  onChange={async (e) => {
                    const newValue = e.target.checked;
                    const updatedNotifications = {...notifications, newSales: newValue};
                    // Actualizar estado local primero para feedback inmediato
                    setNotifications(updatedNotifications);
                    // Guardar automáticamente cuando cambia
                    await handleSaveNotifications(updatedNotifications);
                  }}
                />
              </HStack>
            </VStack>
          </Box>

          {/* Datos y Almacenamiento */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack mb={4}>
              <Icon as={MdDownload} boxSize={6} color="purple.400" />
              <Heading size="sm" color="white">Datos y Almacenamiento</Heading>
            </HStack>

            <VStack spacing={3}>
              <Menu>
                <MenuButton
                  as={Button}
                  w="full"
                  leftIcon={isExporting ? <Spinner size="sm" /> : <Icon as={MdDownload} />}
                  rightIcon={<Icon as={MdArrowDropDown} />}
                  variant="outline"
                  borderColor="gray.600"
                  color="white"
                  _hover={{ bg: 'gray.700', borderColor: 'purple.500' }}
                  size="lg"
                  isDisabled={isExporting}
                >
                  {isExporting ? 'Exportando...' : 'Exportar Todos los Datos'}
                </MenuButton>
                <MenuList bg="gray.800" borderColor="gray.700">
                  <MenuItem
                    bg="gray.800"
                    color="white"
                    _hover={{ bg: 'gray.700' }}
                    onClick={() => handleExportData('json', false)}
                  >
                    Exportar como JSON (desde servidor)
                  </MenuItem>
                  <MenuItem
                    bg="gray.800"
                    color="white"
                    _hover={{ bg: 'gray.700' }}
                    onClick={() => handleExportData('json', true)}
                  >
                    Exportar como JSON (desde caché)
                  </MenuItem>
                  <MenuItem
                    bg="gray.800"
                    color="white"
                    _hover={{ bg: 'gray.700' }}
                    onClick={() => handleExportData('csv', false)}
                  >
                    Exportar como CSV (desde servidor)
                  </MenuItem>
                  <MenuItem
                    bg="gray.800"
                    color="white"
                    _hover={{ bg: 'gray.700' }}
                    onClick={() => handleExportData('csv', true)}
                  >
                    Exportar como CSV (desde caché)
                  </MenuItem>
                </MenuList>
              </Menu>

              <Button
                w="full"
                leftIcon={<Icon as={MdCleaningServices} />}
                variant="outline"
                borderColor="gray.600"
                color="white"
                _hover={{ bg: 'gray.700', borderColor: 'red.500' }}
                size="lg"
                onClick={onClearCacheModalOpen}
              >
                Limpiar Caché Local
              </Button>
            </VStack>

            {/* Información de almacenamiento */}
            {(() => {
              const storageInfo = storageService.getStorageInfo();
              if (storageInfo) {
                return (
                  <Box mt={4} p={3} bg="gray.700" borderRadius="lg">
                    <HStack mb={2}>
                      <Icon as={MdStorage} color="purple.400" />
                      <Text fontSize="sm" fontWeight="semibold" color="white">
                        Información de Almacenamiento
                      </Text>
                    </HStack>
                    <VStack align="start" spacing={1} fontSize="xs" color="gray.300">
                      <Text>Productos en caché: {storageInfo.products}</Text>
                      <Text>Ventas en caché: {storageInfo.sales}</Text>
                      <Text>Ventas pendientes: {storageInfo.pendingSales}</Text>
                      <Text>Productos pendientes: {storageInfo.pendingProducts}</Text>
                      <Text>Tamaño aproximado: {(storageInfo.storageSize / 1024).toFixed(2)} KB</Text>
                    </VStack>
                  </Box>
                );
              }
              return null;
            })()}

            <Alert status="info" mt={4} borderRadius="lg" bg="gray.700" borderColor="blue.500">
              <AlertIcon color="blue.400" />
              <Box flex="1">
                <AlertTitle fontSize="sm" color="white">Modo Offline</AlertTitle>
                <AlertDescription fontSize="xs" color="gray.300">
                  La aplicación guarda datos localmente para que puedas trabajar sin conexión
                </AlertDescription>
              </Box>
            </Alert>
          </Box>

          {/* Cerrar Sesión */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <Button
              w="full"
              leftIcon={<Icon as={MdLogout} />}
              bg="red.500"
              color="white"
              size="lg"
              _hover={{ bg: 'red.600' }}
              onClick={onOpen}
            >
              Cerrar Sesión
            </Button>
          </Box>

          {/* Información de la App */}
          <Box bg="gray.800" p={4} borderRadius="lg" textAlign="center" border="1px" borderColor="gray.700">
            <Text fontSize="sm" color="gray.400" mb={1}>
              Sistema de Gestión de Almacén
            </Text>
            <Text fontSize="xs" color="gray.500">
              Versión 1.0.0 • Desarrollado por{" "}
              <Link
                href="https://ulisesros-desarrolloweb.vercel.app/"
                color="purple.400"
                isExternal
                fontWeight="medium"
                _hover={{ textDecoration: 'underline' }}
              >
                Ulises Ros
              </Link>
            </Text>
          </Box>
        </VStack>
      </Container>

      {/* Modal de confirmación para cerrar sesión */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent w={['95%', '500px']} bg="gray.800" border="1px" borderColor="gray.700">
          <ModalHeader color="white">Cerrar Sesión</ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} />
          <ModalBody>
            <VStack spacing={4}>
              <Icon as={MdLogout} boxSize={16} color="red.400" />
              <Text textAlign="center" color="white">
                ¿Estás seguro que deseas cerrar sesión?
              </Text>
              {syncStatus.hasPendingData && (
                <Alert status="warning" borderRadius="lg" bg="gray.700" borderColor="orange.500">
                  <AlertIcon color="orange.400" />
                  <Text fontSize="sm" color="white">
                    Tienes datos pendientes de sincronizar. Se sincronizarán automáticamente cuando vuelvas a iniciar sesión.
                  </Text>
                </Alert>
              )}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} color="gray.400" _hover={{ bg: 'gray.700', color: 'white' }}>
              Cancelar
            </Button>
            <Button bg="red.500" color="white" _hover={{ bg: 'red.600' }} onClick={handleLogout}>
              Sí, Cerrar Sesión
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Modal de confirmación para limpiar caché */}
      <Modal isOpen={isClearCacheModalOpen} onClose={onClearCacheModalClose} isCentered>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent w={['95%', '500px']} bg="gray.800" border="1px" borderColor="gray.700">
          <ModalHeader color="white">Limpiar Caché Local</ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} />
          <ModalBody>
            <VStack spacing={4}>
              <Icon as={MdCleaningServices} boxSize={16} color="orange.400" />
              <Text textAlign="center" color="white">
                ¿Estás seguro que deseas limpiar el caché local?
              </Text>
              {(() => {
                const storageInfo = storageService.getStorageInfo();
                if (storageInfo) {
                  return (
                    <Alert status="info" borderRadius="lg" bg="gray.700" borderColor="blue.500">
                      <AlertIcon color="blue.400" />
                      <Box flex="1">
                        <AlertTitle fontSize="sm" color="white">Se eliminará:</AlertTitle>
                        <AlertDescription fontSize="xs" color="gray.300" mt={1}>
                          • {storageInfo.products} productos en caché<br />
                          • {storageInfo.sales} ventas en caché<br />
                          • {storageInfo.pendingSales} ventas pendientes<br />
                          • {storageInfo.pendingProducts} productos pendientes
                        </AlertDescription>
                      </Box>
                    </Alert>
                  );
                }
                return null;
              })()}
              <Alert status="warning" borderRadius="lg" bg="gray.700" borderColor="orange.500">
                <AlertIcon color="orange.400" />
                <Text fontSize="sm" color="white">
                  Los datos en el servidor NO se eliminarán. Solo se limpiará el caché local.
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClearCacheModalClose} color="gray.400" _hover={{ bg: 'gray.700', color: 'white' }}>
              Cancelar
            </Button>
            <Button bg="orange.500" color="white" _hover={{ bg: 'orange.600' }} onClick={handleClearCache}>
              Sí, Limpiar Caché
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Settings;