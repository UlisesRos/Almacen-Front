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
  useToast,
  Flex,
  Link as ChakraLink,
  HStack,
  IconButton,
} from '@chakra-ui/react';
import { MdEmail, MdClose, MdArrowBack } from 'react-icons/md';
import { authAPI } from '../api/auth';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await authAPI.forgotPassword(email);
      
      setEmailSent(true);
      
      toast({
        title: 'Email enviado',
        description: 'Si el email existe, recibirás un correo con las instrucciones para recuperar tu contraseña',
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Error al enviar el email',
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
            textAlign="center"
          >
            {emailSent ? 'Revisa tu correo' : 'Recuperar contraseña'}
          </Heading>

          {!emailSent ? (
            <>
              {/* Descripción */}
              <Text
                color="gray.400"
                mb={6}
                textAlign="center"
                fontSize="sm"
              >
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
              </Text>

              {/* Formulario */}
              <form onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <FormControl isRequired>
                    <InputGroup>
                      <InputLeftElement pointerEvents="none">
                        <Box as={MdEmail} color="gray.400" />
                      </InputLeftElement>
                      <Input
                        type="email"
                        name="email"
                        placeholder="Ingresa tu correo"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    loadingText="Enviando..."
                    borderRadius="lg"
                    fontWeight="semibold"
                    mt={2}
                  >
                    Enviar enlace de recuperación
                  </Button>
                </VStack>
              </form>
            </>
          ) : (
            <>
              {/* Mensaje de éxito */}
              <VStack spacing={4}>
                <Box
                  bg="green.500"
                  color="white"
                  p={6}
                  borderRadius="lg"
                  textAlign="center"
                  w="full"
                >
                  <Text fontSize="lg" fontWeight="semibold" mb={2}>
                    ✓ Email enviado
                  </Text>
                  <Text fontSize="sm" opacity={0.9}>
                    Si el email <strong>{email}</strong> existe en nuestro sistema, recibirás un correo con las instrucciones para restablecer tu contraseña.
                  </Text>
                </Box>

                <Text
                  color="gray.400"
                  fontSize="sm"
                  textAlign="center"
                >
                  ¿No recibiste el correo? Revisa tu carpeta de spam o intenta nuevamente.
                </Text>

                <Button
                  w="full"
                  size="lg"
                  variant="outline"
                  color="purple.400"
                  borderColor="purple.500"
                  _hover={{ bg: 'purple.500', color: 'white' }}
                  onClick={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                  borderRadius="lg"
                  fontWeight="semibold"
                >
                  Enviar otro correo
                </Button>
              </VStack>
            </>
          )}

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

export default ForgotPassword;

