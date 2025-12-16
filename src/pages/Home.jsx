import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Button,
  VStack,
  HStack,
  Badge,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Icon,
  Link
} from '@chakra-ui/react';
import {
  MdShoppingCart,
  MdInventory,
  MdTrendingUp,
  MdCamera,
  MdWarning,
  MdAttachMoney,
  MdSettings,
  MdError,
  MdCheckBox
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { productsAPI } from '../api/products';
import { salesAPI } from '../api/sales';
import { storageService } from '../utils/storageService';
import { syncService } from '../utils/syncService';

const Home = () => {
  const { store } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    lowStockCount: 0,
    todaySales: 0,
    todayRevenue: 0,
    todayProductsSold: 0,
  });
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [nearExpirationProducts, setNearExpirationProducts] = useState([]);
  const [expiredProducts, setExpiredProducts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      const isOnline = syncService.isOnline();
      let products = [];
      let todaySales = [];

      // Intentar cargar desde caché primero para mostrar algo rápido
      const cachedProducts = storageService.getProducts();
      const cachedSales = storageService.getSales();

      if (cachedProducts && cachedProducts.length > 0) {
        products = cachedProducts;
        // Calcular estadísticas básicas desde caché
        const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
        const lowStock = products.filter(p => p.isLowStock);
        const nearExpiration = products.filter(p => p.isNearExpiration);
        const expired = products.filter(p => p.isExpired);

        setStats({
          totalProducts: products.length,
          totalStock,
          lowStockCount: lowStock.length,
          todaySales: 0, // Se actualizará cuando lleguen las ventas
          todayRevenue: 0,
          todayProductsSold: 0,
        });

        setLowStockProducts(lowStock.slice(0, 5));
        setNearExpirationProducts(nearExpiration.slice(0, 5));
        setExpiredProducts(expired.slice(0, 5));
        setLoading(false); // Mostrar contenido mientras se cargan los datos del servidor
      }

      // Cargar datos del servidor en paralelo
      if (isOnline) {
        try {
          // Hacer todas las peticiones en paralelo para mayor velocidad
          const [
            productsResponse,
            lowStockResponse,
            nearExpirationResponse,
            expiredResponse,
            todaySalesResponse
          ] = await Promise.all([
            productsAPI.getAll(),
            productsAPI.getLowStock(),
            productsAPI.getNearExpiration(),
            productsAPI.getExpired(),
            salesAPI.getToday()
          ]);

          products = productsResponse.data || [];
          const lowStock = lowStockResponse.data || [];
          const nearExpiration = nearExpirationResponse.data || [];
          const expired = expiredResponse.data || [];
          todaySales = todaySalesResponse.data || [];

          // Guardar en caché
          storageService.saveProducts(products);
          if (todaySales.length > 0) {
            storageService.saveSales(todaySales);
          }

          // Calcular estadísticas
          const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
          const todayProductsSold = todaySales.reduce((sum, sale) => 
            sum + (sale.products?.reduce((pSum, p) => pSum + (p.quantity || 0), 0) || 0), 0
          );

          setStats({
            totalProducts: products.length,
            totalStock,
            lowStockCount: lowStock.length,
            todaySales: todaySales.length,
            todayRevenue: todaySalesResponse.totalMonto || 0,
            todayProductsSold,
          });

          setLowStockProducts(lowStock.slice(0, 5));
          setNearExpirationProducts(nearExpiration.slice(0, 5));
          setExpiredProducts(expired.slice(0, 5));
          setRecentSales(todaySales.slice(0, 3));
        } catch (error) {
          console.error('Error al cargar datos del servidor:', error);
          // Si falla, usar datos del caché si están disponibles
          if (!cachedProducts || cachedProducts.length === 0) {
            toast({
              title: 'Error',
              description: 'No se pudieron cargar los datos. Usando caché local.',
              status: 'warning',
              duration: 3000,
              isClosable: true,
            });
          }
        }
      } else {
        // Modo offline - usar datos del caché
        if (cachedSales && cachedSales.length > 0) {
          // Filtrar ventas de hoy desde caché
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const todaySalesFromCache = cachedSales.filter(sale => {
            const saleDate = new Date(sale.createdAt);
            saleDate.setHours(0, 0, 0, 0);
            return saleDate.getTime() === today.getTime();
          });

          const todayProductsSold = todaySalesFromCache.reduce((sum, sale) => 
            sum + (sale.products?.reduce((pSum, p) => pSum + (p.quantity || 0), 0) || 0), 0
          );

          const todayRevenue = todaySalesFromCache.reduce((sum, sale) => sum + (sale.total || 0), 0);

          setStats(prev => ({
            ...prev,
            todaySales: todaySalesFromCache.length,
            todayRevenue,
            todayProductsSold,
          }));

          setRecentSales(todaySalesFromCache.slice(0, 3));
        }
      }

    } catch (error) {
      console.error('Error al cargar dashboard:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar la información del dashboard',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="black" bgGradient="linear(to-b, black, purple.900)">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="white">Cargando dashboard...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="black" bgGradient="linear(to-b, black, purple.900)" pb={20}>
      {/* Header */}
      <Box bg="gray.800" borderBottom="1px" borderColor="gray.700" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <Flex
            justify='space-between'
            flexWrap='wrap'
            >
            <Flex
              direction='column'
              >
              <Heading size="lg" mb={1} color="white">
                {store?.storeName} 
              </Heading>
              <Text color="gray.400" fontSize="sm">Propietario: {store?.ownerName}</Text>
            </Flex>
            <Button
              onClick={() => navigate('/settings')}
              bgGradient="linear(to-r, purple.500, purple.600)"
              color="white"
              size="lg"
              _hover={{
                bgGradient: 'linear(to-r, purple.600, purple.700)',
              }}
              >
                <Icon as={MdSettings} />
            </Button>
            
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl">
        {/* Estadísticas principales */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
          {/* Total Productos */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700" onClick={() => navigate('/products')} cursor='pointer' _hover={{ borderColor: 'purple.500' }}>
            <HStack spacing={4}>
              <Box bg="purple.600" p={3} borderRadius="lg" >
                <Icon as={MdInventory} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Productos</StatLabel>
                <StatNumber fontSize="3xl" color="white">{stats.totalProducts}</StatNumber>
                <StatHelpText color="gray.500">Stock total: {stats.totalStock}</StatHelpText>
              </Stat>
            </HStack>
          </Box>

          {/* Ventas de Hoy */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700" onClick={() => navigate('/history')} cursor='pointer' _hover={{ borderColor: 'purple.500' }}>
            <HStack spacing={4}>
              <Box bg="green.600" p={3} borderRadius="lg">
                <Icon as={MdShoppingCart} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Ventas Hoy</StatLabel>
                <StatNumber fontSize="3xl" color="white">{stats.todaySales}</StatNumber>
                <StatHelpText color="gray.500">{stats.todayProductsSold} productos</StatHelpText>
              </Stat>
            </HStack>
          </Box>

          {/* Ingresos de Hoy */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4}>
              <Box bg="purple.600" p={3} borderRadius="lg">
                <Icon as={MdAttachMoney} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Ingresos Hoy</StatLabel>
                <StatNumber fontSize="3xl" color="white">${stats.todayRevenue}</StatNumber>
                <StatHelpText color="gray.500">
                  {stats.todaySales > 0 
                    ? `Promedio: $${Math.round(stats.todayRevenue / stats.todaySales)}`
                    : 'Sin ventas aún'
                  }
                </StatHelpText>
              </Stat>
            </HStack>
          </Box>
        </SimpleGrid>

        {/* Alerta de Stock Bajo */}
        {stats.lowStockCount > 0 && (
          <Alert
            status="warning"
            variant="left-accent"
            borderRadius="xl"
            mb={6}
            bg="gray.800"
            borderColor="orange.500"
          >
            <Flex direction={['column', 'row']} justifyContent='space-between' alignItems='center' w='100%'>
              <AlertIcon as={MdWarning} mb='10px' color="orange.400"/>
              <Flex direction="column" mr={4} alignItems='center'>
                <AlertTitle color="white">Atención: Stock Bajo</AlertTitle>
                <AlertDescription color="gray.400">
                  {stats.lowStockCount} producto{stats.lowStockCount > 1 ? 's necesitan' : ' necesita'} reposición urgente
                </AlertDescription>
              </Flex>
              <Button
                mt={['15px', '0']}
                size="sm"
                bg="orange.500"
                color="white"
                _hover={{ bg: 'orange.600' }}
                onClick={() => navigate('/products')}
              >
                Ver Productos
              </Button>
            </Flex>
          </Alert>
        )}

         {/* Alerta de Productos Vencidos */}
        {expiredProducts.length > 0 && (
          <Alert status="error" variant="left-accent" borderRadius="xl" mb={4} bg="gray.800" borderColor="red.500">
            <Flex direction='column' justify='center' align='center' width='100%'>
              <AlertIcon as={MdError} mb='10px' color="red.400" />
              <AlertTitle color="white">¡Atención! Productos Vencidos</AlertTitle>
              <AlertDescription mb='10px' color="gray.400">
                {expiredProducts.length} producto{expiredProducts.length > 1 ? 's han' : ' ha'} vencido
              </AlertDescription>
              <VStack alignSelf="start" mt={3} spacing={2} w='full'>
                {expiredProducts.map(p => (
                  <Box key={p._id} w="full" bg="gray.700" px={3} py={2} borderRadius="lg">
                    <HStack justify="space-between">
                      <HStack>
                        <Text fontSize="lg">{p.image}</Text>
                        <Text fontSize="sm" fontWeight="medium" color="white">{p.name}</Text>
                      </HStack>
                      <Badge bg="red.500" color="white" fontSize="xs" borderRadius='md'>
                        Vencido hace {Math.abs(p.daysUntilExpiration)} días
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
              <Button size="sm" bg="red.500" color="white" _hover={{ bg: 'red.600' }} onClick={() => navigate('/products')} mt={3}>
                Ver Productos
              </Button>
            </Flex>
          </Alert>
        )}

        {/* Alerta de Productos Próximos a Vencer */}
        {nearExpirationProducts.length > 0 && (
          <Alert status="warning" variant="left-accent" borderRadius="xl" mb={4} bg="gray.800" borderColor="yellow.500">
            <Flex direction='column' justify='center' align='center' width='100%'>
              <AlertIcon as={MdWarning} mb='10px' color="yellow.400"/>
              <AlertTitle color="white">Productos Próximos a Vencer</AlertTitle>
              <AlertDescription mb='10px' color="gray.400">
                {nearExpirationProducts.length} producto{nearExpirationProducts.length > 1 ? 's vencen' : ' vence'} en los próximos 20 días
              </AlertDescription>
              <VStack alignSelf="start" mt={3} spacing={2} w='full'>
                {nearExpirationProducts.map(p => (
                  <Box key={p._id} w="full" bg="gray.700" px={3} py={2} borderRadius="lg">
                    <HStack justify="space-between">
                      <HStack>
                        <Text fontSize="lg">{p.image}</Text>
                        <Text fontSize="sm" fontWeight="medium" color="white">{p.name}</Text>
                      </HStack>
                      <Badge bg="yellow.500" color="white" fontSize="xs">
                        {p.daysUntilExpiration} día{p.daysUntilExpiration !== 1 ? 's' : ''}
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            <Button size="sm" bg="yellow.500" color="white" _hover={{ bg: 'yellow.600' }} onClick={() => navigate('/products')} mt={3}>
              Ver Productos
            </Button>
            </Flex>
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Acciones Rápidas */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <Heading size="md" mb={4} color="white">Acciones Rápidas</Heading>
            <VStack spacing={3}>
              <Button
                w="full"
                size="lg"
                leftIcon={<Icon as={MdShoppingCart} />}
                bg="green.500"
                color="white"
                _hover={{ bg: 'green.600' }}
                onClick={() => navigate('/sale')}
              >
                Nueva Venta
              </Button>
              <Button
                w="full"
                size="lg"
                leftIcon={<Icon as={MdInventory} />}
                variant="outline"
                borderColor="gray.600"
                color="white"
                _hover={{ bg: 'gray.700', borderColor: 'purple.500' }}
                onClick={() => navigate('/products')}
              >
                Ver Productos
              </Button>
              <Button
                w="full"
                size="lg"
                leftIcon={<Icon as={MdCheckBox} />}
                bg="blue.500"
                color="white"
                _hover={{ bg: 'blue.600' }}
                onClick={() => navigate('/reports')}
              >
                Ver Reportes
              </Button>
            </VStack>
          </Box>

          {/* Productos con Stock Bajo */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack justify="space-between" mb={4}>
              <Heading size="md" color="white">Stock Bajo</Heading>
              {lowStockProducts.length > 0 && (
                <Badge bg="orange.500" color="white" fontSize="sm" px={2} py={1} borderRadius='md'>
                  {stats.lowStockCount}
                </Badge>
              )}
            </HStack>

            {lowStockProducts.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.400">✅ Todo el stock está bien</Text>
              </Box>
            ) : (
              <VStack spacing={3} align="stretch">
                {lowStockProducts.map(product => (
                  <Box
                    key={product._id}
                    p={3}
                    bg="gray.700"
                    borderRadius="lg"
                    border="1px"
                    borderColor="orange.500"
                  >
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="semibold" fontSize="sm" color="white">
                          {product.name}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          {product.category}
                        </Text>
                      </VStack>
                      <Badge bg="orange.500" color="white" fontSize="sm" borderRadius='md'>
                        {product.stock} un.
                      </Badge>
                    </HStack>
                  </Box>
                ))}
                {stats.lowStockCount > 5 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    color="orange.400"
                    _hover={{ bg: 'gray.700', color: 'orange.300' }}
                    onClick={() => navigate('/products')}
                  >
                    Ver todos ({stats.lowStockCount})
                  </Button>
                )}
              </VStack>
            )}
          </Box>
        </SimpleGrid>

        {/* Últimas Ventas */}
        {recentSales.length > 0 && (
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700" mt={6}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md" color="white">Últimas Ventas</Heading>
              <Button
                size="sm"
                variant="ghost"
                color="purple.400"
                _hover={{ bg: 'gray.700', color: 'purple.300' }}
                onClick={() => navigate('/history')}
              >
                Ver todas
              </Button>
            </HStack>

            <VStack spacing={3} align="stretch">
              {recentSales.map(sale => (
                <Box
                  key={sale._id}
                  p={4}
                  bg="gray.700"
                  borderRadius="lg"
                  _hover={{ bg: 'gray.600' }}
                  cursor="pointer"
                  onClick={() => navigate('/history')}
                >
                  <HStack justify="space-between" mb={2}>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold" color="white">
                        Venta #{sale.ticketNumber}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {new Date(sale.createdAt).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </VStack>
                    <Text fontSize="xl" fontWeight="bold" color="green.400">
                      ${sale.total}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.400">
                    {sale.products.length} producto{sale.products.length > 1 ? 's' : ''}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Información de la App */}
          <Box bg="gray.800" p={4} borderRadius="lg" textAlign="center" mt={10} border="1px" borderColor="gray.700">
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
      </Container>
    </Box>
  );
};

export default Home;