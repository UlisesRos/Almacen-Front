import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
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
} from '@chakra-ui/react';
import { MdLock, MdVisibility, MdVisibilityOff, MdClose, MdArrowBack } from 'react-icons/md';
import { authAPI } from '../api/auth';

const ResetPassword = () => {
  const { token } = useParams();
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    if (!token) {
      toast({
        title: 'Token inválido',
        description: 'El enlace de recuperación no es válido',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      navigate('/forgot-password');
    }
  }, [token, navigate, toast]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'La contraseña debe tener al menos 6 caracteres',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Las contraseñas no coinciden',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, formData.password);
      
      setSuccess(true);
      
      toast({
        title: '¡Contraseña actualizada!',
        description: 'Tu contraseña ha sido restablecida exitosamente',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });

      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al restablecer la contraseña. El enlace puede haber expirado.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Flex
        minH="100vh"
        align="center"
        justify="center"
        bg="black"
        position="relative"
        bgGradient="linear(to-b, black, purple.900)"
      >
        <Container maxW="md" position="relative" zIndex="1">
          <Box
            bg="gray.800"
            p={8}
            borderRadius="2xl"
            boxShadow="2xl"
            border="1px"
            borderColor="gray.700"
            position="relative"
            textAlign="center"
          >
            <Box
              bg="green.500"
              color="white"
              p={6}
              borderRadius="lg"
              mb={4}
            >
              <Text fontSize="2xl" fontWeight="bold" mb={2}>
                ✓ Contraseña restablecida
              </Text>
              <Text fontSize="sm" opacity={0.9}>
                Tu contraseña ha sido actualizada exitosamente. Serás redirigido al inicio de sesión...
              </Text>
            </Box>

            <Button
              as={Link}
              to="/login"
              w="full"
              size="lg"
              bgGradient="linear(to-r, purple.500, purple.600)"
              color="white"
              _hover={{
                bgGradient: 'linear(to-r, purple.600, purple.700)',
                transform: 'translateY(-2px)',
                boxShadow: 'lg',
              }}
              borderRadius="lg"
              fontWeight="semibold"
              mt={4}
            >
              Ir a iniciar sesión
            </Button>
          </Box>
        </Container>
      </Flex>
    );
  }

  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      bg="black"
      position="relative"
      bgGradient="linear(to-b, black, purple.900)"
    >
      <Container maxW="md" position="relative" zIndex="1">
        <Box
          bg="gray.800"
          p={8}
          borderRadius="2xl"
          boxShadow="2xl"
          border="1px"
          borderColor="gray.700"
          position="relative"
        >
          {/* Header con botón de cerrar */}
          <Flex justify="space-between" align="center" mb={6}>
            <IconButton
              aria-label="Volver"
              icon={<MdArrowBack />}
              variant="ghost"
              color="gray.400"
              _hover={{ bg: 'gray.700', color: 'white' }}
              size="sm"
              onClick={() => navigate('/login')}
            />
            <IconButton
              aria-label="Close"
              icon={<MdClose />}
              variant="ghost"
              color="gray.400"
              _hover={{ bg: 'gray.700', color: 'white' }}
              size="sm"
              onClick={() => navigate('/login')}
            />
          </Flex>

          {/* Título */}
          <Heading
            as="h1"
            size="xl"
            mb={8}
            color="white"
            fontWeight="bold"
            textAlign="center"
          >
            Restablecer contraseña
          </Heading>

          {/* Descripción */}
          <Text
            color="gray.400"
            mb={6}
            textAlign="center"
            fontSize="sm"
          >
            Ingresa tu nueva contraseña. Asegúrate de que tenga al menos 6 caracteres.
          </Text>

          {/* Formulario */}
          <form onSubmit={handleSubmit}>
            <VStack spacing={4}>
              <FormControl isRequired>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Box as={MdLock} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Nueva contraseña"
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

              <FormControl isRequired>
                <InputGroup>
                  <InputLeftElement pointerEvents="none">
                    <Box as={MdLock} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    placeholder="Confirmar contraseña"
                    value={formData.confirmPassword}
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
                      icon={<Box as={showConfirmPassword ? MdVisibilityOff : MdVisibility} color="gray.400" />}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label="Toggle confirm password"
                      _hover={{ bg: 'gray.600' }}
                    />
                  </InputRightElement>
                </InputGroup>
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
                loadingText="Restableciendo..."
                borderRadius="lg"
                fontWeight="semibold"
                mt={2}
              >
                Restablecer contraseña
              </Button>
            </VStack>
          </form>

          {/* Link a login */}
          <Text textAlign="center" mt={6} color="gray.400" fontSize="sm">
            ¿Recordaste tu contraseña?{' '}
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

export default ResetPassword;

