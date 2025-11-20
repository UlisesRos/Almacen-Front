import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  useToast,
  Flex,
  Link as ChakraLink,
  SimpleGrid,
} from '@chakra-ui/react';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdPhone } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    address: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await register(formData);
      
      toast({
        title: '¡Cuenta creada!',
        description: 'Tu almacén ha sido registrado exitosamente',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al crear la cuenta',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bgGradient="linear(to-br, green.500, teal.600)"
      position="relative"
      py={8}
    >
      <Box position="absolute" inset="0" bg="blackAlpha.200" />

      <Container maxW="2xl" position="relative" zIndex="1">
        <Box bg="white" p={8} borderRadius="2xl" boxShadow="2xl">
          <Flex justify="center" mb={6}>
            <Box
              bgGradient="linear(to-br, green.500, teal.600)"
              w={20}
              h={20}
              borderRadius="2xl"
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow="lg"
            >
              <Text fontSize="3xl">🏪</Text>
            </Box>
          </Flex>

          <Heading
            as="h1"
            size="xl"
            textAlign="center"
            mb={2}
            bgGradient="linear(to-r, green.600, teal.600)"
            bgClip="text"
          >
            Crear Cuenta
          </Heading>
          <Text textAlign="center" color="gray.600" mb={8}>
            Comienza a gestionar tu almacén hoy
          </Text>

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel fontWeight="semibold">Nombre del Almacén</FormLabel>
                  <Input
                    name="storeName"
                    placeholder="Mi Almacén"
                    value={formData.storeName}
                    onChange={handleChange}
                    size="lg"
                    focusBorderColor="green.500"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="semibold">Tu Nombre Completo</FormLabel>
                  <Input
                    name="ownerName"
                    placeholder="Juan Pérez"
                    value={formData.ownerName}
                    onChange={handleChange}
                    size="lg"
                    focusBorderColor="green.500"
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <FormLabel fontWeight="semibold">Correo Electrónico</FormLabel>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Box as={MdEmail} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type="email"
                    name="email"
                    placeholder="tu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    size="lg"
                    focusBorderColor="green.500"
                  />
                </InputGroup>
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl isRequired>
                  <FormLabel fontWeight="semibold">Teléfono (WhatsApp)</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Box as={MdPhone} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type="tel"
                      name="phone"
                      placeholder="+54 9 341 555-1234"
                      value={formData.phone}
                      onChange={handleChange}
                      size="lg"
                      focusBorderColor="green.500"
                    />
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontWeight="semibold">Contraseña</FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Box as={MdLock} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Mínimo 6 caracteres"
                      value={formData.password}
                      onChange={handleChange}
                      size="lg"
                      focusBorderColor="green.500"
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<Box as={showPassword ? MdVisibilityOff : MdVisibility} />}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password"
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <FormLabel fontWeight="semibold">Dirección (Opcional)</FormLabel>
                <Input
                  name="address"
                  placeholder="Av. Pellegrini 1250, Rosario"
                  value={formData.address}
                  onChange={handleChange}
                  size="lg"
                  focusBorderColor="green.500"
                />
              </FormControl>

              <Button
                type="submit"
                w="full"
                size="lg"
                bgGradient="linear(to-r, green.500, teal.600)"
                color="white"
                _hover={{
                  bgGradient: 'linear(to-r, green.600, teal.700)',
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
                isLoading={loading}
                loadingText="Creando cuenta..."
              >
                Crear Mi Cuenta
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" mt={6} color="gray.600">
            ¿Ya tienes cuenta?{' '}
            <ChakraLink
              as={Link}
              to="/login"
              color="green.600"
              fontWeight="semibold"
              _hover={{ textDecoration: 'underline' }}
            >
              Inicia sesión
            </ChakraLink>
          </Text>
        </Box>
      </Container>
    </Flex>
  );
};

export default Register;