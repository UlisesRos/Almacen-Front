import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  VStack,
  HStack,
  Badge,
  useToast,
  Spinner,
  Flex,
  Icon,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Divider,
  Alert,
  AlertIcon,
  IconButton,
  Select,
  Input,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import {
  MdShoppingCart,
  MdAttachMoney,
  MdEmail,
  MdReceipt,
  MdDelete,
  MdCalendarToday,
  MdFilterList,
  MdCreditCard,
  MdMoneyOff,
  MdDownload,
} from 'react-icons/md';
import { salesAPI } from '../api/sales';
import { pdfGenerator } from '../utils/pdfGenerator';
import { useAuth } from '../context/AuthContext';
import { storageService } from '../utils/storageService';
import { syncService } from '../utils/syncService';

const History = () => {
  const [sales, setSales] = useState([]);
  const [stats, setStats] = useState({
    totalVentas: 0,
    totalMonto: 0,
    totalProductos: 0,
    promedioVenta: 0,
    byPaymentMethod: {
      efectivo: { count: 0, total: 0 },
      transferencia: { count: 0, total: 0 },
      tarjeta: { count: 0, total: 0 }
    }
  });
  const [loading, setLoading] = useState(true);
  const [selectedSale, setSelectedSale] = useState(null);
  const [period, setPeriod] = useState('today');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState("all");
  const [allSales, setAllSales] = useState([]);
  const [sendEmailLoading, setSendEmailLoading] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isEmailOpen, onOpen: onEmailOpen, onClose: onEmailClose } = useDisclosure();
  const toast = useToast();
  const { store } = useAuth();

  useEffect(() => {
    loadSales();
  }, [period, paymentFilter, statusFilter, selectedMonth, selectedYear]);

  const loadSales = async () => {
    try {
      setLoading(true);

      const isOnline = syncService.isOnline();
      let salesData = [];

      if (isOnline) {
        try {
          const params = {};

          if (paymentFilter !== 'all' && period !== 'today') {
            params.paymentMethod = paymentFilter;
          }

          let response =
            period === "today"
              ? await salesAPI.getToday()
              : await salesAPI.getAll(params);

          salesData = response.data || [];
          
          // Guardar en caché local
          if (period !== 'today') {
            storageService.saveSales(salesData);
          }
        } catch (error) {
          console.error('Error al cargar ventas del servidor:', error);
          // Si falla, usar caché local
          const cachedSales = storageService.getSales();
          if (cachedSales && cachedSales.length > 0) {
            salesData = cachedSales;
            toast({
              title: 'Modo offline',
              description: 'Usando datos del caché local',
              status: 'warning',
              duration: 3000,
              isClosable: true,
            });
          } else {
            throw error;
          }
        }
      } else {
        // Sin conexión, usar caché local
        const cachedSales = storageService.getSales();
        if (cachedSales && cachedSales.length > 0) {
          salesData = cachedSales;
          toast({
            title: 'Modo offline',
            description: 'Usando datos del caché local',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
        }
      }

      // Normalizar todas las ventas: asegurar que tengan tanto 'items' como 'products'
      const normalizeSale = (sale) => {
        if (sale.items && !sale.products) {
          return {
            ...sale,
            products: sale.items.map(item => ({
              product: item.product || item.productId || item,
              quantity: item.quantity || 0,
              price: item.price || 0,
            })),
          };
        } else if (sale.products && !sale.items) {
          return {
            ...sale,
            items: sale.products,
          };
        }
        return sale;
      };

      // Normalizar ventas del servidor
      const normalizedSalesData = salesData.map(normalizeSale);
      
      // Combinar con ventas pendientes y normalizar
      const pendingSales = storageService.getPendingSales();
      const normalizedPendingSales = pendingSales.map(normalizeSale);
      
      const allSalesData = [...normalizedSalesData, ...normalizedPendingSales];

      setAllSales(allSalesData);

      let filtered = allSalesData;

      // Filtrar por mes/año si está seleccionado
      if (selectedMonth !== '' && period === 'month') {
        const monthNum = parseInt(selectedMonth);
        filtered = filtered.filter(sale => {
          const saleDate = new Date(sale.createdAt);
          return saleDate.getMonth() === monthNum && saleDate.getFullYear() === selectedYear;
        });
      }

      if (statusFilter !== "all") {
        filtered = filtered.filter(sale => sale.status === statusFilter);
      }

      if (period === "today" && paymentFilter !== "all") {
        filtered = filtered.filter(sale => sale.paymentMethod === paymentFilter);
      }

      setSales(filtered);

      // Calcular estadísticas basadas en las ventas filtradas
      const completedSales = filtered.filter(s => s.status === "completada" || !s.status);

      const totalMonto = completedSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
      const totalProductos = completedSales.reduce(
        (sum, sale) => {
          // Las ventas pueden tener 'items' o 'products'
          const items = sale.items || sale.products || [];
          return sum + items.reduce((pSum, p) => pSum + (p.quantity || 0), 0);
        },
        0
      );

      const byPaymentMethod = {
        efectivo: {
          count: completedSales.filter(s => s.paymentMethod === 'efectivo').length,
          total: completedSales.filter(s => s.paymentMethod === 'efectivo')
            .reduce((sum, s) => sum + s.total, 0)
        },
        transferencia: {
          count: completedSales.filter(s => s.paymentMethod === 'transf').length,
          total: completedSales.filter(s => s.paymentMethod === 'transf')
            .reduce((sum, s) => sum + s.total, 0)
        },
        tarjeta: {
          count: completedSales.filter(s => s.paymentMethod === 'tarjeta').length,
          total: completedSales.filter(s => s.paymentMethod === 'tarjeta')
            .reduce((sum, s) => sum + s.total, 0)
        },
      };

      setStats({
        totalVentas: completedSales.length,
        totalMonto,
        totalProductos,
        promedioVenta:
          completedSales.length > 0
            ? (totalMonto / completedSales.length).toFixed(2)
            : 0,
        byPaymentMethod,
      });

    } catch (err) {
      console.error("Error al cargar ventas", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
    setEmailAddress(sale.customer?.email || '');
    onOpen();
  };

  const handleCancelSale = async (saleId) => {
    if (!window.confirm('¿Deseas cancelar esta venta? Se devolverá el stock.')) {
      return;
    }

    try {
      await salesAPI.cancel(saleId);
      toast({
        title: 'Venta cancelada',
        description: 'El stock ha sido restaurado',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadSales();
      onClose();
    } catch (error) {
      console.error('Error al cancelar venta:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la venta',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDownloadPDF = (sale) => {
    const pdfResult = pdfGenerator.generateReceipt(sale, store);
    
    if (pdfResult.success) {
      toast({
        title: 'PDF Descargado',
        description: `Ticket #${sale.ticketNumber} descargado exitosamente`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: 'Error al generar PDF',
        description: pdfResult.error || 'No se pudo generar el PDF',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSendEmail = async () => {
    if (!emailAddress) {
      toast({
        title: 'Email requerido',
        description: 'Debes ingresar un email válido',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!selectedSale) {
      toast({
        title: 'Error',
        description: 'No hay venta seleccionada',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setSendEmailLoading(true);

      // Llamar a la API para enviar el email
      await salesAPI.sendEmail(selectedSale._id, emailAddress);

      toast({
        title: 'Email enviado',
        description: `Comprobante enviado a ${emailAddress}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onEmailClose();
    } catch (error) {
      console.error('Error al enviar email:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo enviar el email',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSendEmailLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'efectivo':
        return MdAttachMoney;
      case 'transferencia':
      case 'tarjeta':
        return MdCreditCard;
      default:
        return MdAttachMoney;
    }
  };

  const getPaymentColor = (method) => {
    switch (method) {
      case 'efectivo':
        return 'green';
      case 'transferencia':
      case 'tarjeta':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getPaymentLabel = (method) => {
    switch (method) {
      case 'efectivo':
        return 'Efectivo';
      case 'transferencia':
        return 'Transf';
      case 'tarjeta':
        return 'Tarjeta';
      default:
        return method;
    }
  };

  const getReceiptIcon = (method) => {
    switch (method) {
      case 'email':
        return MdEmail;
      default:
        return MdMoneyOff;
    }
  };

  const getReceiptLabel = (method) => {
    switch (method) {
      case 'email':
        return 'Email';
      default:
        return 'Sin Comprobante';
    }
  };

  const getReceiptColor = (method) => {
    switch (method) {
      case 'email':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="black" bgGradient="linear(to-b, black, purple.900)">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="white">Cargando historial...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="black" bgGradient="linear(to-b, black, purple.900)" pb={20}>
      <Container maxW="container.xl" py={6}>
        <Heading size="lg" mb={6} color="white">Historial de Ventas</Heading>

        {/* Filtros */}
        <HStack spacing={3} mb={6} flexWrap="wrap" justify='center'>
          <HStack spacing={2}>
            <Icon as={MdCalendarToday} color="gray.400" />
            <Button
              size="sm"
              bg={period === 'today' ? 'purple.500' : 'transparent'}
              color={period === 'today' ? 'white' : 'gray.400'}
              borderColor={period === 'today' ? 'purple.500' : 'gray.600'}
              variant={period === 'today' ? 'solid' : 'outline'}
              _hover={period === 'today' ? { bg: 'purple.600' } : { bg: 'gray.700', borderColor: 'purple.500', color: 'white' }}
              onClick={() => setPeriod('today')}
            >
              Hoy
            </Button>
            <Button
              size="sm"
              bg={period === 'week' ? 'purple.500' : 'transparent'}
              color={period === 'week' ? 'white' : 'gray.400'}
              borderColor={period === 'week' ? 'purple.500' : 'gray.600'}
              variant={period === 'week' ? 'solid' : 'outline'}
              _hover={period === 'week' ? { bg: 'purple.600' } : { bg: 'gray.700', borderColor: 'purple.500', color: 'white' }}
              onClick={() => setPeriod('week')}
            >
              Semana
            </Button>
            <Button
              size="sm"
              bg={period === 'month' ? 'purple.500' : 'transparent'}
              color={period === 'month' ? 'white' : 'gray.400'}
              borderColor={period === 'month' ? 'purple.500' : 'gray.600'}
              variant={period === 'month' ? 'solid' : 'outline'}
              _hover={period === 'month' ? { bg: 'purple.600' } : { bg: 'gray.700', borderColor: 'purple.500', color: 'white' }}
              onClick={() => {
                setPeriod('month');
                if (!selectedMonth) {
                  setSelectedMonth(String(new Date().getMonth()));
                }
              }}
            >
              Mes
            </Button>
          </HStack>

          {/* Selector de mes y año cuando period es 'month' */}
          {period === 'month' && (
            <HStack spacing={2} mb={3} mt='13px'>
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
          )}

          <HStack spacing={2}>
            <Icon as={MdFilterList} color="gray.400" />
            <Select
              size="sm"
              w="200px"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              bg="gray.700"
              color="white"
              borderColor="gray.600"
              _hover={{ borderColor: 'purple.500' }}
            >
              <option value="all" style={{ background: '#374151' }}>Todos los pagos</option>
              <option value="efectivo" style={{ background: '#374151' }}>Solo Efectivo</option>
              <option value="transferencia" style={{ background: '#374151' }}>Solo Transferencia</option>
            </Select>
          </HStack>

          <HStack spacing={2}>
            <Icon as={MdFilterList} color="gray.400" />
            <Select
              size="sm"
              w="200px"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              bg="gray.700"
              color="white"
              borderColor="gray.600"
              _hover={{ borderColor: 'purple.500' }}
            >
              <option value="all" style={{ background: '#374151' }}>Todos los estados</option>
              <option value="completada" style={{ background: '#374151' }}>Solo Completadas</option>
              <option value="cancelada" style={{ background: '#374151' }}>Solo Canceladas</option>
            </Select>
          </HStack>
        </HStack>

        {/* Estadísticas */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4}>
              <Box bg="purple.600" p={3} borderRadius="lg">
                <Icon as={MdShoppingCart} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Total Ventas</StatLabel>
                <StatNumber fontSize="3xl" color="white">{stats.totalVentas}</StatNumber>
                <StatHelpText color="gray.500">{stats.totalProductos} productos</StatHelpText>
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
                <StatNumber fontSize="3xl" color="white">${stats.totalMonto}</StatNumber>
                <StatHelpText color="gray.500">
                  {period === 'today' ? 'Hoy' : period === 'week' ? 'Esta semana' : 'Este mes'}
                </StatHelpText>
              </Stat>
            </HStack>
          </Box>

          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4}>
              <Box bg="green.600" p={3} borderRadius="lg">
                <Icon as={MdAttachMoney} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Efectivo</StatLabel>
                <StatNumber fontSize="2xl" color="white">${stats.byPaymentMethod.efectivo.total}</StatNumber>
                <StatHelpText color="gray.500">{stats.byPaymentMethod.efectivo.count} ventas</StatHelpText>
              </Stat>
            </HStack>
          </Box>

          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
            <HStack spacing={4}>
              <Box bg="blue.600" p={3} borderRadius="lg">
                <Icon as={MdCreditCard} boxSize={8} color="white" />
              </Box>
              <Stat>
                <StatLabel color="gray.400">Transferencia</StatLabel>
                <StatNumber fontSize="2xl" color="white">${stats.byPaymentMethod.transferencia.total}</StatNumber>
                <StatHelpText color="gray.500">{stats.byPaymentMethod.transferencia.count} ventas</StatHelpText>
              </Stat>
            </HStack>
          </Box>
        </SimpleGrid>

        {/* Lista de ventas */}
        {sales.length === 0 ? (
          <Box textAlign="center" py={12} bg="gray.800" borderRadius="xl" border="1px" borderColor="gray.700">
            <Icon as={MdShoppingCart} boxSize={16} color="gray.600" mb={4} />
            <Text fontSize="xl" color="gray.400" mb={2}>
              No hay ventas registradas
            </Text>
            <Text fontSize="sm" color="gray.500">
              {paymentFilter !== 'all' 
                ? `No hay ventas con ${paymentFilter === 'efectivo' ? 'efectivo' : 'transferencia'}`
                : 'Las ventas aparecerán aquí cuando se realicen'}
            </Text>
          </Box>
        ) : (
          <VStack spacing={4} align="stretch">
            {sales.map(sale => (
              <Box
                key={sale._id}
                bg="gray.800"
                p={5}
                borderRadius="xl"
                boxShadow="2xl"
                border="1px"
                borderColor="gray.700"
                _hover={{ boxShadow: 'lg', cursor: 'pointer', borderColor: 'purple.500' }}
                transition="all 0.2s"
                onClick={() => handleViewDetails(sale)}
              >
                <Card
                  variant="outline"
                  borderRadius="lg"
                  boxShadow="sm"
                  bg="transparent"
                  borderColor="gray.700"
                  _hover={{ boxShadow: "md", transform: "translateY(-2px)" }}
                  transition="all 0.2s"
                  p={4}
                >
                  <Stack
                    direction={{ base: "column", md: "row" }}
                    justify="space-between"
                    align={{ base: "flex-start", md: "center" }}
                    w="100%"
                    spacing={4}
                  >
                    <VStack align="start" spacing={2} w="100%">
                      <HStack spacing={2}>
                        <Icon as={MdReceipt} color="purple.400" boxSize={5} />
                        <Text fontWeight="bold" fontSize={{ base: "md", md: "lg" }} color="white">
                          Ticket #{sale.ticketNumber}
                        </Text>
                        <Badge
                          bg={sale.status === "completada" ? "green.500" : "red.500"}
                          color="white"
                          borderRadius="md"
                          fontSize={{ base: "xs", md: "sm" }}
                        >
                          {sale.status}
                        </Badge>
                      </HStack>

                      <HStack spacing={4} fontSize={{ base: "xs", md: "sm" }} color="gray.400">
                        <Text>{formatDate(sale.createdAt)}</Text>
                        <Text>{formatTime(sale.createdAt)}</Text>
                      </HStack>
                    </VStack>

                    <VStack
                      align={{ base: "flex-start", md: "flex-end" }}
                      spacing={1}
                      w={{ base: "100%", md: "auto" }}
                    >
                      <Text
                        fontSize={{ base: "xl", md: "2xl" }}
                        fontWeight="bold"
                        color="green.400"
                      >
                        ${sale.total}
                      </Text>

                      <Badge
                        bg={getPaymentColor(sale.paymentMethod) === 'green' ? 'green.500' : 'blue.500'}
                        color="white"
                        fontSize="xs"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        <HStack spacing={1}>
                          <Icon as={getPaymentIcon(sale.paymentMethod)} />
                          <Text>{getPaymentLabel(sale.paymentMethod)}</Text>
                        </HStack>
                      </Badge>
                    </VStack>
                  </Stack>

                  <Divider my={3} borderColor="gray.600" />

                  <Stack
                    direction={{ base: "column", md: "row" }}
                    justify="space-between"
                    align={{ base: "flex-start", md: "center" }}
                    w="100%"
                    fontSize={{ base: "xs", md: "sm" }}
                    color="gray.400"
                    spacing={2}
                  >
                    <Text>
                      {(sale.items || sale.products || []).length} producto
                      {(sale.items || sale.products || []).length > 1 ? "s" : ""}
                    </Text>

                    <Badge
                      bg={getReceiptColor(sale.receiptSent) === 'blue' ? 'blue.500' : 'gray.600'}
                      color="white"
                      fontSize="xs"
                      px={2}
                      py={1}
                      borderRadius="md"
                    >
                      <HStack spacing={1}>
                        <Icon as={getReceiptIcon(sale.receiptSent)} boxSize={3} />
                        <Text>{getReceiptLabel(sale.receiptSent)}</Text>
                      </HStack>
                    </Badge>
                  </Stack>
                </Card>
              </Box>
            ))}
          </VStack>
        )}
      </Container>

      {/* Modal de detalles de venta */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent w={['95%', '500px']} bg="gray.800" border="1px" borderColor="gray.700">
          <ModalHeader color="white">
            <HStack justify="space-between">
              <Text>Detalles de Venta</Text>
              {selectedSale?.status === 'completada' && (
                <IconButton
                  mr='30px'
                  icon={<Icon as={MdDelete} />}
                  color="red.400"
                  variant="ghost"
                  _hover={{ bg: 'gray.700' }}
                  onClick={() => handleCancelSale(selectedSale._id)}
                  aria-label="Cancelar venta"
                />
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} />
          <ModalBody pb={6}>
            {selectedSale && (
              <VStack spacing={4} align="stretch">
                <Box bg="purple.900" p={4} borderRadius="lg" border="1px" borderColor="purple.700">
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color="gray.400">Ticket:</Text>
                    <Text fontWeight="bold" color="white">#{selectedSale.ticketNumber}</Text>
                  </HStack>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color="gray.400">Fecha:</Text>
                    <Text color="white">{formatDate(selectedSale.createdAt)} - {formatTime(selectedSale.createdAt)}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.400">Estado:</Text>
                    <Badge bg={selectedSale.status === 'completada' ? 'green.500' : 'red.500'} color="white">
                      {selectedSale.status}
                    </Badge>
                  </HStack>
                </Box>

                <SimpleGrid columns={2} spacing={4}>
                  <Box bg="gray.700" p={4} borderRadius="lg">
                    <Text fontSize="sm" color="gray.400" mb={2}>Método de Pago:</Text>
                    <Badge
                      bg={getPaymentColor(selectedSale.paymentMethod) === 'green' ? 'green.500' : 'blue.500'}
                      color="white"
                      fontSize="md"
                      px={3}
                      py={2}
                      borderRadius='md'
                    >
                      <HStack>
                        <Icon as={getPaymentIcon(selectedSale.paymentMethod)} />
                        <Text>{getPaymentLabel(selectedSale.paymentMethod)}</Text>
                      </HStack>
                    </Badge>
                  </Box>

                  <Box bg="gray.700" p={4} borderRadius="lg">
                    <Text fontSize="sm" color="gray.400" mb={2}>Comprobante:</Text>
                    <Badge
                      bg={getReceiptColor(selectedSale.receiptSent) === 'blue' ? 'blue.500' : 'gray.600'}
                      color="white"
                      fontSize="md"
                      px={3}
                      py={2}
                      borderRadius='md'
                    >
                      <HStack>
                        <Icon as={getReceiptIcon(selectedSale.receiptSent)} />
                        <Text>{getReceiptLabel(selectedSale.receiptSent)}</Text>
                      </HStack>
                    </Badge>
                  </Box>
                </SimpleGrid>

                {/* Botones de acción para PDF y Email */}
                <SimpleGrid columns={2} spacing={4}>
                  <Button
                    leftIcon={<Icon as={MdDownload} />}
                    bgGradient="linear(to-r, purple.500, purple.600)"
                    color="white"
                    _hover={{
                      bgGradient: 'linear(to-r, purple.600, purple.700)',
                    }}
                    onClick={() => handleDownloadPDF(selectedSale)}
                  >
                    Descargar PDF
                  </Button>
                  <Button
                    leftIcon={<Icon as={MdEmail} />}
                    bg="blue.500"
                    color="white"
                    _hover={{ bg: 'blue.600' }}
                    onClick={onEmailOpen}
                  >
                    Enviar por Email
                  </Button>
                </SimpleGrid>

                <Box>
                  <Text fontWeight="semibold" mb={3} color="white">Productos Vendidos:</Text>
                  <VStack spacing={2} align="stretch">
                    {selectedSale.products.map((item, index) => (
                      <Box key={index} p={3} bg="gray.700" borderRadius="lg">
                        <HStack justify="space-between" mb={1}>
                          <Text fontWeight="semibold" color="white">{item.name}</Text>
                          <Text fontWeight="bold" color="purple.400">
                            ${item.subtotal}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" fontSize="sm" color="gray.400">
                          <Text>{item.quantity} x ${item.price}</Text>
                          <Text>Código: {item.barcode}</Text>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>

                <Divider borderColor="gray.600" />

                <HStack justify="space-between" bg="green.900" p={4} borderRadius="lg" border="1px" borderColor="green.700">
                  <Text fontSize="lg" fontWeight="semibold" color="white">Total:</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="green.300">
                    ${selectedSale.total}
                  </Text>
                </HStack>

                {(selectedSale.customer?.email) && (
                  <Box bg="gray.700" p={4} borderRadius="lg">
                    <Text fontWeight="semibold" mb={2} color="white">Información del Cliente:</Text>
                    {selectedSale.customer.email && (
                      <HStack mb={1}>
                        <Icon as={MdEmail} color="blue.400" />
                        <Text fontSize="sm" color="gray.300">{selectedSale.customer.email}</Text>
                      </HStack>
                    )}
                  </Box>
                )}

                {selectedSale.status === 'cancelada' && (
                  <Alert status="error" borderRadius="lg" bg="gray.800" borderColor="red.500">
                    <AlertIcon color="red.400" />
                    <Text color="white">Esta venta fue cancelada. El stock ha sido restaurado.</Text>
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Modal para enviar email */}
      <Modal isOpen={isEmailOpen} onClose={onEmailClose}>
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent bg="gray.800" border="1px" borderColor="gray.700" w={['95%', '500px']}>
          <ModalHeader color="white">Enviar Comprobante por Email</ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel color="white">Email del destinatario</FormLabel>
                <Input
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  bg="gray.700"
                  border="none"
                  color="white"
                  _placeholder={{ color: 'gray.400' }}
                  _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                  _hover={{ bg: 'gray.700' }}
                />
              </FormControl>

              <Alert status="info" borderRadius="lg" bg="gray.700" borderColor="blue.500">
                <AlertIcon color="blue.400" />
                <Text color="white">Se enviará el comprobante en formato PDF</Text>
              </Alert>

              <Button
                w="full"
                bg="blue.500"
                color="white"
                _hover={{ bg: 'blue.600' }}
                onClick={handleSendEmail}
                isLoading={sendEmailLoading}
                loadingText="Enviando..."
              >
                Enviar Email
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default History;