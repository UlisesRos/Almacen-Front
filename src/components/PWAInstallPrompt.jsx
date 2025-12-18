import { useEffect, useState } from 'react';
import { Box, Button, HStack, Icon, useToast, VStack, Text, IconButton } from '@chakra-ui/react';
import { MdDownload, MdClose, MdShare, MdInfo, MdPhoneIphone } from 'react-icons/md';

const PWAInstallPrompt = () => {
  const [prompt, setPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false); // Controla el modal de iOS
  const [isIOS, setIsIOS] = useState(false);
  const [hasShownIOSPrompt, setHasShownIOSPrompt] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Detectar si es iOS
    const iosCheck = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iosCheck);

    // Si es iOS, mostrar el botón flotante (no el modal completo)
    if (iosCheck && !hasShownIOSPrompt) {
      setShowPrompt(true);
      setHasShownIOSPrompt(true);
      // NO abrimos el modal automáticamente
      return;
    }

    // Para Android/otros
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, [hasShownIOSPrompt]);

  const handleInstall = async () => {
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: '¡App instalada!',
        description: 'Puedes usar Almacén Manager sin conexión',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }

    setShowPrompt(false);
    setPrompt(null);
  };

  const handleIOSInstalled = () => {
    toast({
      title: '¡Listo!',
      description: 'Ya puedes abrir Almacén desde tu pantalla de inicio',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    setShowIOSModal(false);
  };

  const handleCloseIOSButton = () => {
    setShowPrompt(false);
    setShowIOSModal(false);
  };

  if (!showPrompt) return null;


  // BOTÓN FLOTANTE para iOS
  if (isIOS && !showIOSModal) {
    return (
      <Button
        position="fixed"
        bottom={6}
        right={6}
        bgGradient="linear(to-r, blue.500, blue.600)"
        color="white"
        size="md"
        borderRadius="full"
        boxShadow="2xl"
        leftIcon={<Icon as={MdPhoneIphone} />}
        _hover={{
          bgGradient: 'linear(to-r, blue.600, blue.700)',
          transform: 'scale(1.05)',
        }}
        onClick={() => setShowIOSModal(true)}
        zIndex={100}
        px={4}
        py={6}
      >
        Instalar App
      </Button>
    );
  }


  // MODAL COMPLETO para iOS (cuando se abre)
  if (isIOS && showIOSModal) {
    return (
      <Box
        position="fixed"
        bottom="30%"
        right="5%"
        left="5%"
        bg="gradient-to-br"
        bgGradient="linear(to-br, blue.500, blue.600)"
        borderRadius="lg"
        boxShadow="2xl"
        p={5}
        maxW="sm"
        zIndex={50}
        border="2px"
        borderColor="blue.400"
        margin="0 auto"
      >
        <VStack align="stretch" spacing={4}>
          {/* Header */}
          <HStack justify="space-between" mb={2}>
            <HStack spacing={2}>
              <Icon as={MdShare} boxSize={5} color="white" />
              <Text fontWeight="bold" color="white" fontSize="lg">
                Instalar App
              </Text>
            </HStack>
            <IconButton
              size="sm"
              variant="ghost"
              icon={<Icon as={MdClose} color="white" />}
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => setShowIOSModal(false)}
              aria-label="Cerrar"
            />
          </HStack>

          {/* Descripción */}
          <Box bg="whiteAlpha.15" p={3} borderRadius="md" border="1px" borderColor="whiteAlpha.30">
            <Text fontSize="sm" color="white" mb={3} fontWeight="medium">
              📱 Acceso rápido desde tu pantalla de inicio
            </Text>
            <VStack align="start" spacing={2} fontSize="xs" color="whiteAlpha.90">
              <HStack spacing={2}>
                <Text fontWeight="bold">1.</Text>
                <Text>Abre esta página en Safari</Text>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold">2.</Text>
                <Text>Tap en el botón Compartir (↑)</Text>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold">3.</Text>
                <Text>Selecciona "Agregar a pantalla de inicio"</Text>
              </HStack>
              <HStack spacing={2}>
                <Text fontWeight="bold">4.</Text>
                <Text>¡Abre desde tu home! 🎉</Text>
              </HStack>
            </VStack>
          </Box>

          {/* Info box */}
          <Box bg="whiteAlpha.15" p={3} borderRadius="md" border="1px" borderColor="whiteAlpha.30">
            <HStack spacing={2} align="start">
              <Icon as={MdInfo} boxSize={4} color="white" mt={1} flexShrink={0} />
              <Text fontSize="xs" color="whiteAlpha.80">
                Funciona en Safari. Chrome y otros navegadores no soportan PWA en iOS.
              </Text>
            </HStack>
          </Box>

          {/* Botones */}
          <HStack spacing={2}>
            <Button
              flex={1}
              size="sm"
              variant="outline"
              color="white"
              borderColor="white"
              _hover={{ bg: 'whiteAlpha.15' }}
              onClick={() => setShowIOSModal(false)}
            >
              Después
            </Button>
            <Button
              flex={1}
              size="sm"
              bg="white"
              color="blue.600"
              fontWeight="bold"
              _hover={{ bg: 'whiteAlpha.90' }}
              onClick={handleIOSInstalled}
            >
              ¡Entendido!
            </Button>
          </HStack>
        </VStack>
      </Box>
    );
  }


  // Banner para Android/otros
  return (
    <Box
      position="fixed"
      bottom={20}
      right={4}
      bg="white"
      borderRadius="lg"
      boxShadow="lg"
      p={4}
      maxW="sm"
      zIndex={50}
      border="1px"
      borderColor="gray.200"
    >
      <VStack align="stretch" spacing={3}>
        <HStack justify="space-between">
          <Text fontWeight="bold">Instalar App</Text>
          <IconButton
            size="sm"
            variant="ghost"
            icon={<Icon as={MdClose} />}
            onClick={() => setShowPrompt(false)}
            aria-label="Cerrar"
          />
        </HStack>

        <Text fontSize="sm" color="gray.600">
          Instala Almacén Manager en tu dispositivo para acceso rápido
        </Text>

        <HStack spacing={2}>
          <Button
            flex={1}
            size="sm"
            variant="outline"
            onClick={() => setShowPrompt(false)}
          >
            Después
          </Button>
          <Button
            flex={1}
            size="sm"
            colorScheme="blue"
            leftIcon={<Icon as={MdDownload} />}
            onClick={handleInstall}
          >
            Instalar
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default PWAInstallPrompt;