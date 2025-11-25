import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  Spinner,
  Flex,
  Icon,
  useToast,
  Select,
} from '@chakra-ui/react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  MdDownload,
  MdTrendingUp,
  MdAttachMoney,
  MdShoppingCart,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { salesAPI } from '../api/sales';
import { productsAPI } from '../api/products';
import { pdfGenerator } from '../utils/pdfGenerator';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [productStats, setProductStats] = useState([]);
  const [paymentStats, setPaymentStats] = useState([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    totalRevenue: 0,
    averageTicket: 0,
    topProduct: null,
  });
  const [allSales, setAllSales] = useState([]);
  const [allProducts, setAllProducts] = useState([]);

  const { store } = useAuth();
  const toast = useToast();

  useEffect(() => {
    loadReportData();
  }, [period]);

  const loadReportData = async () => {
    try {
      setLoading(true);

      // Traer todo
      const salesResponse = await salesAPI.getAll({});
      const sales = Array.isArray(salesResponse.data) ? salesResponse.data : [];
      setAllSales(sales);

      const productsResponse = await productsAPI.getAll();
      const products = Array.isArray(productsResponse.data) ? productsResponse.data : [];
      setAllProducts(products);

      // ---------------------------
      // 1) FILTRAR SOLO COMPLETADAS (UNA VEZ)
      // ---------------------------
      const completedSales = sales.filter(
        sale =>
          sale?.status === 'completada' ||
          sale?.status === 'completed' ||
          sale?.estado === 'completado' // por si en algún lado usás "estado"
      );

      // 2) FILTRAR POR PERÍODO (FECHA)
      const filteredSales = filterSalesByPeriod(completedSales, period);

      // 3) Procesar datos para UI
      const chartData = processChartData(filteredSales);
      setSalesData(chartData);

      const prodStats = processProductStats(filteredSales, products);
      setProductStats(prodStats);

      const payStats = processPaymentStats(filteredSales);
      setPaymentStats(payStats);

      // 4) Resumen
      const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const avgTicket = filteredSales.length > 0 ? (totalRevenue / filteredSales.length) : 0;

      setSummary({
        totalSales: filteredSales.length,
        totalRevenue,
        averageTicket: Number(avgTicket.toFixed(2)),
        topProduct: prodStats[0] || null,
      });

    } catch (error) {
      console.error('Error cargando reportes:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos de reportes',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // filterSalesByPeriod: SOLO filtra por fecha (no toca estado)
  const filterSalesByPeriod = (sales, periodType) => {
    const now = new Date();
    let startDate = new Date();

    switch (periodType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        // inicio de semana (domingo)
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0);
    }

    return sales.filter(sale => {
      const created = new Date(sale.createdAt);
      return created >= startDate;
    });
  };

  // Agrupa por fecha (ISO key) y devuelve array ordenado por fecha asc
  const processChartData = (sales) => {
    const dataByISO = {};

    sales.forEach(sale => {
      // clave ISO YYYY-MM-DD para agrupación consistente
      const iso = new Date(sale.createdAt).toISOString().slice(0, 10);
      if (!dataByISO[iso]) {
        dataByISO[iso] = { iso, date: formatDateFromISO(iso), revenue: 0, count: 0 };
      }
      dataByISO[iso].revenue += Number(sale.total) || 0;
      dataByISO[iso].count += 1;
    });

    return Object.values(dataByISO).sort((a, b) => (a.iso > b.iso ? 1 : -1));
  };

  const formatDateFromISO = (iso) => {
    // iso = 'YYYY-MM-DD'
    const [y, m, d] = iso.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const processProductStats = (sales, products) => {
    const productMap = {};

    sales.forEach(sale => {
      (sale.products || []).forEach(item => {
        const pid = item.productId || item.product_id || item._id;
        if (!productMap[pid]) {
          const product = products.find(p => p._id === pid);
          productMap[pid] = {
            name: product?.name || item.name || 'Desconocido',
            quantity: 0,
            revenue: 0,
            count: 0,
          };
        }
        productMap[pid].quantity += Number(item.quantity) || 0;
        productMap[pid].revenue += Number(item.subtotal) || 0;
        productMap[pid].count += 1;
      });
    });

    return Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  const processPaymentStats = (sales) => {
    const methods = {
      efectivo: 0,
      transferencia: 0,
      tarjeta: 0,
    };

    sales.forEach(sale => {
      const method = sale.paymentMethod || 'efectivo';
      methods[method] = (methods[method] || 0) + (Number(sale.total) || 0);
    });

    return Object.entries(methods)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: parseFloat(value.toFixed(2)),
      }));
  };

  const handleDownloadSalesReport = async () => {
    try {
      // Para el PDF también usamos solo completadas en el período
      const completedSales = allSales.filter(
        sale =>
          sale?.status === 'completada' ||
          sale?.status === 'completed' ||
          sale?.estado === 'completado'
      );
      const filteredSales = filterSalesByPeriod(completedSales, period);

      const periodLabel = {
        today: 'Hoy',
        week: 'Esta Semana',
        month: 'Este Mes',
        year: 'Este Año',
      }[period];

      await pdfGenerator.generateSalesReport(filteredSales, periodLabel, store);
      toast({
        title: 'PDF descargado',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error descargando PDF:', error);
      toast({
        title: 'Error al descargar',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDownloadInventory = async () => {
    try {
      await pdfGenerator.generateInventoryReport(allProducts, store);
      toast({
        title: 'Inventario descargado',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      console.error('Error descargando inventario:', error);
      toast({
        title: 'Error al descargar',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Cargando reportes...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" maxW='100%' bg="gray.50" pb={20}>
      <Box bg="white" borderBottom="1px" borderColor="gray.200" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <HStack justify="space-between" align="center" flexWrap="wrap">
            <Heading size="lg">Reportes y Análisis</Heading>
            <Select
              w="150px"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              bg="white"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta Semana</option>
              <option value="month">Este Mes</option>
              <option value="year">Este Año</option>
            </Select>
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.xl">
        {/* Resumen */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4}>
              <Box bg="blue.100" p={3} borderRadius="lg">
                <Icon as={MdShoppingCart} boxSize={8} color="blue.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Total de Ventas</StatLabel>
                <StatNumber fontSize="3xl">{summary.totalSales}</StatNumber>
              </Stat>
            </HStack>
          </Box>

          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4}>
              <Box bg="green.100" p={3} borderRadius="lg">
                <Icon as={MdAttachMoney} boxSize={8} color="green.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Ingresos Totales</StatLabel>
                <StatNumber fontSize="2xl">${Number(summary.totalRevenue || 0).toFixed(2)}</StatNumber>
              </Stat>
            </HStack>
          </Box>

          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4}>
              <Box bg="purple.100" p={3} borderRadius="lg">
                <Icon as={MdTrendingUp} boxSize={8} color="purple.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Ticket Promedio</StatLabel>
                <StatNumber fontSize="2xl">${Number(summary.averageTicket || 0).toFixed(2)}</StatNumber>
              </Stat>
            </HStack>
          </Box>

          {summary.topProduct && (
            <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
              <Stat>
                <StatLabel color="gray.600">Top Producto</StatLabel>
                <StatNumber fontSize="sm" mb={2}>{summary.topProduct.name}</StatNumber>
                <Text fontSize="sm" color="gray.600">
                  ${Number(summary.topProduct.revenue || 0).toFixed(2)}
                </Text>
              </Stat>
            </Box>
          )}
        </SimpleGrid>

        {/* Gráficos */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
          {/* Línea de ventas */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <Heading size="md" mb={4}>Ventas por Día</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${value}`} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Ingresos"
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>

          {/* Método de pago */}
          {paymentStats.length > 0 && (
            <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
              <Heading size="md" mb={4}>Ingresos por Método de Pago</Heading>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: $${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${value}`} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </SimpleGrid>

        {/* Top Productos */}
        {productStats.length > 0 && (
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100" mb={8}>
            <Heading size="md" mb={4}>Top 5 Productos Vendidos</Heading>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={productStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Ingresos" />
                <Bar dataKey="quantity" fill="#3b82f6" name="Cantidad" />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Botones de descarga */}
        <Box mb={8}>
          <HStack spacing={4} flexWrap="wrap">
            <Button
              leftIcon={<Icon as={MdDownload} />}
              colorScheme="blue"
              size="lg"
              onClick={handleDownloadSalesReport}
            >
              Descargar Reporte de Ventas
            </Button>
            <Button
              leftIcon={<Icon as={MdDownload} />}
              colorScheme="green"
              size="lg"
              onClick={handleDownloadInventory}
            >
              Descargar Inventario
            </Button>
          </HStack>
        </Box>
      </Container>
    </Box>
  );
};

export default Reports;
