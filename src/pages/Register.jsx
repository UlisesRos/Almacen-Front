import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
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
  HStack,
  Divider,
} from '@chakra-ui/react';
import { MdEmail, MdLock, MdVisibility, MdVisibilityOff, MdPhone, MdClose } from 'react-icons/md';
import { useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const HAS_GOOGLE_CLIENT_ID = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'placeholder-client-id';

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

  const { register, loginGoogle } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [googleLoading, setGoogleLoading] = useState(false);

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

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setGoogleLoading(true);

      // Obtener información del usuario de Google
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${credentialResponse.access_token}`,
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener información de Google');
      }

      const googleUser = await response.json();

      // Enviar datos al backend
      await loginGoogle({
        googleId: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        picture: googleUser.picture
      });

      toast({
        title: '¡Cuenta creada!',
        description: 'Tu cuenta ha sido creada exitosamente con Google',
        status: 'success',
        duration: 3000,
        isClosable: true,
        position: 'top',
      });

      navigate('/');
    } catch (error) {
      console.error('Error en Google register:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al crear cuenta con Google',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleError = () => {
    toast({
      title: 'Error',
      description: 'Error al registrarse con Google',
      status: 'error',
      duration: 5000,
      isClosable: true,
      position: 'top',
    });
  };

  // Inicializar Google Login (solo funcionará si hay Client ID válido)
  const googleLoginHook = useGoogleLogin({
    onSuccess: HAS_GOOGLE_CLIENT_ID ? handleGoogleSuccess : () => {},
    onError: HAS_GOOGLE_CLIENT_ID ? handleGoogleError : () => {},
  });

  const googleLogin = () => {
    if (!HAS_GOOGLE_CLIENT_ID) {
      toast({
        title: 'Google OAuth no configurado',
        description: 'Por favor configura VITE_GOOGLE_CLIENT_ID en las variables de entorno',
        status: 'warning',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      return;
    }
    googleLoginHook();
  };

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="black"
      position="relative"
      bgGradient="linear(to-b, black, purple.900)"
      py={8}
    >
      <Container maxW="2xl" position="relative" zIndex="1">
        <Box
          bg="gray.800"
          p={8}
          borderRadius="2xl"
          boxShadow="2xl"
          border="1px"
          borderColor="gray.700"
          position="relative"
        >
          {/* Header con botones Sign up/Sign in y X */}
          <Flex justify="space-between" align="center" mb={6}>
            <HStack spacing={2}>
              <Button
                size="sm"
                bg="gray.700"
                color="white"
                borderRadius="full"
                px={4}
                _hover={{ bg: 'gray.600' }}
              >
                Registrarse
              </Button>
              <Button
                as={Link}
                to="/login"
                size="sm"
                variant="ghost"
                color="gray.400"
                _hover={{ bg: 'gray.700', color: 'white' }}
                borderRadius="full"
                px={4}
              >
                Iniciar sesión
              </Button>
            </HStack>
            <IconButton
              aria-label="Close"
              icon={<MdClose />}
              variant="ghost"
              color="gray.400"
              _hover={{ bg: 'gray.700', color: 'white' }}
              size="sm"
              onClick={() => navigate(-1)}
            />
          </Flex>

          {/* Título */}
          <Heading
            as="h1"
            size="xl"
            mb={8}
            color="white"
            fontWeight="bold"
          >
            Crear una cuenta
          </Heading>

          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl isRequired>
                  <Input
                    name="storeName"
                    placeholder="Nombre del Almacén"
                    value={formData.storeName}
                    onChange={handleChange}
                    size="lg"
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                    _hover={{ bg: 'gray.700' }}
                  />
                </FormControl>

                <FormControl isRequired>
                  <Input
                    name="ownerName"
                    placeholder="Tu Nombre Completo"
                    value={formData.ownerName}
                    onChange={handleChange}
                    size="lg"
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                    _hover={{ bg: 'gray.700' }}
                  />
                </FormControl>
              </SimpleGrid>

              <FormControl isRequired>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Box as={MdEmail} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Ingresa tu correo"
                    value={formData.email}
                    onChange={handleChange}
                    size="lg"
                    bg="gray.700"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'gray.400' }}
                    _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                    _hover={{ bg: 'gray.700' }}
                  />
                </InputGroup>
              </FormControl>

              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} w="full">
                <FormControl isRequired>
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
                      bg="gray.700"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                      _hover={{ bg: 'gray.700' }}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Box as={MdLock} color="gray.400" />
                    </InputLeftElement>
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Ingresa tu contraseña"
                      value={formData.password}
                      onChange={handleChange}
                      size="lg"
                      bg="gray.700"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'gray.400' }}
                      _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                      _hover={{ bg: 'gray.700' }}
                    />
                    <InputRightElement>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<Box as={showPassword ? MdVisibilityOff : MdVisibility} color="gray.400" />}
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label="Toggle password"
                        _hover={{ bg: 'gray.600' }}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>
              </SimpleGrid>

              <FormControl>
                <Input
                  name="address"
                  placeholder="Dirección (Opcional)"
                  value={formData.address}
                  onChange={handleChange}
                  size="lg"
                  bg="gray.700"
                  border="none"
                  color="white"
                  _placeholder={{ color: 'gray.400' }}
                  _focus={{ bg: 'gray.700', border: '1px', borderColor: 'purple.500' }}
                  _hover={{ bg: 'gray.700' }}
                />
              </FormControl>

              <Button
                type="submit"
                w="full"
                size="lg"
                bgGradient="linear(to-r, purple.500, purple.600)"
                color="white"
                _hover={{
                  bgGradient: 'linear(to-r, purple.600, purple.700)',
                  transform: 'translateY(-2px)',
                  boxShadow: 'lg',
                }}
                isLoading={loading}
                loadingText="Creando cuenta..."
                borderRadius="lg"
                fontWeight="semibold"
                mt={2}
              >
                Crear cuenta
              </Button>
            </VStack>
          </form>

          {/* Separador OR SIGN IN WITH */}
          <Flex align="center" my={6}>
            <Divider width="35%" borderColor="gray.600" />
            <Text px={4} color="gray.400" fontSize="sm" fontWeight="medium">
              REGISTRARSE CON
            </Text>
            <Divider w='35%' borderColor="gray.600" />
          </Flex>

          {/* Botones de redes sociales */}
          <HStack spacing={4} mb={6}>
            <Button
              w="full"
              size="lg"
              bg="white"
              color="gray.800"
              _hover={{ bg: 'gray.100' }}
              borderRadius="lg"
              fontWeight="semibold"
              onClick={() => googleLogin()}
              isLoading={googleLoading}
              loadingText="Conectando..."
            >
              <Box mr={2} display="flex" alignItems="center">
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              </Box>
              Google
            </Button>
          </HStack>

          {/* Texto legal */}
          <Text
            textAlign="center"
            fontSize="xs"
            color="gray.400"
            mt={6}
          >
            Versión 1.0.0 • Desarrollado por{" "}
            <ChakraLink
              color="purple.400"
              _hover={{ textDecoration: 'underline' }}
              href="https://ulisesros-desarrolloweb.vercel.app/"
              target='_blank'
            >
              Ulises Ros
            </ChakraLink>
          </Text>

          {/* Link a login */}
          <Text textAlign="center" mt={4} color="gray.400" fontSize="sm">
            ¿Ya tienes cuenta?{' '}
            <ChakraLink
              as={Link}
              to="/login"
              color="purple.400"
              fontWeight="semibold"
              _hover={{ textDecoration: 'underline' }}
            >
              Iniciar sesión
            </ChakraLink>
          </Text>
        </Box>
      </Container>
    </Flex>
  );
};

export default Register;