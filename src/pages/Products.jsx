import { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
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
  AlertIcon
} from '@chakra-ui/react';
import {
  MdSearch,
  MdAdd,
  MdEdit,
  MdDelete,
  MdWarning,
  MdCamera,
  MdFileUpload,
} from 'react-icons/md';
import { productsAPI } from '../api/products';
import BarcodeModal from '../components/BarcodeModal';

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


  const { isOpen: isScannerOpen, onOpen: onScannerOpen, onClose: onScannerClose } = useDisclosure();
  const { isOpen: isScannerSearchOpen, onOpen: onScannerSearchOpen, onClose: onScannerSearchClose } = useDisclosure();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const categories = ['Todos', 'Bebidas', 'Panadería', 'Almacén', 'Lácteos', 'Snacks', 'Limpieza', 'Otros'];

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchTerm, selectedCategory, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productsAPI.getAll();
      // Ordenar productos apenas llegan del backend
      const ordered = [...response.data].sort((a, b) => {
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
    
    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.includes(searchTerm)
      );
    }

    // Filtrar por categoría
    // Categorías normales
    if (
      selectedCategory !== 'Todos' &&
      selectedCategory !== 'PorVencer' &&
      selectedCategory !== 'Vencidos' &&
      selectedCategory !== 'LowStock'
    ) {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    // Próximos a vencer (<= 20 días)
    if (selectedCategory === 'PorVencer') {
      filtered = filtered.filter(p => p.isNearExpiration);
    }

    // Ya vencidos
    if (selectedCategory === 'Vencidos') {
      filtered = filtered.filter(p => p.isExpired);
    }

    if (selectedCategory === 'LowStock') {
      filtered = filtered.filter(p => p.isLowStock === true);
    }

    filtered = filtered.sort((a, b) => {
      const aHasDate = !!a.expirationDate;
      const bHasDate = !!b.expirationDate;

      // 1. Productos sin fecha van al final
      if (!aHasDate && !bHasDate) return 0;
      if (!aHasDate) return 1;
      if (!bHasDate) return -1;

      // 2. Ordenar por días hasta vencimiento (incluye negativos para vencidos)
      const aDays = a.daysUntilExpiration;
      const bDays = b.daysUntilExpiration;
      
      return aDays - bDays;
    });

    setFilteredProducts(filtered);
  };

  // Modal de agregar/editar producto (escaner)
  const handleBarcodeScanned = (barcode) => {
    setFormData({
      ...formData,
      barcode: barcode
    });
  };

  // Búsqueda de productos (Escaner)
  const handleSearchBarcodeScanned = (barcode) => {
    setSearchTerm(barcode);
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

    try {
      if (selectedProduct) {
        // Actualizar producto
        await productsAPI.update(selectedProduct._id, formData);
        toast({
          title: 'Producto actualizado',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        // Crear nuevo producto
        await productsAPI.create(formData);
        toast({
          title: 'Producto creado',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
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

    try {
      await productsAPI.delete(productId);
      toast({
        title: 'Producto eliminado',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadProducts();
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

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="blue.500" thickness="4px" />
          <Text color="gray.600">Cargando productos...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="gray.50" pb={20}>
      {/* Header */}
      <Box bg="white" borderBottom="1px" borderColor="gray.200" py={4} px={6} mb={6}>
        <Container maxW="container.xl">
          <Flex justify={['center', 'space-between']} align="center" mb={4} flexWrap="wrap">
            <Box>
              <Heading size="lg" mb={2}>Mis Productos</Heading>
              <Text color="gray.600" fontSize="sm">
                {filteredProducts.length} producto{filteredProducts.length !== 1 ? 's' : ''} en inventario
              </Text>
            </Box>
            <HStack spacing={3} mt={[3, 0]}>
              <Button
                leftIcon={<Icon as={MdAdd} />}
                colorScheme="blue"
                onClick={() => handleOpenModal()}
              >
                Agregar Producto
              </Button>
            </HStack>
          </Flex>

          {/* Búsqueda */}
          <Flex gap={2} mb={4}>
            <InputGroup size="lg" flex={1}>
              <InputLeftElement pointerEvents="none">
                <Icon as={MdSearch} color="gray.400" />
              </InputLeftElement>
              <Input
                placeholder="Buscar por nombre o código de barras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                bg="white"
              />
            </InputGroup>
            <IconButton
              icon={<Icon as={MdCamera} />}
              colorScheme="blue"
              size="lg"
              onClick={onScannerSearchOpen}
              aria-label="Escanear"
            />
          </Flex>

          {/* Filtros por categoría */}
          <HStack spacing={2} overflowX="auto" pb={2}>
            {categories.map(cat => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? 'solid' : 'outline'}
                colorScheme={selectedCategory === cat ? 'blue' : 'gray'}
                onClick={() => setSelectedCategory(cat)}
                flexShrink={0}
              >
                {cat}
              </Button>
            ))}
          </HStack>

          {/* Filtrar por vencimieto y stock */}
          <Box mt={3} maxW={['100%' ,"200px"]}>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              bg="white"
              size="sm"
              borderColor="gray.300"
            >
              <option value="Todos">Todos</option>
              <option value="PorVencer">Próximos a vencer</option>
              <option value="Vencidos">Vencidos</option>
              <option value="LowStock">Stock Bajo</option>
            </Select>
          </Box>

        </Container>
      </Box>

      <Container maxW="container.xl">
        {/* Alertas */}
        {products.filter(p => p.isLowStock).length > 0 && (
          <Alert status="warning" borderRadius="lg" mb={6}>
            <AlertIcon />
            {products.filter(p => p.isLowStock).length} producto(s) con stock bajo
          </Alert>
        )}

        {/* Lista de productos */}
        {filteredProducts.length === 0 ? (
          <Box textAlign="center" py={12} bg="white" borderRadius="xl">
            <Text fontSize="xl" color="gray.500" mb={4}>
              {searchTerm || selectedCategory !== 'Todos' 
                ? 'No se encontraron productos' 
                : 'No hay productos registrados'}
            </Text>
            {!searchTerm && selectedCategory === 'Todos' && (
              <Button
                leftIcon={<Icon as={MdAdd} />}
                colorScheme="blue"
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
                bg="white"
                p={5}
                borderRadius="xl"
                boxShadow="sm"
                border="1px"
                borderColor="gray.100"
                _hover={{ boxShadow: 'md', transform: 'translateY(-2px)' }}
                transition="all 0.2s"
              >
                <HStack justify="space-between" mb={3}>
                  <HStack>
                    {product.image && (
                      <Text fontSize="3xl">{product.image}</Text>
                    )}
                    <VStack align="start" spacing={0}>
                      <Text fontWeight="bold" fontSize="lg" textTransform="capitalize">
                        {product.name}
                      </Text>
                      <Text fontSize="xs" color="gray.500">
                        {product.barcode}
                      </Text>
                    </VStack>
                  </HStack>
                  <HStack>
                    <IconButton
                      size="sm"
                      icon={<Icon as={MdEdit} />}
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() => handleOpenModal(product)}
                      aria-label="Editar"
                    />
                    <IconButton
                      size="sm"
                      icon={<Icon as={MdDelete} />}
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => handleDelete(product._id)}
                      aria-label="Eliminar"
                    />
                  </HStack>
                </HStack>

                <HStack justify="space-between" mb={2}>
                  <Badge colorScheme="purple" fontSize="sm" px={2} py={1} borderRadius="md">
                    {product.category}
                  </Badge>
                  <Text fontSize="2xl" fontWeight="bold" color="blue.600">
                    ${product.price}
                  </Text>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color="gray.600">
                    Stock:
                  </Text>
                  <HStack>
                    {product.isLowStock && (
                      <Icon as={MdWarning} color="orange.500" />
                    )}
                    <Text
                      fontSize="sm"
                      fontWeight="bold"
                      color={product.isLowStock ? 'orange.600' : 'green.600'}
                    >
                      {product.stock} unidades
                    </Text>
                  </HStack>
                </HStack>
                {product.expirationDate && (
                  <Box mt={3} p={3} bg="gray.50" borderRadius="lg" border="1px" borderColor="gray.200">
                    <HStack justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.600">
                        Vence:
                      </Text>

                      {product.isExpired ? (
                        <Badge colorScheme="red" px={2} borderRadius='md'>
                          Vencido hace {Math.abs(product.daysUntilExpiration)} día
                          {Math.abs(product.daysUntilExpiration) !== 1 ? 's' : ''}
                        </Badge>
                      ) : product.isNearExpiration ? (
                        <Badge colorScheme="yellow" px={2} borderRadius='md'>
                          En {product.daysUntilExpiration} día
                          {product.daysUntilExpiration !== 1 ? 's' : ''}
                        </Badge>
                      ) : (
                        <Badge colorScheme="green" px={2} borderRadius='md'>
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
        <ModalOverlay />
        <ModalContent w={['95%', '500px']}>
          <form onSubmit={handleSubmit}>
            <ModalHeader>
              {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </ModalHeader>
            <ModalCloseButton />
            <ModalBody>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Código de Barras</FormLabel>
                  <HStack>
                    <Input
                      name="barcode"
                      placeholder="7790001234567"
                      value={formData.barcode}
                      onChange={handleChange}
                    />
                    <IconButton
                      icon={<Icon as={MdCamera} />}
                      colorScheme="purple"
                      aria-label="Escanear"
                      onClick={onScannerOpen}
                    />
                  </HStack>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Nombre del Producto</FormLabel>
                  <Input
                    name="name"
                    placeholder="Ej: Coca Cola 2L"
                    value={formData.name}
                    onChange={handleChange}
                  />
                </FormControl>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Precio</FormLabel>
                    <Input
                      name="price"
                      type="number"
                      placeholder="850"
                      value={formData.price}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Categoría</FormLabel>
                    <Select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      placeholder="Seleccionar"
                    >
                      {categories.slice(1).map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </Select>
                  </FormControl>
                </SimpleGrid>

                <SimpleGrid columns={2} spacing={4} w="full">
                  <FormControl isRequired>
                    <FormLabel>Stock</FormLabel>
                    <Input
                      name="stock"
                      type="number"
                      placeholder="45"
                      value={formData.stock}
                      onChange={handleChange}
                    />
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel>Stock Mínimo</FormLabel>
                    <Input
                      name="minStock"
                      type="number"
                      placeholder="10"
                      value={formData.minStock}
                      onChange={handleChange}
                    />
                  </FormControl>
                </SimpleGrid>

                <FormControl>
                  <FormLabel>Fecha de Vencimiento (Opcional)</FormLabel>
                  <Input
                    name="expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={handleChange}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Emoji/Icono (Opcional)</FormLabel>
                  <Input
                    name="image"
                    placeholder="🥤"
                    value={formData.image}
                    onChange={handleChange}
                    maxLength={2}
                  />
                </FormControl>
              </VStack>
            </ModalBody>

            <ModalFooter>
              <Button variant="ghost" mr={3} onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" colorScheme="blue">
                {selectedProduct ? 'Actualizar' : 'Guardar'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      <BarcodeModal 
        isOpen={isScannerOpen} 
        onClose={onScannerClose} 
        onBarcodeDetected={handleBarcodeScanned}
      />

      <BarcodeModal 
        isOpen={isScannerSearchOpen} 
        onClose={onScannerSearchClose} 
        onBarcodeDetected={handleSearchBarcodeScanned}
      />
    </Box>
  );
};

export default Products;