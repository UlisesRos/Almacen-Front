import { useEffect, useState } from 'react';
import { Box, Button, HStack, Icon, useToast, VStack, Text } from '@chakra-ui/react';
import { MdDownload, MdClose } from 'react-icons/md';

const PWAInstallPrompt = () => {
  const [prompt, setPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const handler = (e) => {
      // Prevent mini-infobar on mobile
      e.preventDefault();
      // Stash the event for later use
      setPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!prompt) return;

    prompt.prompt();
    const { outcome } = await prompt.userChoice;

    if (outcome === 'accepted') {
      toast({
        title: 'App instalada',
        description: 'Puedes usar Almacén Manager sin conexión',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    }

    setShowPrompt(false);
    setPrompt(null);
  };

  if (!showPrompt) return null;

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
          <Button
            size="sm"
            variant="ghost"
            icon={<Icon as={MdClose} />}
            onClick={() => setShowPrompt(false)}
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