import { useState } from 'react';
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
  Link
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
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';

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
    lowStock: true,
    newSales: true,
  });

  const [isOnline] = useState(true); // Simular estado online/offline

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

  const handleExportData = () => {
    toast({
      title: 'Exportando datos...',
      description: 'Se descargará un archivo con toda tu información',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });

    // Aquí iría la lógica para exportar datos
    // Por ahora solo mostramos el toast
  };

  const handleClearCache = () => {
    if (window.confirm('¿Deseas limpiar el caché local? Esto no borrará tus datos en el servidor.')) {
      localStorage.removeItem('cache');
      toast({
        title: 'Caché limpiado',
        description: 'Se ha limpiado el caché local',
        status: 'success',
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
    <Box minH="100vh" bg="gray.50" pb={20}>
      <Container maxW="container.xl" py={6}>
        <Heading size="lg" mb={6}>Configuración</Heading>

        <VStack spacing={6} align="stretch">
          {/* Información del Almacén */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4} mb={6}>
              <Avatar
                size="xl"
                name={store?.ownerName}
                bg="blue.500"
              />
              <VStack align="start" spacing={0}>
                <Heading size="md">{store?.storeName}</Heading>
                <Text color="gray.600">{store?.ownerName}</Text>
                <Badge colorScheme="green" mt={1}>Cuenta Activa</Badge>
              </VStack>
            </HStack>

            <Divider mb={6} />

            <Heading size="sm" mb={4}>Información del Almacén</Heading>

            <VStack spacing={4}>
              <FormControl>
                <FormLabel>
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
                />
              </FormControl>

              <FormControl>
                <FormLabel>
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
                />
              </FormControl>

              <FormControl>
                <FormLabel>
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
                  bg="gray.50"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  El email no se puede cambiar
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel>
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
                />
              </FormControl>

              <FormControl>
                <FormLabel>
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
                />
              </FormControl>
            </VStack>

            <Button
              mt={6}
              w="full"
              colorScheme="blue"
              size="lg"
              onClick={handleSaveProfile}
            >
              Guardar Cambios
            </Button>
          </Box>

          {/* Sincronización */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack justify="space-between" mb={4}>
              <HStack>
                <Icon as={MdSync} boxSize={6} color="blue.500" />
                <Heading size="sm">Sincronización</Heading>
              </HStack>
              {isOnline ? (
                <Badge colorScheme="green" fontSize="md" px={3} py={1}>
                  <HStack spacing={1}>
                    <Icon as={MdCheckCircle} />
                    <Text>Conectado</Text>
                  </HStack>
                </Badge>
              ) : (
                <Badge colorScheme="orange" fontSize="md" px={3} py={1}>
                  <HStack spacing={1}>
                    <Icon as={MdWarning} />
                    <Text>Offline</Text>
                  </HStack>
                </Badge>
              )}
            </HStack>

            <Text fontSize="sm" color="gray.600" mb={4}>
              {isOnline 
                ? 'Todos los datos están sincronizados con el servidor' 
                : 'Sin conexión. Los datos se sincronizarán cuando vuelva la conexión'}
            </Text>

            <Button
              w="full"
              leftIcon={<Icon as={MdSync} />}
              colorScheme="green"
              variant="outline"
              isDisabled={!isOnline}
            >
              Sincronizar Ahora
            </Button>
          </Box>

          {/* Notificaciones */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack mb={4}>
              <Icon as={MdNotifications} boxSize={6} color="blue.500" />
              <Heading size="sm">Notificaciones</Heading>
            </HStack>

            <VStack spacing={4}>
              <HStack justify="space-between" w="full" p={3} bg="gray.50" borderRadius="lg">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="semibold">Stock Bajo</Text>
                  <Text fontSize="sm" color="gray.600">
                    Recibir alertas cuando productos necesiten reposición
                  </Text>
                </VStack>
                <Switch
                  size="lg"
                  colorScheme="blue"
                  isChecked={notifications.lowStock}
                  onChange={(e) => setNotifications({...notifications, lowStock: e.target.checked})}
                />
              </HStack>

              <HStack justify="space-between" w="full" p={3} bg="gray.50" borderRadius="lg">
                <VStack align="start" spacing={0}>
                  <Text fontWeight="semibold">Nuevas Ventas</Text>
                  <Text fontSize="sm" color="gray.600">
                    Recibir confirmación por cada venta realizada
                  </Text>
                </VStack>
                <Switch
                  size="lg"
                  colorScheme="blue"
                  isChecked={notifications.newSales}
                  onChange={(e) => setNotifications({...notifications, newSales: e.target.checked})}
                />
              </HStack>
            </VStack>
          </Box>

          {/* Datos y Almacenamiento */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack mb={4}>
              <Icon as={MdDownload} boxSize={6} color="blue.500" />
              <Heading size="sm">Datos y Almacenamiento</Heading>
            </HStack>

            <VStack spacing={3}>
              <Button
                w="full"
                leftIcon={<Icon as={MdDownload} />}
                colorScheme="blue"
                variant="outline"
                size="lg"
                onClick={handleExportData}
              >
                Exportar Todos los Datos
              </Button>

              <Button
                w="full"
                leftIcon={<Icon as={MdCleaningServices} />}
                colorScheme="gray"
                variant="outline"
                size="lg"
                onClick={handleClearCache}
              >
                Limpiar Caché Local
              </Button>
            </VStack>

            <Alert status="info" mt={4} borderRadius="lg">
              <AlertIcon />
              <Box flex="1">
                <AlertTitle fontSize="sm">Modo Offline</AlertTitle>
                <AlertDescription fontSize="xs">
                  La aplicación guarda datos localmente para que puedas trabajar sin conexión
                </AlertDescription>
              </Box>
            </Alert>
          </Box>

          {/* Cerrar Sesión */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <Button
              w="full"
              leftIcon={<Icon as={MdLogout} />}
              colorScheme="red"
              size="lg"
              onClick={onOpen}
            >
              Cerrar Sesión
            </Button>
          </Box>

          {/* Información de la App */}
          <Box bg="gray.100" p={4} borderRadius="lg" textAlign="center">
            <Text fontSize="sm" color="gray.600" mb={1}>
              Sistema de Gestión de Almacén
            </Text>
            <Text fontSize="xs" color="gray.500">
              Versión 1.0.0 • Desarrollado por{" "}
              <Link
                href="https://ulisesros-desarrolloweb.vercel.app/"
                color="blue.500"
                isExternal
                fontWeight="medium"
              >
                Ulises Ros
              </Link>
            </Text>
          </Box>
        </VStack>
      </Container>

      {/* Modal de confirmación para cerrar sesión */}
      <Modal isOpen={isOpen} onClose={onClose} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cerrar Sesión</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Icon as={MdLogout} boxSize={16} color="red.500" />
              <Text textAlign="center">
                ¿Estás seguro que deseas cerrar sesión?
              </Text>
              <Alert status="warning" borderRadius="lg">
                <AlertIcon />
                <Text fontSize="sm">
                  Asegúrate de que todos los datos estén sincronizados antes de salir
                </Text>
              </Alert>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancelar
            </Button>
            <Button colorScheme="red" onClick={handleLogout}>
              Sí, Cerrar Sesión
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default Settings;