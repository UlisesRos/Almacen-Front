import { useEffect, useState, useRef } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  SimpleGrid,
  VStack,
  HStack,
  Badge,
  useToast,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Select,
  Spinner,
  Flex,
  Icon,
  IconButton,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import {
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdWarning,
  MdCamera,
} from 'react-icons/md';
import { productsAPI } from '../api/products';
import { useBarcode } from '../hooks/useBarcode';
import BarcodeCameraScanner from '../components/BarcodeCameraScanner';
import { storageService } from '../utils/storageService';
import { syncService } from '../utils/syncService';

const Products = () => {
  
  const emptyForm = {
    barcode: '',
    name: '',
    price: '',
    stock: '',
    minStock: '',
    category: '',
    image: '',
    expirationDate: '',
  };

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Scanner por cámara 
  const {
    isOpen: isScannerOpen,
    onOpen: openScanner,
    onClose: closeScanner
  } = useDisclosure();

  // Estado para indicar el PROPÓSITO del scanner de cámara
  const [scannerPurpose, setScannerPurpose] = useState(null); // 'search' | 'form'

  const categories = ['Todos', 'Bebidas', 'Panadería', 'Almacén', 'Lácteos', 'Snacks', 'Limpieza', 'Otros'];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  // ==========================================
  // ESCÁNER FÍSICO - SOLO para cuando NO hay scanner de cámara abierto
  // ==========================================
  useBarcode((barcode) => {
    // SI el scanner de cámara está abierto, NO hacer nada
    if (isScannerOpen) {
      return;
    }

    // SI estamos en el modal de agregar/editar, actualizar el formulario
    if (isOpen) {
      setFormData(prev => ({ ...prev, barcode }));
      toast({
        title: '🔍 Escáner físico',
        description: `Código: ${barcode}`,
        status: 'success',
        duration: 2000,
        isClosable: true
      });
      return;
    }

    // SI NO estamos en el modal, buscar el producto
    setSearchTerm(barcode);
    const foundProduct = products.find(p => p.barcode === barcode);
    
    if (foundProduct) {
      toast({
        title: '🔍 Producto encontrado',
        description: foundProduct.name,
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    } else {
      toast({
        title: '🔍 Código escaneado',
        description: `${barcode} - No encontrado`,
        status: 'info',
        duration: 3000,
        isClosable: true
      });
    }
  }, { minLength: 8, maxLength: 50 });

  const loadProducts = async () => {
    try {
      setLoading(true);
      const isOnline = syncService.isOnline();
      
      let productsData = [];
      
      if (isOnline) {
        try {
          const response = await productsAPI.getAll();
          productsData = response.data || [];
          storageService.saveProducts(productsData);
        } catch (error) {
          console.error('Error al cargar productos del servidor:', error);
          const cachedProducts = storageService.getProducts();
          if (cachedProducts && cachedProducts.length > 0) {
            productsData = cachedProducts;
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
        const cachedProducts = storageService.getProducts();
        if (cachedProducts && cachedProducts.length > 0) {
          productsData = cachedProducts;
          toast({
            title: 'Modo offline',
            description: 'Usando datos del caché local',
            status: 'info',
            duration: 3000,
            isClosable: true,
          });
        } else {
          toast({
            title: 'Sin datos',
            description: 'No hay conexión y no hay datos en caché',
            status: 'warning',
            duration: 5000,
            isClosable: true,
          });
        }
      }

      const ordered = [...productsData].sort((a, b) => {
        const aHas = !!a.expirationDate;
        const bHas = !!b.expirationDate;

        if (!aHas && !bHas) return 0;
        if (!aHas) return 1;
        if (!bHas) return -1;

        const aDays = a.daysUntilExpiration;
        const bDays = b.daysUntilExpiration;

        return aDays - bDays;
      });

      setProducts(ordered);
      setFilteredProducts(ordered);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los productos',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;
    
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
      );
    }

    if (
      selectedCategory !== 'Todos' &&
      selectedCategory !== 'PorVencer' &&
      selectedCategory !== 'Vencidos' &&
      selectedCategory !== 'LowStock'
    ) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (selectedCategory === 'PorVencer') {
      filtered = filtered.filter(p => p.isNearExpiration);
    }

    if (selectedCategory === 'Vencidos') {
      filtered = filtered.filter(p => p.isExpired);
    }

    if (selectedCategory === 'LowStock') {
      filtered = filtered.filter(p => p.isLowStock === true);
    }

    filtered = filtered.sort((a, b) => {
      const aHasDate = !!a.expirationDate;
      const bHasDate = !!b.expirationDate;

      if (!aHasDate && !bHasDate) return 0;
      if (!aHasDate) return 1;
      if (!bHasDate) return -1;

      const aDays = a.daysUntilExpiration;
      const bDays = b.daysUntilExpiration;
      
      return aDays - bDays;
    });

    setFilteredProducts(filtered);
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        barcode: product.barcode,
        name: product.name,
        price: product.price,
        stock: product.stock,
        minStock: product.minStock,
        category: product.category,
        image: product.image || '',
        expirationDate: product.expirationDate
          ? product.expirationDate.substring(0, 10)
          : '',
      });
    } else {
      setSelectedProduct(null);
      setFormData(emptyForm);
    }
    onOpen();
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setFormData(emptyForm);
    onClose();
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isOnline = syncService.isOnline();

    try {
      if (selectedProduct) {
        if (isOnline) {
          try {
            await productsAPI.update(selectedProduct._id, formData);
            toast({
              title: 'Producto actualizado',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
          } catch (error) {
            storageService.addPendingProduct(
              { ...formData, _id: selectedProduct._id },
              'update'
            );
            toast({
              title: 'Producto guardado localmente',
              description: 'Se sincronizará cuando vuelva la conexión',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          }
        } else {
          storageService.addPendingProduct(
            { ...formData, _id: selectedProduct._id },
            'update'
          );
          toast({
            title: 'Producto guardado localmente',
            description: 'Se sincronizará cuando vuelva la conexión',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        if (isOnline) {
          try {
            const response = await productsAPI.create(formData);
            toast({
              title: 'Producto creado',
              status: 'success',
              duration: 3000,
              isClosable: true,
            });
            const currentProducts = storageService.getProducts() || [];
            storageService.saveProducts([...currentProducts, response.data.product || response.data]);
          } catch (error) {
            storageService.addPendingProduct(formData, 'create');
            toast({
              title: 'Producto guardado localmente',
              description: 'Se sincronizará cuando vuelva la conexión',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          }
        } else {
          storageService.addPendingProduct(formData, 'create');
          toast({
            title: 'Producto guardado localmente',
            description: 'Se sincronizará cuando vuelva la conexión',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
        }
      }

      handleCloseModal();
      loadProducts();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'No se pudo guardar el producto',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) {
      return;
    }

    const isOnline = syncService.isOnline();
    const product = products.find(p => p._id === productId);

    try {
      if (isOnline) {
        try {
          await productsAPI.delete(productId);
          toast({
            title: 'Producto eliminado',
            status: 'success',
            duration: 3000,
            isClosable: true,
          });
          const currentProducts = storageService.getProducts() || [];
          storageService.saveProducts(currentProducts.filter(p => p._id !== productId));
        } catch (error) {
          if (product) {
            storageService.addPendingProduct(product, 'delete');
            toast({
              title: 'Eliminación guardada localmente',
              description: 'Se sincronizará cuando vuelva la conexión',
              status: 'warning',
              duration: 5000,
              isClosable: true,
            });
          }
        }
      } else {
        if (product) {
          storageService.addPendingProduct(product, 'delete');
          toast({
            title: 'Eliminación guardada localmente',
            description: 'Se sincronizará cuando vuelva la conexión',
            status: 'info',
            duration: 5000,
            isClosable: true,
          });
        }
      }

      const updatedProducts = products.filter(p => p._id !== productId);
      setProducts(updatedProducts);
      setFilteredProducts(updatedProducts);
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el producto',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // ==========================================
  // FUNCIONES PARA ABRIR SCANNER DE CÁMARA
  // ==========================================
  
  // Abrir scanner para BUSCAR
  const handleOpenScannerForSearch = () => {
    setScannerPurpose('search');
    openScanner();
  };

  // Abrir scanner para FORMULARIO
  const handleOpenScannerForForm = () => {
    setScannerPurpose('form');
    openScanner();
  };

  // ==========================================
  // MANEJAR CÓDIGO DETECTADO POR CÁMARA
  // ==========================================
  const handleCameraBarcodeDetected = (barcode) => {
    closeScanner();

    // Según el propósito del scanner
    if (scannerPurpose === 'form') {
      // AGREGAR AL FORMULARIO
      setFormData(prev => ({ ...prev, barcode }));
      toast({
        title: '📷 Código escaneado',
        description: barcode,
        status: 'success',
        duration: 2000,
        isClosable: true
      });
    } else if (scannerPurpose === 'search') {
      // BUSCAR PRODUCTO
      setSearchTerm(barcode);
      const foundProduct = products.find(p => p.barcode === barcode);
      
      if (foundProduct) {
        toast({
          title: '📷 Producto encontrado',
          description: foundProduct.name,
          status: 'success',
          duration: 2000,
          isClosable: true
        });
      } else {
        toast({
          title: '📷 Código escaneado',
          description: `${barcode} - No encontrado`,
          status: 'info',
          duration: 3000,
          isClosable: true
        });
      }
    }

    // Resetear el propósito
    setScannerPurpose(null);
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="black" bgGradient="linear(to-b, black, purple.900)">
        <VStack spacing={4}>
          <Spinner size="xl" color="purple.500" thickness="4px" />
          <Text color="white">Cargando productos...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="black" bgGradient="linear(to-b, black, purple.900)" pb={20}>
      {/* Header */}
      <Box bg="gray.800" borderBottom="1px" borderColor="gray.700" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <Flex justify={['center', 'space-between']} align="center" mb={4} flexWrap="wrap">
            <Box>
              <Heading size="lg" mb={2} color="white">Mis Productos</Heading>
              <Text color="gray.400" fontSize="sm">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} en inventario
              </Text>
            </Box>
            <HStack spacing={3} mt={[3, 0]}>
              <Button
                leftIcon={<Icon as={MdAdd} />}
                bgGradient="linear(to-r, purple.500, purple.600)"
                color="white"
                _hover={{
                  bgGradient: 'linear(to-r, purple.600, purple.700)',
                }}
                onClick={() => handleOpenModal()}
              >
                Agregar Producto
              </Button>
            </HStack>
          </Flex>

          {/* Búsqueda */}
          <InputGroup size="lg" mb={4}>
            <InputLeftElement pointerEvents="none">
              <Icon as={MdSearch} color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder="Buscar por nombre o código de barras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              bg="gray.700"
              border="none"
              color="white"
              _placeholder={{ color: 'gray.400' }}
              _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
              _hover={{ bg: 'gray.700' }}
            />
            <InputRightElement width="4.5rem">
              <IconButton
                icon={<Icon as={MdCamera} />}
                bgGradient="linear(to-r, purple.500, purple.600)"
                color="white"
                size="sm"
                _hover={{
                  bgGradient: 'linear(to-r, purple.600, purple.700)',
                }}
                aria-label="Escanear código de barras"
                onClick={handleOpenScannerForSearch}
              />
            </InputRightElement>
          </InputGroup>

          {/* Filtros por categoría */}
          <HStack spacing={2} overflowX="auto" pb={2}>
            {categories.map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'solid' : 'outline'}
                bg={selectedCategory === cat ? 'purple.500' : 'transparent'}
                color={selectedCategory === cat ? 'white' : 'gray.400'}
                borderColor={selectedCategory === cat ? 'purple.500' : 'gray.600'}
                _hover={selectedCategory === cat ? { bg: 'purple.600' } : { bg: 'gray.700', borderColor: 'purple.500', color: 'white' }}
                onClick={() => setSelectedCategory(cat)}
                flexShrink={0}
              >
                {cat}
              </Button>
            ))}
          </HStack>

          {/* Filtrar por vencimiento y stock */}
          <Box mt={3} maxW={['100%' ,"200px"]}>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              bg="gray.700"
              color="white"
              size="sm"
              borderColor="gray.600"
              _hover={{ borderColor: 'purple.500' }}
            >
              <option value="Todos" style={{ background: '#374151' }}>Todos</option>
              <option value="PorVencer" style={{ background: '#374151' }}>Próximos a vencer</option>
              <option value="Vencidos" style={{ background: '#374151' }}>Vencidos</option>
              <option value="LowStock" style={{ background: '#374151' }}>Stock Bajo</option>
            </Select>
          </Box>

        </Container>
      </Box>

      <Container maxW="container.xl">
        {/* Alertas */}
        {products.filter(p => p.isLowStock).length > 0 && (
          <Alert status="warning" borderRadius="lg" mb={6} bg="gray.800" borderColor="orange.500">
            <AlertIcon color="orange.400" />
            <Text color="white">{products.filter(p => p.isLowStock).length} producto(s) con stock bajo</Text>
          </Alert>
        )}

        {/* Lista de productos */}
        {filteredProducts.length === 0 ? (
          <Box textAlign="center" py={12} bg="gray.800" borderRadius="xl" border="1px" borderColor="gray.700">
            <Text fontSize="xl" color="gray.400" mb={4}>
              {searchTerm || selectedCategory !== 'Todos' 
                ? 'No se encontraron productos' 
                : 'No hay productos registrados'}
            </Text>
            {!searchTerm && selectedCategory === 'Todos' && (
              <Button
                leftIcon={<Icon as={MdAdd} />}
                bgGradient="linear(to-r, purple.500, purple.600)"
                color="white"
                _hover={{
                  bgGradient: 'linear(to-r, purple.600, purple.700)',
                }}
                onClick={() => handleOpenModal()}
              >
                Agregar Primer Producto
              </Button>
            )}
          </Box>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
            {filteredProducts.map(product => (
              <Box
                key={product._id}
                bg="gray.800"
                p={5}
                borderRadius="xl"
                boxShadow="2xl"
                border="1px"
                borderColor="gray.700"
                _hover={{ boxShadow: 'lg', transform: 'translateY(-2px)', borderColor: 'purple.500' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" mb={3}>
                  <HStack>
                    {product.image && (
                      <Text fontSize="3xl">{product.image}</Text>
                    )}
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="lg" textTransform="capitalize" color="white">
                        {product.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {product.barcode}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack>
                    <IconButton
                      size="sm"
                      icon={<Icon as={MdEdit} />}
                      color="blue.400"
                      variant="ghost"
                      _hover={{ bg: 'gray.700' }}
                      onClick={() => handleOpenModal(product)}
                      aria-label="Editar"
                    />
                    <IconButton
                      size="sm"
                      icon={<Icon as={MdDelete} />}
                      color="red.400"
                      variant="ghost"
                      _hover={{ bg: 'gray.700' }}
                      onClick={() => handleDelete(product._id)}
                      aria-label="Eliminar"
                    />
                  </HStack>
                </HStack>

                <HStack justify="space-between" mb={2}>
                  <Badge bg="purple.500" color="white" fontSize="sm" px={2} py={1} borderRadius="md">
                    {product.category}
                  </Badge>
                  <Text fontSize="2xl" fontWeight="bold" color="purple.400">
                    ${product.price}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.400">
                    Stock:
                  </Text>
                  <HStack>
                    {product.isLowStock && (
                      <Icon as={MdWarning} color="orange.400" />
                    )}
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={product.isLowStock ? 'orange.400' : 'green.400'}
                    >
                      {product.stock} unidades
                    </Text>
                  </HStack>
                </HStack>

                {product.expirationDate && (
                  <Box mt={3} p={3} bg="gray.700" borderRadius="lg" border="1px" borderColor="gray.600">
                    <HStack justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.400">
                        Vence:
                      </Text>

                      {product.isExpired ? (
                        <Badge bg="red.500" color="white" px={2} borderRadius='md'>
                          Vencido hace {Math.abs(product.daysUntilExpiration)} día
                          {Math.abs(product.daysUntilExpiration) !== 1 ? 's' : ''}
                        </Badge>
                      ) : product.isNearExpiration ? (
                        <Badge bg="yellow.500" color="white" px={2} borderRadius='md'>
                          En {product.daysUntilExpiration} día
                          {product.daysUntilExpiration !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge bg="green.500" color="white" px={2} borderRadius='md'>
                          {product.daysUntilExpiration} día
                          {product.daysUntilExpiration !== 1 ? 's' : ''} restantes
                        </Badge>
                      )}
                    </HStack>

                    <Text mt={1} fontSize="xs" color="gray.500">
                      {new Date(product.expirationDate).toLocaleDateString('es-AR')}
                    </Text>
                  </Box>
                )}
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Container>

      {/* Modal Agregar/Editar Producto */}
      <Modal isOpen={isOpen} onClose={handleCloseModal} size="xl">
        <ModalOverlay bg="blackAlpha.800" />
        <ModalContent w={['95%', '500px']} bg="gray.800" border="1px" borderColor="gray.700">
          <form onSubmit={handleSubmit}>
            <ModalHeader color="white">
              {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </ModalHeader>
            <ModalCloseButton color="gray.400" _hover={{ color: 'white' }} />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel color="white">Código de Barras</FormLabel>
                  <HStack>
                    <Input
                      name="barcode"
                      placeholder="7790001234567"
                      value={formData.barcode}
                      onChange={handleChange}
                      bg="gray.700"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                      _hover={{ bg: 'gray.700' }}
                    />
                    <IconButton
                      icon={<Icon as={MdCamera} />}
                      bgGradient="linear(to-r, purple.500, purple.600)"
                      color="white"
                      _hover={{
                        bgGradient: 'linear(to-r, purple.600, purple.700)',
                      }}
                      aria-label="Escanear"
                      onClick={handleOpenScannerForForm}
                    />
                  </HStack>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="white">Nombre del Producto</FormLabel>
                  <Input
                    name="name"
                    placeholder="Ej: Coca Cola 2L"
                    value={formData.name}
                    onChange={handleChange}
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                    _hover={{ bg: 'gray.700' }}
                  />
                </FormControl>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel color="white">Precio</FormLabel>
                    <Input
                      name="price"
                      type="number"
                      placeholder="850"
                      value={formData.price}
                      onChange={handleChange}
                      bg="gray.700"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                      _hover={{ bg: 'gray.700' }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color="white">Categoría</FormLabel>
                    <Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="Seleccionar"
                      bg="gray.700"
                      color="white"
                      borderColor="gray.600"
                      _hover={{ borderColor: 'purple.500' }}
                    >
                      {categories.slice(1).map(cat => (
                        <option key={cat} value={cat} style={{ background: '#374151' }}>{cat}</option>
                      ))}
                    </Select>
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel color="white">Stock</FormLabel>
                    <Input
                      name="stock"
                      type="number"
                      placeholder="45"
                      value={formData.stock}
                      onChange={handleChange}
                      bg="gray.700"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                      _hover={{ bg: 'gray.700' }}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel color="white">Stock Mínimo</FormLabel>
                    <Input
                      name="minStock"
                      type="number"
                      placeholder="10"
                      value={formData.minStock}
                      onChange={handleChange}
                      bg="gray.700"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                      _hover={{ bg: 'gray.700' }}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel color="white">Fecha de Vencimiento (Opcional)</FormLabel>
                  <Input
                    name="expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={handleChange}
                    bg="gray.700"
                    border="none"
                    color="white"
                    _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                    _hover={{ bg: 'gray.700' }}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel color="white">Emoji/Icono (Opcional)</FormLabel>
                  <Input
                    name="image"
                    placeholder="🥤"
                    value={formData.image}
                    onChange={handleChange}
                    maxLength={2}
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                    _hover={{ bg: 'gray.700' }}
                  />
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleCloseModal} color="gray.400" _hover={{ bg: 'gray.700', color: 'white' }}>
                Cancelar
              </Button>
              <Button type="submit" bgGradient="linear(to-r, purple.500, purple.600)" color="white" _hover={{
                bgGradient: 'linear(to-r, purple.600, purple.700)',
              }}>
                {selectedProduct ? 'Actualizar' : 'Guardar'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* SCANNER POR CÁMARA - ÚNICO Y CONTROLADO */}
      <BarcodeCameraScanner
        isOpen={isScannerOpen}
        onClose={() => {
          closeScanner();
          setScannerPurpose(null);
        }}
        onBarcodeDetected={handleCameraBarcodeDetected}
      />
    </Box>
  );
};

export default Products;