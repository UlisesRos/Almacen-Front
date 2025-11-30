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

      // Obtener productos
      const productsResponse = await productsAPI.getAll();
      const products = productsResponse.data;

      // Obtener productos con stock bajo
      const lowStockResponse = await productsAPI.getLowStock();
      const lowStock = lowStockResponse.data;

      // Obtener productos próximos a vencer
      const nearExpirationResponse = await productsAPI.getNearExpiration();
      const nearExpiration = nearExpirationResponse.data;

      // Obtener productos vencidos
      const expiredResponse = await productsAPI.getExpired();
      const expired = expiredResponse.data;

      // Obtener ventas de hoy
      const todaySalesResponse = await salesAPI.getToday();
      const todaySales = todaySalesResponse.data;

      // Calcular estadísticas
      const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
      const todayProductsSold = todaySales.reduce((sum, sale) => 
        sum + sale.products.reduce((pSum, p) => pSum + p.quantity, 0), 0
      );

      setStats({
        totalProducts: products.length,
        totalStock,
        lowStockCount: lowStock.length,
        todaySales: todaySales.length,
        todayRevenue: todaySalesResponse.totalMonto || 0,
        todayProductsSold,
      });

      setLowStockProducts(lowStock.slice(0, 5)); // Primeros 5
      setNearExpirationProducts(nearExpiration.slice(0, 5)); 
      setExpiredProducts(expired.slice(0, 5)); 
      setRecentSales(todaySales.slice(0, 3)); // Últimas 3

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
      <Flex minH="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Cargando dashboard...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" pb={20}>
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <Flex
            justify='space-between'
            flexWrap='wrap'
            >
            <Flex
              direction='column'
              >
              <Heading size="lg" mb={1}>
                Hola, {store?.ownerName?.split(' ')[0]} 👋
              </Heading>
              <Text color="gray.600" fontSize="sm">{store?.storeName}</Text>
            </Flex>
            <Button
              onClick={() => navigate('/settings')}
              colorScheme="purple"
              size="lg"
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
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100" onClick={() => navigate('/products')} cursor='pointer'>
            <HStack spacing={4}>
              <Box bg="blue.100" p={3} borderRadius="lg" >
                <Icon as={MdInventory} boxSize={8} color="blue.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Productos</StatLabel>
                <StatNumber fontSize="3xl">{stats.totalProducts}</StatNumber>
                <StatHelpText>Stock total: {stats.totalStock}</StatHelpText>
              </Stat>
            </HStack>
          </Box>

          {/* Ventas de Hoy */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100" onClick={() => navigate('/history')} cursor='pointer'>
            <HStack spacing={4}>
              <Box bg="green.100" p={3} borderRadius="lg">
                <Icon as={MdShoppingCart} boxSize={8} color="green.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Ventas Hoy</StatLabel>
                <StatNumber fontSize="3xl">{stats.todaySales}</StatNumber>
                <StatHelpText>{stats.todayProductsSold} productos</StatHelpText>
              </Stat>
            </HStack>
          </Box>

          {/* Ingresos de Hoy */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4}>
              <Box bg="purple.100" p={3} borderRadius="lg">
                <Icon as={MdAttachMoney} boxSize={8} color="purple.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Ingresos Hoy</StatLabel>
                <StatNumber fontSize="3xl">${stats.todayRevenue}</StatNumber>
                <StatHelpText>
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
            bg="orange.50"
            borderColor="orange.200"
          >
            <Flex direction={['column', 'row']} justifyContent='space-between' alignItems='center' w='100%'>
              <AlertIcon as={MdWarning} mb='10px'/>
              <Flex direction="column" mr={4} alignItems='center'>
                <AlertTitle>Atención: Stock Bajo</AlertTitle>
                <AlertDescription>
                  {stats.lowStockCount} producto{stats.lowStockCount > 1 ? 's necesitan' : ' necesita'} reposición urgente
                </AlertDescription>
              </Flex>
              <Button
                mt={['15px', '0']}
                size="sm"
                colorScheme="orange"
                onClick={() => navigate('/products')}
              >
                Ver Productos
              </Button>
            </Flex>
          </Alert>
        )}

         {/* Alerta de Productos Vencidos */}
        {expiredProducts.length > 0 && (
          <Alert status="error" variant="left-accent" borderRadius="xl" mb={4} bg="red.50" borderColor="red.200">
            <Flex direction='column' justify='center' align='center' width='100%'>
              <AlertIcon as={MdError} mb='10px' />
              <AlertTitle>¡Atención! Productos Vencidos</AlertTitle>
              <AlertDescription mb='10px'>
                {expiredProducts.length} producto{expiredProducts.length > 1 ? 's han' : ' ha'} vencido
              </AlertDescription>
              <VStack alignSelf="start" mt={3} spacing={2} w='full'>
                {expiredProducts.map(p => (
                  <Box key={p._id} w="full" bg="white" bg-opacity="60" px={3} py={2} borderRadius="lg">
                    <HStack justify="space-between">
                      <HStack>
                        <Text fontSize="lg">{p.image}</Text>
                        <Text fontSize="sm" fontWeight="medium">{p.name}</Text>
                      </HStack>
                      <Badge colorScheme="red" fontSize="xs" borderRadius='md'>
                        Vencido hace {Math.abs(p.daysUntilExpiration)} días
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
              <Button size="sm" colorScheme="red" onClick={() => navigate('/products')} mt={3}>
                Ver Productos
              </Button>
            </Flex>
          </Alert>
        )}

        {/* Alerta de Productos Próximos a Vencer */}
        {nearExpirationProducts.length > 0 && (
          <Alert status="warning" variant="left-accent" borderRadius="xl" mb={4} bg="yellow.50" borderColor="yellow.200">
            <Flex direction='column' justify='center' align='center' width='100%'>
              <AlertIcon as={MdWarning} mb='10px'/>
              <AlertTitle>Productos Próximos a Vencer</AlertTitle>
              <AlertDescription mb='10px'>
                {nearExpirationProducts.length} producto{nearExpirationProducts.length > 1 ? 's vencen' : ' vence'} en los próximos 20 días
              </AlertDescription>
              <VStack alignSelf="start" mt={3} spacing={2} w='full'>
                {nearExpirationProducts.map(p => (
                  <Box key={p._id} w="full" bg="white" bg-opacity="60" px={3} py={2} borderRadius="lg">
                    <HStack justify="space-between">
                      <HStack>
                        <Text fontSize="lg">{p.image}</Text>
                        <Text fontSize="sm" fontWeight="medium">{p.name}</Text>
                      </HStack>
                      <Badge colorScheme="yellow" fontSize="xs">
                        {p.daysUntilExpiration} día{p.daysUntilExpiration !== 1 ? 's' : ''}
                      </Badge>
                    </HStack>
                  </Box>
                ))}
              </VStack>
            <Button size="sm" colorScheme="yellow" onClick={() => navigate('/products')} mt={3}>
              Ver Productos
            </Button>
            </Flex>
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          {/* Acciones Rápidas */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <Heading size="md" mb={4}>Acciones Rápidas</Heading>
            <VStack spacing={3}>
              <Button
                w="full"
                size="lg"
                leftIcon={<Icon as={MdCamera} />}
                colorScheme="purple"
                onClick={() => navigate('/products')}
              >
                Escanear Producto
              </Button>
              <Button
                w="full"
                size="lg"
                leftIcon={<Icon as={MdShoppingCart} />}
                colorScheme="green"
                onClick={() => navigate('/sale')}
              >
                Nueva Venta
              </Button>
              <Button
                w="full"
                size="lg"
                leftIcon={<Icon as={MdInventory} />}
                colorScheme="blue"
                variant="outline"
                onClick={() => navigate('/products')}
              >
                Ver Productos
              </Button>
              <Button
                w="full"
                size="lg"
                leftIcon={<Icon as={MdCheckBox} />}
                colorScheme="blue"
                onClick={() => navigate('/reports')}
              >
                Ver Reportes
              </Button>
            </VStack>
          </Box>

          {/* Productos con Stock Bajo */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Stock Bajo</Heading>
              {lowStockProducts.length > 0 && (
                <Badge colorScheme="orange" fontSize="sm" px={2} py={1} borderRadius='md'>
                  {stats.lowStockCount}
                </Badge>
              )}
            </HStack>

            {lowStockProducts.length === 0 ? (
              <Box textAlign="center" py={8}>
                <Text color="gray.500">✅ Todo el stock está bien</Text>
              </Box>
            ) : (
              <VStack spacing={3} align="stretch">
                {lowStockProducts.map(product => (
                  <Box
                    key={product._id}
                    p={3}
                    bg="orange.50"
                    borderRadius="lg"
                    border="1px"
                    borderColor="orange.200"
                  >
                    <HStack justify="space-between">
                      <VStack align="start" spacing={0} flex={1}>
                        <Text fontWeight="semibold" fontSize="sm">
                          {product.name}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {product.category}
                        </Text>
                      </VStack>
                      <Badge colorScheme="orange" fontSize="sm" borderRadius='md'>
                        {product.stock} un.
                      </Badge>
                    </HStack>
                  </Box>
                ))}
                {stats.lowStockCount > 5 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    colorScheme="orange"
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
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100" mt={6}>
            <HStack justify="space-between" mb={4}>
              <Heading size="md">Últimas Ventas</Heading>
              <Button
                size="sm"
                variant="ghost"
                colorScheme="blue"
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
                  bg="gray.50"
                  borderRadius="lg"
                  _hover={{ bg: 'gray.100' }}
                  cursor="pointer"
                  onClick={() => navigate('/history')}
                >
                  <HStack justify="space-between" mb={2}>
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="semibold">
                        Venta #{sale.ticketNumber}
                      </Text>
                      <Text fontSize="xs" color="gray.600">
                        {new Date(sale.createdAt).toLocaleTimeString('es-AR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </VStack>
                    <Text fontSize="xl" fontWeight="bold" color="green.600">
                      ${sale.total}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600">
                    {sale.products.length} producto{sale.products.length > 1 ? 's' : ''}
                  </Text>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Información de la App */}
          <Box bg="gray.100" p={4} borderRadius="lg" textAlign="center" mt={10}>
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
      </Container>
    </Box>
  );
};

export default Home;