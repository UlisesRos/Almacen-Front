import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
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
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Select,
} from '@chakra-ui/react';
import {
  MdTrendingUp,
  MdShoppingCart,
  MdAttachMoney,
  MdEmail,
  MdWhatsapp,
  MdReceipt,
  MdDelete,
  MdCalendarToday,
  MdFilterList,
  MdCreditCard,
  MdMoneyOff,
} from 'react-icons/md';
import { salesAPI } from '../api/sales';

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
  const [paymentFilter, setPaymentFilter] = useState('all'); // 👈 Nuevo filtro

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  useEffect(() => {
    loadSales();
  }, [period, paymentFilter]); // 👈 Agregar paymentFilter

  const loadSales = async () => {
    try {
      setLoading(true);

      const params = {};
      
      // Filtro por método de pago
      if (paymentFilter !== 'all') {
        params.paymentMethod = paymentFilter;
      }

      let response;
      if (period === 'today') {
        response = await salesAPI.getToday();
      } else {
        response = await salesAPI.getAll(params);
      }

      // Filtrar localmente si es necesario (para "today" con filtro de pago)
      let filteredSales = response.data;
      if (period === 'today' && paymentFilter !== 'all') {
        filteredSales = response.data.filter(sale => sale.paymentMethod === paymentFilter);
      }

      setSales(filteredSales);

      // Calcular estadísticas
      if (response.stats) {
        setStats(response.stats);
      } else {
        const total = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
        const productos = filteredSales.reduce((sum, sale) => 
          sum + sale.products.reduce((pSum, p) => pSum + p.quantity, 0), 0
        );

        // Estadísticas por método de pago
        const byPaymentMethod = {
          efectivo: {
            count: filteredSales.filter(s => s.paymentMethod === 'efectivo').length,
            total: filteredSales.filter(s => s.paymentMethod === 'efectivo').reduce((sum, s) => sum + s.total, 0)
          },
          transferencia: {
            count: filteredSales.filter(s => s.paymentMethod === 'transferencia').length,
            total: filteredSales.filter(s => s.paymentMethod === 'transferencia').reduce((sum, s) => sum + s.total, 0)
          },
          tarjeta: {
            count: filteredSales.filter(s => s.paymentMethod === 'tarjeta').length,
            total: filteredSales.filter(s => s.paymentMethod === 'tarjeta').reduce((sum, s) => sum + s.total, 0)
          }
        };

        setStats({
          totalVentas: filteredSales.length,
          totalMonto: response.totalMonto || total,
          totalProductos: productos,
          promedioVenta: filteredSales.length > 0 ? (total / filteredSales.length).toFixed(2) : 0,
          byPaymentMethod
        });
      }

    } catch (error) {
      console.error('Error al cargar ventas:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las ventas',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (sale) => {
    setSelectedSale(sale);
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
        return 'Transferencia';
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
      case 'whatsapp':
        return MdWhatsapp;
      default:
        return MdMoneyOff;
    }
  };

  const getReceiptLabel = (method) => {
    switch (method) {
      case 'email':
        return 'Email';
      case 'whatsapp':
        return 'WhatsApp';
      default:
        return 'Sin Comprobante';
    }
  };

  const getReceiptColor = (method) => {
    switch (method) {
      case 'email':
        return 'blue';
      case 'whatsapp':
        return 'green';
      default:
        return 'gray';
    }
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Cargando historial...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" pb={20}>
      <Container maxW="container.xl" py={6}>
        <Heading size="lg" mb={6}>Historial de Ventas</Heading>

        {/* Filtros */}
        <HStack spacing={3} mb={6} flexWrap="wrap">
          <HStack spacing={2}>
            <Icon as={MdCalendarToday} color="gray.600" />
            <Button
              size="sm"
              colorScheme={period === 'today' ? 'blue' : 'gray'}
              variant={period === 'today' ? 'solid' : 'outline'}
              onClick={() => setPeriod('today')}
            >
              Hoy
            </Button>
            <Button
              size="sm"
              colorScheme={period === 'week' ? 'blue' : 'gray'}
              variant={period === 'week' ? 'solid' : 'outline'}
              onClick={() => setPeriod('week')}
            >
              Semana
            </Button>
            <Button
              size="sm"
              colorScheme={period === 'month' ? 'blue' : 'gray'}
              variant={period === 'month' ? 'solid' : 'outline'}
              onClick={() => setPeriod('month')}
            >
              Mes
            </Button>
          </HStack>

          {/* 👇 NUEVO: Filtro por método de pago */}
          <HStack spacing={2}>
            <Icon as={MdFilterList} color="gray.600" />
            <Select
              size="sm"
              w="200px"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">Todos los pagos</option>
              <option value="efectivo">Solo Efectivo</option>
              <option value="transferencia">Solo Transferencia</option>
            </Select>
          </HStack>
        </HStack>

        {/* Estadísticas */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6} mb={8}>
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4}>
              <Box bg="purple.100" p={3} borderRadius="lg">
                <Icon as={MdShoppingCart} boxSize={8} color="purple.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Total Ventas</StatLabel>
                <StatNumber fontSize="3xl">{stats.totalVentas}</StatNumber>
                <StatHelpText>{stats.totalProductos} productos</StatHelpText>
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
                <StatNumber fontSize="3xl">${stats.totalMonto}</StatNumber>
                <StatHelpText>
                  {period === 'today' ? 'Hoy' : period === 'week' ? 'Esta semana' : 'Este mes'}
                </StatHelpText>
              </Stat>
            </HStack>
          </Box>

          {/* 👇 NUEVO: Estadísticas de Efectivo */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4}>
              <Box bg="green.100" p={3} borderRadius="lg">
                <Icon as={MdAttachMoney} boxSize={8} color="green.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Efectivo</StatLabel>
                <StatNumber fontSize="2xl">${stats.byPaymentMethod.efectivo.total}</StatNumber>
                <StatHelpText>{stats.byPaymentMethod.efectivo.count} ventas</StatHelpText>
              </Stat>
            </HStack>
          </Box>

          {/* Estadísticas de Transferencia */}
          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" border="1px" borderColor="gray.100">
            <HStack spacing={4}>
              <Box bg="blue.100" p={3} borderRadius="lg">
                <Icon as={MdCreditCard} boxSize={8} color="blue.600" />
              </Box>
              <Stat>
                <StatLabel color="gray.600">Transferencia</StatLabel>
                <StatNumber fontSize="2xl">${stats.byPaymentMethod.transferencia.total}</StatNumber>
                <StatHelpText>{stats.byPaymentMethod.transferencia.count} ventas</StatHelpText>
              </Stat>
            </HStack>
          </Box>
        </SimpleGrid>

        {/* Lista de ventas */}
        {sales.length === 0 ? (
          <Box textAlign="center" py={12} bg="white" borderRadius="xl">
            <Icon as={MdShoppingCart} boxSize={16} color="gray.300" mb={4} />
            <Text fontSize="xl" color="gray.500" mb={2}>
              No hay ventas registradas
            </Text>
            <Text fontSize="sm" color="gray.400">
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
                bg="white"
                p={5}
                borderRadius="xl"
                boxShadow="sm"
                border="1px"
                borderColor="gray.100"
                _hover={{ boxShadow: 'md', cursor: 'pointer' }}
                transition="all 0.2s"
                onClick={() => handleViewDetails(sale)}
              >
                <HStack justify="space-between" mb={3}>
                  <VStack align="start" spacing={1}>
                    <HStack>
                      <Icon as={MdReceipt} color="blue.500" />
                      <Text fontWeight="bold" fontSize="lg">
                        Ticket #{sale.ticketNumber}
                      </Text>
                      <Badge colorScheme={sale.status === 'completada' ? 'green' : 'red'}>
                        {sale.status}
                      </Badge>
                    </HStack>
                    <HStack spacing={4} fontSize="sm" color="gray.600">
                      <Text>{formatDate(sale.createdAt)}</Text>
                      <Text>{formatTime(sale.createdAt)}</Text>
                    </HStack>
                  </VStack>

                  <VStack align="end" spacing={1}>
                    <Text fontSize="2xl" fontWeight="bold" color="green.600">
                      ${sale.total}
                    </Text>
                    {/* Badge de método de pago */}
                    <Badge
                      colorScheme={getPaymentColor(sale.paymentMethod)}
                      fontSize="xs"
                      px={2}
                      py={1}
                    >
                      <HStack spacing={1}>
                        <Icon as={getPaymentIcon(sale.paymentMethod)} />
                        <Text>{getPaymentLabel(sale.paymentMethod)}</Text>
                      </HStack>
                    </Badge>
                  </VStack>
                </HStack>

                <HStack justify="space-between" fontSize="sm" color="gray.600">
                  <Text>{sale.products.length} producto{sale.products.length > 1 ? 's' : ''}</Text>
                  
                  {/* Badge de comprobante */}
                  <Badge
                    colorScheme={getReceiptColor(sale.receiptSent)}
                    fontSize="xs"
                    px={2}
                    py={1}
                  >
                    <HStack spacing={1}>
                      <Icon as={getReceiptIcon(sale.receiptSent)} boxSize={3} />
                      <Text>{getReceiptLabel(sale.receiptSent)}</Text>
                    </HStack>
                  </Badge>
                </HStack>
              </Box>
            ))}
          </VStack>
        )}
      </Container>

      {/* Modal de detalles de venta */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            <HStack justify="space-between">
              <Text>Detalles de Venta</Text>
              {selectedSale?.status === 'completada' && (
                <IconButton
                  mr='30px'
                  icon={<Icon as={MdDelete} />}
                  colorScheme="red"
                  variant="ghost"
                  onClick={() => handleCancelSale(selectedSale._id)}
                  aria-label="Cancelar venta"
                />
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedSale && (
              <VStack spacing={4} align="stretch">
                {/* Info general */}
                <Box bg="blue.50" p={4} borderRadius="lg">
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color="gray.600">Ticket:</Text>
                    <Text fontWeight="bold">#{selectedSale.ticketNumber}</Text>
                  </HStack>
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="sm" color="gray.600">Fecha:</Text>
                    <Text>{formatDate(selectedSale.createdAt)} - {formatTime(selectedSale.createdAt)}</Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text fontSize="sm" color="gray.600">Estado:</Text>
                    <Badge colorScheme={selectedSale.status === 'completada' ? 'green' : 'red'}>
                      {selectedSale.status}
                    </Badge>
                  </HStack>
                </Box>

                {/* 👇 NUEVO: Método de pago y comprobante */}
                <SimpleGrid columns={2} spacing={4}>
                  <Box bg="gray.50" p={4} borderRadius="lg">
                    <Text fontSize="sm" color="gray.600" mb={2}>Método de Pago:</Text>
                    <Badge
                      colorScheme={getPaymentColor(selectedSale.paymentMethod)}
                      fontSize="md"
                      px={3}
                      py={2}
                    >
                      <HStack>
                        <Icon as={getPaymentIcon(selectedSale.paymentMethod)} />
                        <Text>{getPaymentLabel(selectedSale.paymentMethod)}</Text>
                      </HStack>
                    </Badge>
                  </Box>

                  <Box bg="gray.50" p={4} borderRadius="lg">
                    <Text fontSize="sm" color="gray.600" mb={2}>Comprobante:</Text>
                    <Badge
                      colorScheme={getReceiptColor(selectedSale.receiptSent)}
                      fontSize="md"
                      px={3}
                      py={2}
                    >
                      <HStack>
                        <Icon as={getReceiptIcon(selectedSale.receiptSent)} />
                        <Text>{getReceiptLabel(selectedSale.receiptSent)}</Text>
                      </HStack>
                    </Badge>
                  </Box>
                </SimpleGrid>

                {/* Productos */}
                <Box>
                  <Text fontWeight="semibold" mb={3}>Productos Vendidos:</Text>
                  <VStack spacing={2} align="stretch">
                    {selectedSale.products.map((item, index) => (
                      <Box key={index} p={3} bg="gray.50" borderRadius="lg">
                        <HStack justify="space-between" mb={1}>
                          <Text fontWeight="semibold">{item.name}</Text>
                          <Text fontWeight="bold" color="blue.600">
                            ${item.subtotal}
                          </Text>
                        </HStack>
                        <HStack justify="space-between" fontSize="sm" color="gray.600">
                          <Text>{item.quantity} x ${item.price}</Text>
                          <Text>Código: {item.barcode}</Text>
                        </HStack>
                      </Box>
                    ))}
                  </VStack>
                </Box>

                <Divider />

                {/* Total */}
                <HStack justify="space-between" bg="green.50" p={4} borderRadius="lg">
                  <Text fontSize="lg" fontWeight="semibold">Total:</Text>
                  <Text fontSize="3xl" fontWeight="bold" color="green.600">
                    ${selectedSale.total}
                  </Text>
                </HStack>

                {/* Cliente */}
                {(selectedSale.customer?.email || selectedSale.customer?.phone) && (
                  <Box bg="gray.50" p={4} borderRadius="lg">
                    <Text fontWeight="semibold" mb={2}>Información del Cliente:</Text>
                    {selectedSale.customer.email && (
                      <HStack mb={1}>
                        <Icon as={MdEmail} color="blue.500" />
                        <Text fontSize="sm">{selectedSale.customer.email}</Text>
                      </HStack>
                    )}
                    {selectedSale.customer.phone && (
                      <HStack>
                        <Icon as={MdWhatsapp} color="green.500" />
                        <Text fontSize="sm">{selectedSale.customer.phone}</Text>
                      </HStack>
                    )}
                  </Box>
                )}

                {selectedSale.status === 'cancelada' && (
                  <Alert status="error" borderRadius="lg">
                    <AlertIcon />
                    Esta venta fue cancelada. El stock ha sido restaurado.
                  </Alert>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default History;