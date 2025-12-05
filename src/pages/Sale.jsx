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
    <Box minH="100vh" bg="black" bgGradient="linear(to-b, black, purple.900)" pb={20}>
      <Box bg="gray.800" borderBottom="1px" borderColor="gray.700" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <Heading size="lg" mb={1} color="white">Nueva Venta</Heading>
          <Text color="gray.400" fontSize="sm">
            Agrega productos al carrito
          </Text>
        </Container>
      </Box>

      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
          <VStack spacing={4} align="stretch">
            <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
              <InputGroup size="lg" mb={4}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={MdSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Buscar producto por nombre o código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  bg="gray.700"
                  border="none"
                  color="white"
                  _placeholder={{ color: 'gray.400' }}
                  _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                  _hover={{ bg: 'gray.700' }}
                />
              </InputGroup>

              <Button
                w="full"
                leftIcon={<Icon as={MdCamera} />}
                bgGradient="linear(to-r, purple.500, purple.600)"
                color="white"
                variant="outline"
                borderColor="purple.500"
                size="lg"
                _hover={{
                  bgGradient: 'linear(to-r, purple.600, purple.700)',
                }}
                onClick={openScanner}
              >
                Escanear Código de Barras
              </Button>
            </Box>

            {filteredProducts.length > 0 && (
              <Box bg="gray.800" p={4} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700">
                <Text fontWeight="semibold" mb={3} color="white">Resultados:</Text>
                <VStack spacing={2} align="stretch">
                  {filteredProducts.map(product => (
                    <Box
                      key={product._id}
                      p={3}
                      bg="gray.700"
                      borderRadius="lg"
                      _hover={{ bg: 'gray.600' }}
                      cursor="pointer"
                      onClick={() => addToCart(product)}
                    >
                      <HStack justify="space-between">
                        <HStack>
                          {product.image && (
                            <Text fontSize="2xl">{product.image}</Text>
                          )}
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold" color="white">{product.name}</Text>
                            <Text fontSize="xs" color="gray.400">
                              Stock: {product.stock}
                            </Text>
                          </VStack>
                        </HStack>
                        <Text fontWeight="bold" color="purple.400">
                          ${product.price}
                        </Text>
                      </HStack>
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {searchTerm && filteredProducts.length === 0 && (
              <Alert status="info" borderRadius="lg" bg="gray.800" borderColor="blue.500">
                <AlertIcon color="blue.400" />
                <Text color="white">No se encontraron productos</Text>
              </Alert>
            )}
          </VStack>

          <Box bg="gray.800" p={6} borderRadius="xl" boxShadow="2xl" border="1px" borderColor="gray.700" position="sticky" top="20px" h="fit-content">
            <HStack justify="space-between" mb={4}>
              <HStack>
                <Icon as={MdShoppingCart} boxSize={6} color="purple.400" />
                <Heading size="md" color="white">Carrito</Heading>
              </HStack>
              {cart.length > 0 && (
                <Badge bg="purple.500" color="white" fontSize="md" px={2} py={1}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </Badge>
              )}
            </HStack>

            <Divider mb={4} borderColor="gray.600" />

            {cart.length === 0 ? (
              <Box textAlign="center" py={12}>
                <Icon as={MdShoppingCart} boxSize={16} color="gray.600" mb={4} />
                <Text color="gray.400">El carrito está vacío</Text>
                <Text fontSize="sm" color="gray.500" mt={2}>
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
                      bg="gray.700"
                      borderRadius="lg"
                    >
                      <HStack justify="space-between" mb={2}>
                        <VStack align="start" spacing={0} flex={1}>
                          <Text fontWeight="semibold" fontSize="sm" color="white">
                            {item.name}
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            ${item.price} c/u
                          </Text>
                        </VStack>
                        <Text fontWeight="bold" color="purple.400">
                          ${(item.price * item.quantity).toFixed(2)}
                        </Text>
                      </HStack>

                      <HStack justify="space-between">
                        <HStack>
                          <IconButton
                            size="sm"
                            icon={<Icon as={MdRemove} />}
                            color="red.400"
                            variant="ghost"
                            _hover={{ bg: 'gray.600' }}
                            onClick={() => updateQuantity(item._id, -1)}
                            aria-label="Disminuir"
                          />
                          <Text fontWeight="bold" minW="30px" textAlign="center" color="white">
                            {item.quantity}
                          </Text>
                          <IconButton
                            size="sm"
                            icon={<Icon as={MdAdd} />}
                            color="green.400"
                            variant="ghost"
                            _hover={{ bg: 'gray.600' }}
                            onClick={() => updateQuantity(item._id, 1)}
                            aria-label="Aumentar"
                          />
                        </HStack>
                        <IconButton
                          size="sm"
                          icon={<Icon as={MdDelete} />}
                          color="red.400"
                          variant="ghost"
                          _hover={{ bg: 'gray.600' }}
                          onClick={() => removeFromCart(item._id)}
                          aria-label="Eliminar"
                        />
                      </HStack>
                    </Box>
                  ))}
                </VStack>

                <Divider mb={4} borderColor="gray.600" />

                <Box bg="purple.900" p={4} borderRadius="lg" mb={4} border="1px" borderColor="purple.700">
                  <HStack justify="space-between">
                    <Text fontSize="lg" fontWeight="semibold" color="white">
                      Total a Pagar:
                    </Text>
                    <Text fontSize="3xl" fontWeight="bold" color="purple.300">
                      ${calculateTotal().toFixed(2)}
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="gray.400" mt={1}>
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} productos
                  </Text>
                </Box>

                <VStack spacing={3}>
                  <Button
                    w="full"
                    size="lg"
                    bgGradient="linear(to-r, purple.500, purple.600)"
                    color="white"
                    _hover={{
                      bgGradient: 'linear(to-r, purple.600, purple.700)',
                    }}
                    onClick={onOpen}
                  >
                    Completar Venta
                  </Button>
                  <Button
                    w="full"
                    size="lg"
                    variant="outline"
                    borderColor="gray.600"
                    color="red.400"
                    _hover={{ bg: 'gray.700', borderColor: 'red.500' }}
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
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent w={['95%', '500px']} bg="gray.800" border="1px" borderColor="gray.700">
          <ModalHeader color="white">Completar Venta</ModalHeader>
          <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} />
          <ModalBody pb={6}>
            <VStack spacing={4}>
              <Box w="full" bg="purple.900" p={4} borderRadius="lg" border="1px" borderColor="purple.700">
                <Text fontSize="sm" color="gray.400" mb={1}>Total:</Text>
                <Text fontSize="3xl" fontWeight="bold" color="purple.300">
                  ${calculateTotal().toFixed(2)}
                </Text>
              </Box>

              <Divider borderColor="gray.600" />

              <FormControl isRequired>
                <FormLabel fontWeight="semibold" color="white">Método de Pago</FormLabel>
                <VStack spacing={2}>
                  <Button
                    w="full"
                    size="lg"
                    variant={paymentMethod === 'efectivo' ? 'solid' : 'outline'}
                    bg={paymentMethod === 'efectivo' ? 'green.500' : 'transparent'}
                    color={paymentMethod === 'efectivo' ? 'white' : 'gray.400'}
                    borderColor={paymentMethod === 'efectivo' ? 'green.500' : 'gray.600'}
                    _hover={paymentMethod === 'efectivo' ? { bg: 'green.600' } : { bg: 'gray.700', borderColor: 'green.500', color: 'white' }}
                    leftIcon={<Icon as={MdAttachMoney} />}
                    onClick={() => setPaymentMethod('efectivo')}
                  >
                    Efectivo
                  </Button>
                  <Button
                    w="full"
                    size="lg"
                    variant={paymentMethod === 'transferencia' ? 'solid' : 'outline'}
                    bg={paymentMethod === 'transferencia' ? 'blue.500' : 'transparent'}
                    color={paymentMethod === 'transferencia' ? 'white' : 'gray.400'}
                    borderColor={paymentMethod === 'transferencia' ? 'blue.500' : 'gray.600'}
                    _hover={paymentMethod === 'transferencia' ? { bg: 'blue.600' } : { bg: 'gray.700', borderColor: 'blue.500', color: 'white' }}
                    leftIcon={<Icon as={MdAttachMoney} />}
                    onClick={() => setPaymentMethod('transferencia')}
                  >
                    Transferencia / Tarjeta
                  </Button>
                </VStack>
              </FormControl>

              <Divider borderColor="gray.600" />

              <FormControl>
                <FormLabel fontWeight="semibold" color="white">Opciones de Comprobante</FormLabel>

                {/* Opción de descargar PDF */}
                <Button
                  w="full"
                  mb={3}
                  leftIcon={<Icon as={MdDownload} />}
                  variant={downloadPDF ? 'solid' : 'outline'}
                  bg={downloadPDF ? 'purple.500' : 'transparent'}
                  color={downloadPDF ? 'white' : 'gray.400'}
                  borderColor={downloadPDF ? 'purple.500' : 'gray.600'}
                  _hover={downloadPDF ? { bg: 'purple.600' } : { bg: 'gray.700', borderColor: 'purple.500', color: 'white' }}
                  onClick={() => setDownloadPDF(!downloadPDF)}
                >
                  {downloadPDF ? 'PDF Marcado para Descarga' : 'Descargar Comprobante PDF'}
                </Button>

                <FormControl mb={3}>
                  <FormLabel fontSize="sm" color="white">Email del Cliente (Opcional)</FormLabel>
                  <Input
                    type="email"
                    placeholder="cliente@ejemplo.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                    _hover={{ bg: 'gray.700' }}
                  />
                </FormControl>

                <VStack spacing={2}>
                  <Button
                    w="full"
                    variant={receiptMethod === 'none' ? 'solid' : 'outline'}
                    bg={receiptMethod === 'none' ? 'gray.600' : 'transparent'}
                    color={receiptMethod === 'none' ? 'white' : 'gray.400'}
                    borderColor="gray.600"
                    _hover={{ bg: 'gray.700', borderColor: 'gray.500', color: 'white' }}
                    onClick={() => setReceiptMethod('none')}
                  >
                    Sin Envío por Email
                  </Button>
                  <Button
                    w="full"
                    leftIcon={<Icon as={MdEmail} />}
                    variant={receiptMethod === 'email' ? 'solid' : 'outline'}
                    bg={receiptMethod === 'email' ? 'blue.500' : 'transparent'}
                    color={receiptMethod === 'email' ? 'white' : 'gray.400'}
                    borderColor={receiptMethod === 'email' ? 'blue.500' : 'gray.600'}
                    _hover={receiptMethod === 'email' ? { bg: 'blue.600' } : { bg: 'gray.700', borderColor: 'blue.500', color: 'white' }}
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
                bgGradient="linear(to-r, purple.500, purple.600)"
                color="white"
                _hover={{
                  bgGradient: 'linear(to-r, purple.600, purple.700)',
                }}
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