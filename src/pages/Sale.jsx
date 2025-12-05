import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  VStack,
  HStack,
  useToast,
  Flex,
  Icon,
  IconButton,
  Badge,
  Divider,
  FormControl,
  FormLabel,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  SimpleGrid,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  MdSearch,
  MdAdd,
  MdRemove,
  MdDelete,
  MdShoppingCart,
  MdEmail,
  MdAttachMoney,
  MdCamera,
  MdDownload,
} from 'react-icons/md';
import { productsAPI } from '../api/products';
import { salesAPI } from '../api/sales';
import { useAuth } from '../context/AuthContext';
import { pdfGenerator } from '../utils/pdfGenerator';
import { useBarcode } from '../hooks/useBarcode';
import BarcodeCameraScanner from '../components/BarcodeCameraScanner';

const Sale = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customerEmail, setCustomerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [receiptMethod, setReceiptMethod] = useState('none');
  const [downloadPDF, setDownloadPDF] = useState(false);
  const { store } = useAuth();

  const { isOpen, onOpen, onClose } = useDisclosure();
  const {
    isOpen: isScannerOpen,
    onOpen: openScanner,
    onClose: closeScanner
  } = useDisclosure();
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, products]);

  // ESCÁNER FÍSICO - para escáneres USB/bluetooth
  useBarcode((barcode) => {
    handleBarcodeDetected(barcode);
  }, { minLength: 8, maxLength: 50 });

  const handleBarcodeDetected = (barcode) => {
    // Buscar el producto por código de barras
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      addToCart(product);
      toast({
        title: 'Producto agregado',
        description: `${product.name} agregado al carrito`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    } else {
      // Si no se encuentra, buscar por coincidencia parcial
      setSearchTerm(barcode);
      toast({
        title: 'Código escaneado',
        description: barcode,
        status: 'info',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data.filter(p => p.stock > 0));
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const filterProducts = () => {
    if (!searchTerm) {
      setFilteredProducts([]);
      return;
    }

    const filtered = products.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode.includes(searchTerm)
    );

    setFilteredProducts(filtered.slice(0, 5));
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item._id === product._id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast({
          title: 'Stock insuficiente',
          description: `Solo hay ${product.stock} unidades disponibles`,
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setCart(cart.map(item =>
        item._id === product._id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }

    setSearchTerm('');
    setFilteredProducts([]);
  };

  const updateQuantity = (productId, change) => {
    const item = cart.find(i => i._id === productId);
    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > item.stock) {
      toast({
        title: 'Stock insuficiente',
        description: `Solo hay ${item.stock} unidades disponibles`,
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setCart(cart.map(i =>
      i._id === productId ? { ...i, quantity: newQuantity } : i
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item._id !== productId));
  };

  const clearCart = () => {
    if (window.confirm('¿Deseas cancelar esta venta?')) {
      setCart([]);
      setCustomerEmail('');
    }
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      toast({
        title: 'Carrito vacío',
        description: 'Agrega productos para realizar una venta',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (receiptMethod === 'email' && !customerEmail) {
      toast({
        title: 'Email requerido',
        description: 'Debes ingresar el email del cliente',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setLoading(true);

      const saleData = {
        products: cart.map(item => ({
          productId: item._id,
          quantity: item.quantity,
        })),
        customer: {
          email: customerEmail || undefined,
        },
        paymentMethod,
        receiptSent: receiptMethod,
      };

      const response = await salesAPI.create(saleData);

      // Generar PDF si está marcada la opción
      if (downloadPDF) {
        const saleWithProducts = {
          ...response.data,
          products: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.price * item.quantity
          }))
        };

        const pdfResult = pdfGenerator.generateReceipt(saleWithProducts, store);
        
        if (!pdfResult.success) {
          toast({
            title: 'Error al generar PDF',
            description: pdfResult.error || 'No se pudo generar el comprobante',
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      }

      let receiptMessage = '';
      if (receiptMethod === 'email') {
        receiptMessage = ' y comprobante enviado por Email';
      }
      if (downloadPDF) {
        receiptMessage += ' (PDF descargado)';
      }

      toast({
        title: '¡Venta completada!',
        description: `Ticket #${response.data.ticketNumber}${receiptMessage}`,
        status: 'success',
        duration: 5000,
        isClosable: true,
      });

      setCart([]);
      setCustomerEmail('');
      setPaymentMethod('efectivo');
      setReceiptMethod('none');
      setDownloadPDF(false);
      onClose();

      loadProducts();

      setTimeout(() => {
        navigate('/history');
      }, 2000);

    } catch (error) {
      console.error('Error al crear venta:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo completar la venta',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" pb={20}>
      <Box bg="white" borderBottom="1px" borderColor="gray.200" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <Heading size="lg" mb={1}>Nueva Venta</Heading>
          <Text color="gray.600" fontSize="sm">
            Agrega productos al carrito
          </Text>
        </Container>
      </Box>

      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <VStack spacing={4} align="stretch">
            <Box bg="white" p={6} borderRadius="xl" boxShadow="sm">
              <InputGroup size="lg" mb={4}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={MdSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Buscar producto por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </InputGroup>

              <Button
                w="full"
                leftIcon={<Icon as={MdCamera} />}
                colorScheme="purple"
                variant="outline"
                size="lg"
                onClick={openScanner}
              >
                Escanear Código de Barras
              </Button>
            </Box>

            {filteredProducts.length > 0 && (
              <Box bg="white" p={4} borderRadius="xl" boxShadow="sm">
                <Text fontWeight="semibold" mb={3}>Resultados:</Text>
                <VStack spacing={2} align="stretch">
                  {filteredProducts.map(product => (
                    <Box
                      key={product._id}
                      p={3}
                      bg="gray.50"
                      borderRadius="lg"
                      _hover={{ bg: 'gray.100' }}
                      cursor="pointer"
                      onClick={() => addToCart(product)}
                    >
                      <HStack justify="space-between">
                        <HStack>
                          {product.image && (
                            <Text fontSize="2xl">{product.image}</Text>
                          )}
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold">{product.name}</Text>
                            <Text fontSize="xs" color="gray.600">
                              Stock: {product.stock}
                            </Text>
                          </VStack>
                        </HStack>
                        <Text fontWeight="bold" color="blue.600">
                          ${product.price}
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {searchTerm && filteredProducts.length === 0 && (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                No se encontraron productos
              </Alert>
            )}
          </VStack>

          <Box bg="white" p={6} borderRadius="xl" boxShadow="sm" position="sticky" top="20px" h="fit-content">
            <HStack justify="space-between" mb={4}>
              <HStack>
                <Icon as={MdShoppingCart} boxSize={6} color="blue.600" />
                <Heading size="md">Carrito</Heading>
              </HStack>
              {cart.length > 0 && (
                <Badge colorScheme="blue" fontSize="md" px={2} py={1}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </Badge>
              )}
            </HStack>

            <Divider mb={4} />

            {cart.length === 0 ? (
              <Box textAlign="center" py={12}>
                <Icon as={MdShoppingCart} boxSize={16} color="gray.300" mb={4} />
                <Text color="gray.500">El carrito está vacío</Text>
                <Text fontSize="sm" color="gray.400" mt={2}>
                  Busca y agrega productos para comenzar
                </Text>
              </Box>
            ) : (
              <>
                <VStack spacing={3} mb={4} maxH="400px" overflowY="auto">
                  {cart.map(item => (
                    <Box
                      key={item._id}
                      w="full"
                      p={3}
                      bg="gray.50"
                      borderRadius="lg"
                    >
                      <HStack justify="space-between" mb={2}>
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="semibold" fontSize="sm">
                            {item.name}
                          </Text>
                          <Text fontSize="xs" color="gray.600">
                            ${item.price} c/u
                          </Text>
                        </VStack>
                        <Text fontWeight="bold" color="blue.600">
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </HStack>

                      <HStack justify="space-between">
                        <HStack>
                          <IconButton
                            size="sm"
                            icon={<Icon as={MdRemove} />}
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => updateQuantity(item._id, -1)}
                            aria-label="Disminuir"
                          />
                          <Text fontWeight="bold" minW="30px" textAlign="center">
                            {item.quantity}
                          </Text>
                          <IconButton
                            size="sm"
                            icon={<Icon as={MdAdd} />}
                            colorScheme="green"
                            variant="ghost"
                            onClick={() => updateQuantity(item._id, 1)}
                            aria-label="Aumentar"
                          />
                        </HStack>
                        <IconButton
                          size="sm"
                          icon={<Icon as={MdDelete} />}
                          colorScheme="red"
                          variant="ghost"
                          onClick={() => removeFromCart(item._id)}
                          aria-label="Eliminar"
                        />
                      </HStack>
                    </Box>
                  ))}
                </VStack>

                <Divider mb={4} />

                <Box bg="blue.50" p={4} borderRadius="lg" mb={4}>
                  <HStack justify="space-between">
                    <Text fontSize="lg" fontWeight="semibold">
                      Total a Pagar:
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="blue.600">
                      ${calculateTotal().toFixed(2)}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} productos
                  </Text>
                </Box>

                <VStack spacing={3}>
                  <Button
                    w="full"
                    size="lg"
                    colorScheme="blue"
                    onClick={onOpen}
                  >
                    Completar Venta
                  </Button>
                  <Button
                    w="full"
                    size="lg"
                    variant="outline"
                    colorScheme="red"
                    onClick={clearCart}
                  >
                    Cancelar Venta
                  </Button>
                </VStack>
              </>
            )}
          </Box>
        </SimpleGrid>
      </Container>

      {/* Modal para completar venta */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent w={['95%', '500px']}>
          <ModalHeader>Completar Venta</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Box w="full" bg="blue.50" p={4} borderRadius="lg">
                <Text fontSize="sm" color="gray.600" mb={1}>Total:</Text>
                <Text fontSize="3xl" fontWeight="bold" color="blue.600">
                  ${calculateTotal().toFixed(2)}
                </Text>
              </Box>

              <Divider />

              <FormControl isRequired>
                <FormLabel fontWeight="semibold">Método de Pago</FormLabel>
                <VStack spacing={2}>
                  <Button
                    w="full"
                    size="lg"
                    variant={paymentMethod === 'efectivo' ? 'solid' : 'outline'}
                    colorScheme={paymentMethod === 'efectivo' ? 'green' : 'gray'}
                    leftIcon={<Icon as={MdAttachMoney} />}
                    onClick={() => setPaymentMethod('efectivo')}
                  >
                    Efectivo
                  </Button>
                  <Button
                    w="full"
                    size="lg"
                    variant={paymentMethod === 'transferencia' ? 'solid' : 'outline'}
                    colorScheme={paymentMethod === 'transferencia' ? 'blue' : 'gray'}
                    leftIcon={<Icon as={MdAttachMoney} />}
                    onClick={() => setPaymentMethod('transferencia')}
                  >
                    Transferencia / Tarjeta
                  </Button>
                </VStack>
              </FormControl>

              <Divider />

              <FormControl>
                <FormLabel fontWeight="semibold">Opciones de Comprobante</FormLabel>

                {/* Opción de descargar PDF */}
                <Button
                  w="full"
                  mb={3}
                  leftIcon={<Icon as={MdDownload} />}
                  variant={downloadPDF ? 'solid' : 'outline'}
                  colorScheme={downloadPDF ? 'purple' : 'gray'}
                  onClick={() => setDownloadPDF(!downloadPDF)}
                >
                  {downloadPDF ? 'PDF Marcado para Descarga' : 'Descargar Comprobante PDF'}
                </Button>

                <FormControl mb={3}>
                  <FormLabel fontSize="sm">Email del Cliente (Opcional)</FormLabel>
                  <Input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                  />
                </FormControl>

                <VStack spacing={2}>
                  <Button
                    w="full"
                    variant={receiptMethod === 'none' ? 'solid' : 'outline'}
                    colorScheme={receiptMethod === 'none' ? 'gray' : 'gray'}
                    onClick={() => setReceiptMethod('none')}
                  >
                    Sin Envío por Email
                  </Button>
                  <Button
                    w="full"
                    leftIcon={<Icon as={MdEmail} />}
                    variant={receiptMethod === 'email' ? 'solid' : 'outline'}
                    colorScheme={receiptMethod === 'email' ? 'blue' : 'gray'}
                    onClick={() => setReceiptMethod('email')}
                    isDisabled={!customerEmail}
                  >
                    Enviar por Email
                  </Button>
                </VStack>
              </FormControl>

              <Button
                w="full"
                size="lg"
                colorScheme="purple"
                onClick={handleCompleteSale}
                isLoading={loading}
              >
                Confirmar Venta
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Scanner de Código de Barras por Cámara */}
      <BarcodeCameraScanner
        isOpen={isScannerOpen}
        onClose={closeScanner}
        onBarcodeDetected={handleBarcodeDetected}
      />
    </Box>
  );
};

export default Sale;