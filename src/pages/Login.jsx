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
} from '@chakra-ui/react';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
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
      await login(formData.email, formData.password);
      
      toast({
        title: '¡Bienvenido!',
        description: 'Inicio de sesión exitoso',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Credenciales inválidas',
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
      bgGradient="linear(to-br, blue.500, purple.600)"
      position="relative"
    >
      <Box position="absolute" inset="0" bg="blackAlpha.200" />

      <Container maxW="md" position="relative" zIndex="1">
        <Box bg="white" p={8} borderRadius="2xl" boxShadow="2xl">
          <Flex justify="center" mb={6}>
            <Box
              bgGradient="linear(to-br, blue.500, purple.600)"
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
            bgGradient="linear(to-r, blue.600, purple.600)"
            bgClip="text"
          >
            Bienvenido
          </Heading>
          <Text textAlign="center" color="gray.600" mb={8}>
            Gestiona tu almacén de manera inteligente
          </Text>

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
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
                    focusBorderColor="blue.500"
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
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    size="lg"
                    focusBorderColor="blue.500"
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

              <Button
                type="submit"
                w="full"
                size="lg"
                bgGradient="linear(to-r, blue.500, purple.600)"
                color="white"
                _hover={{
                  bgGradient: 'linear(to-r, blue.600, purple.700)',
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
                isLoading={loading}
                loadingText="Iniciando sesión..."
              >
                Iniciar Sesión
              </Button>
            </VStack>
          </form>

          <Text textAlign="center" mt={6} color="gray.600">
            ¿No tienes cuenta?{' '}
            <ChakraLink
              as={Link}
              to="/register"
              color="blue.600"
              fontWeight="semibold"
              _hover={{ textDecoration: 'underline' }}
            >
              Regístrate aquí
            </ChakraLink>
          </Text>

          <Box mt={6} pt={6} borderTop="1px" borderColor="gray.200">
            {/* Información de la App */}
            <Box bg="gray.100" p={4} borderRadius="lg" textAlign="center">
              <Text fontSize="sm" color="gray.600" mb={1}>
                Sistema de Gestión de Almacén
              </Text>
              <Text fontSize="xs" color="gray.500">
                Versión 1.0.0 • Desarrollado por{" "}
                <ChakraLink
                  as={Link}
                  to="https://ulisesros-desarrolloweb.vercel.app/"
                  color="blue.500"
                  isExternal
                  fontWeight="medium"
                >
                  Ulises Ros
                </ChakraLink>
              </Text>
            </Box>
          </Box>
        </Box>
      </Container>
    </Flex>
  );
};

export default Login;