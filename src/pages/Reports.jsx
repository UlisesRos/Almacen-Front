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
  StatHelpText,
  Spinner,
  Flex,
  Icon,
  useToast,
  Select,
  useBreakpointValue,
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
  MdCreditCard,
} from 'react-icons/md';
import { useAuth } from '../context/AuthContext';
import { salesAPI } from '../api/sales';
import { productsAPI } from '../api/products';
import { pdfGenerator } from '../utils/pdfGenerator';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const [period, setPeriod] = useState('week');
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth()));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
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

  // Detectar si es móvil
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    loadReportData();
  }, [period, selectedMonth, selectedYear]);

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

      // 1) FILTRAR SOLO COMPLETADAS (UNA VEZ)
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
    let endDate = new Date();

    switch (periodType) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // inicio de semana (domingo)
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // Mes específico seleccionado
        const monthNum = parseInt(selectedMonth);
        startDate = new Date(selectedYear, monthNum, 1);
        endDate = new Date(selectedYear, monthNum + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(selectedYear, 0, 1);
        endDate = new Date(selectedYear, 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(0);
        endDate = new Date();
    }

    return sales.filter(sale => {
      const created = new Date(sale.createdAt);
      return created >= startDate && created <= endDate;
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
      // Las ventas pueden tener 'products' o 'items'
      const items = sale.products || sale.items || [];
      
      if (!items || items.length === 0) {
        return; // Saltar ventas sin productos
      }
      
      items.forEach(item => {
        if (!item) return; // Saltar items nulos
        
        // Función helper para normalizar IDs
        const normalizeId = (id) => {
          if (!id) return null;
          if (typeof id === 'string') return id;
          if (typeof id === 'object' && id._id) return String(id._id);
          if (typeof id === 'object' && id.toString) return String(id);
          return String(id);
        };

        // Intentar obtener el ID del producto de diferentes formas (en orden de prioridad)
        let pid = null;
        
        // 1. productId (formato del backend)
        if (item.productId) {
          pid = normalizeId(item.productId);
        }
        // 2. product._id (si product es un objeto)
        else if (item.product && typeof item.product === 'object') {
          pid = normalizeId(item.product._id || item.product);
        }
        // 3. _id directo
        else if (item._id) {
          pid = normalizeId(item._id);
        }
        // 4. product_id (alternativo)
        else if (item.product_id) {
          pid = normalizeId(item.product_id);
        }

        // Si no encontramos un ID válido, usar el nombre como clave (último recurso)
        if (!pid || pid === 'undefined' || pid === 'null' || pid === '') {
          const itemName = item.name || item.product?.name || 'Desconocido';
          // Usar nombre como clave, pero solo si realmente no hay ID
          pid = `name_${itemName}_${Math.random()}`; // Agregar random para evitar colisiones
          console.warn('Producto sin ID encontrado:', itemName, item);
        }

        // Inicializar el producto en el mapa si no existe
        if (!productMap[pid]) {
          // Buscar el producto en la lista de productos usando el ID normalizado
          let product = null;
          if (pid && !pid.startsWith('name_')) {
            product = products.find(p => {
              const pId = normalizeId(p._id);
              return pId === pid;
            });
          }
          
          productMap[pid] = {
            name: product?.name || item.name || item.product?.name || 'Desconocido',
            quantity: 0,
            revenue: 0,
            count: 0,
          };
        }

        // Acumular estadísticas
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const subtotal = Number(item.subtotal) || (quantity * price);
        
        if (quantity > 0) {
          productMap[pid].quantity += quantity;
          productMap[pid].revenue += subtotal;
          productMap[pid].count += 1;
        }
      });
    });

    // Filtrar productos con cantidad > 0 y ordenar por cantidad vendida
    const validProducts = Object.values(productMap).filter(p => p.quantity > 0);
    
    // Ordenar por cantidad vendida (no por revenue) y tomar top 3
    return validProducts
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
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

  // 🎨 CUSTOM LABEL para el gráfico de torta - RESPONSIVE
  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // En móvil, mostrar solo el porcentaje
    if (isMobile) {
      return (
        <text 
          x={x} 
          y={y} 
          fill="white" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="central"
          fontSize="12"
          fontWeight="bold"
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    }

    // En desktop, mostrar nombre y monto
    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize="11"
      >
        {`${name}: $${value}`}
      </text>
    );
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="black" bgGradient="linear(to-b, black, purple.900)">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="white">Cargando reportes...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" maxW='100%' bg="black" bgGradient="linear(to-b, black, purple.900)" pb={20}>
      <Box bg="gray.800" borderBottom="1px" borderColor="gray.700" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <HStack justify="space-between" align="center" flexWrap="wrap">
            <Heading size="lg" color="white">Reportes y Análisis</Heading>
            <Select
              w="150px"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                if (e.target.value === 'month' && !selectedMonth) {
                  setSelectedMonth(String(new Date().getMonth()));
                }
              }}
              bg="gray.700"
              color="white"
              borderColor="gray.600"
              _hover={{ borderColor: 'purple.500' }}
            >
              <option value="today" style={{ background: '#374151' }}>Hoy</option>
              <option value="week" style={{ background: '#374151' }}>Esta Semana</option>
              <option value="month" style={{ background: '#374151' }}>Mes</option>
              <option value="year" style={{ background: '#374151' }}>Año</option>
            </Select>
          </HStack>
        </Container>
      </Box>

      {/* Selector de mes y año cuando period es 'month' o 'year' */}
      {(period === 'month' || period === 'year') && (
        <Box bg="gray.800" borderBottom="1px" borderColor="gray.700" py={2} px={6} mb={6}>
          <Container maxW="container.xl">
            <HStack spacing={2} justify="center">
              {period === 'month' && (
                <>
                  <Select
                    size="sm"
                    w="150px"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    bg="gray.700"
                    color="white"
                    borderColor="gray.600"
                    _hover={{ borderColor: 'purple.500' }}
                    placeholder="Seleccionar mes"
                  >
                    <option value="0" style={{ background: '#374151' }}>Enero</option>
                    <option value="1" style={{ background: '#374151' }}>Febrero</option>
                    <option value="2" style={{ background: '#374151' }}>Marzo</option>
                    <option value="3" style={{ background: '#374151' }}>Abril</option>
                    <option value="4" style={{ background: '#374151' }}>Mayo</option>
                    <option value="5" style={{ background: '#374151' }}>Junio</option>
                    <option value="6" style={{ background: '#374151' }}>Julio</option>
                    <option value="7" style={{ background: '#374151' }}>Agosto</option>
                    <option value="8" style={{ background: '#374151' }}>Septiembre</option>
                    <option value="9" style={{ background: '#374151' }}>Octubre</option>
                    <option value="10" style={{ background: '#374151' }}>Noviembre</option>
                    <option value="11" style={{ background: '#374151' }}>Diciembre</option>
                  </Select>
                </>
              )}
              <Select
                size="sm"
                w="100px"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                bg="gray.700"
                color="white"
                borderColor="gray.600"
                _hover={{ borderColor: 'purple.500' }}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year} style={{ background: '#374151' }}>
                      {year}
                    </option>
                  );
                })}
              </Select>
            </HStack>
          </Container>
        </Box>
      )}

      <Container maxW="container.xl">
        {/* Resumen */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4}>
              <Box bg="purple.600" p={3} borderRadius="lg">
                <Icon as={MdShoppingCart} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Total de Ventas</StatLabel>
                <StatNumber fontSize="3xl" color="white">{summary.totalSales}</StatNumber>
              </Stat>
            </HStack>
          </Box>

          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4}>
              <Box bg="green.600" p={3} borderRadius="lg">
                <Icon as={MdAttachMoney} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Ingresos Totales</StatLabel>
                <StatNumber fontSize="2xl" color="white">${Number(summary.totalRevenue || 0).toFixed(2)}</StatNumber>
              </Stat>
            </HStack>
          </Box>

          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4}>
              <Box bg="purple.600" p={3} borderRadius="lg">
                <Icon as={MdTrendingUp} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Ticket Promedio</StatLabel>
                <StatNumber fontSize="2xl" color="white">${Number(summary.averageTicket || 0).toFixed(2)}</StatNumber>
              </Stat>
            </HStack>
          </Box>

          {summary.topProduct && (
            <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
              <Stat>
                <StatLabel color="gray.400">Top Producto</StatLabel>
                <StatNumber fontSize="sm" mb={2} color="white">{summary.topProduct.name}</StatNumber>
                <Text fontSize="sm" color="gray.400">
                  ${Number(summary.topProduct.revenue || 0).toFixed(2)}
                </Text>
              </Stat>
            </Box>
          )}
        </SimpleGrid>

        {/* Gráficos */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={8}>
          {/* Línea de ventas */}
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <Heading size="md" mb={4} color="white">Ventas por Día</Heading>
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

          {/* Método de pago - MEJORADO PARA MÓVILES */}
          {paymentStats.length > 0 && (
            <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
              <Heading size="md" mb={4} color="white">
                Ingresos por Método de Pago
              </Heading>
              
              {/* 🔥 LEYENDA MANUAL PARA MÓVILES */}
              {isMobile && (
                <VStack spacing={2} mb={4} align="stretch">
                  {paymentStats.map((entry, index) => (
                    <HStack key={`legend-${index}`} justify="space-between" p={2} bg="gray.700" borderRadius="md">
                      <HStack>
                        <Box w="12px" h="12px" bg={COLORS[index % COLORS.length]} borderRadius="sm" />
                        <Text fontSize="sm" color="white" fontWeight="medium">
                          {entry.name}
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="white" fontWeight="bold">
                        ${entry.value}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              )}

              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <PieChart>
                  <Pie
                    data={paymentStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={isMobile ? 80 : 90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {paymentStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  {!isMobile && <Tooltip formatter={(value) => `$${value}`} />}
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </SimpleGrid>

        {/* Top 3 Productos - Sin gráfico */}
        {productStats.length > 0 && (
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700" mb={8}>
            <Heading size="md" mb={4} color="white">Top 3 Productos Más Vendidos</Heading>
            <VStack spacing={3} align="stretch">
              {productStats.map((product, index) => (
                <Box
                  key={index}
                  bg="gray.700"
                  p={4}
                  borderRadius="lg"
                  borderLeft="4px"
                  borderColor={index === 0 ? 'gold' : index === 1 ? 'silver' : '#CD7F32'}
                >
                  <HStack justify="space-between" align="center">
                    <HStack spacing={3}>
                      <Box
                        w="30px"
                        h="30px"
                        borderRadius="full"
                        bg={index === 0 ? 'yellow.500' : index === 1 ? 'gray.400' : 'orange.600'}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        color="white"
                        fontWeight="bold"
                        fontSize="sm"
                      >
                        {index + 1}
                      </Box>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold" color="white" fontSize="md">
                          {product.name}
                        </Text>
                        <Text fontSize="sm" color="gray.400">
                          Cantidad vendida: {product.quantity} unidades
                        </Text>
                      </VStack>
                    </HStack>
                    <Text fontWeight="bold" color="green.400" fontSize="lg">
                      ${Number(product.revenue || 0).toFixed(2)}
                    </Text>
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Botones de descarga */}
        <Box mb={8}>
          <HStack spacing={4} flexWrap="wrap" justify='center'>
            <Button
              leftIcon={<Icon as={MdDownload} />}
              bg="blue.500"
              color="white"
              size="lg"
              _hover={{ bg: 'blue.600' }}
              onClick={handleDownloadSalesReport}
            >
              Descargar Reporte de Ventas
            </Button>
            <Button
              leftIcon={<Icon as={MdDownload} />}
              bg="green.500"
              color="white"
              size="lg"
              _hover={{ bg: 'green.600' }}
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