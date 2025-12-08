import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Icon,
  Alert,
  AlertIcon,
  Spinner,
  Flex,
} from '@chakra-ui/react';
import { MdCameraAlt } from 'react-icons/md';

// Scanner de códigos de barras optimizado para móviles usando html5-qrcode
// Soporta: EAN-13, EAN-8, UPC-A, UPC-E, Code128, Code39, ITF, etc.
// Funciona muy bien en iPhone y Android

const BarcodeCameraScanner = ({ isOpen, onClose, onBarcodeDetected }) => {
  const scannerRef = useRef(null);
  const html5QrCodeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastDetectedBarcodeRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const scanConfigRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    // Reset state cuando se abre
    setError(null);
    setIsScanning(false);
    lastDetectedBarcodeRef.current = null;
    lastDetectionTimeRef.current = 0;
    isProcessingRef.current = false;

    // Iniciar scanner cuando el modal se abre
    // Esperar un poco para que el DOM esté listo
    const timer = setTimeout(() => {
      if (scannerRef.current && !html5QrCodeRef.current) {
        startScanner();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        await html5QrCodeRef.current.clear();
      } catch (err) {
        console.debug('Error stopping scanner:', err);
      }
      html5QrCodeRef.current = null;
      setIsScanning(false);
    }
  };

  const startScanner = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const html5QrCode = new Html5Qrcode(scannerRef.current.id);
      html5QrCodeRef.current = html5QrCode;

      // Configuración optimizada para códigos de barras en móviles
      const config = {
        fps: 10, // Frames por segundo
        qrbox: { width: 250, height: 200 }, // Área de escaneo más grande para códigos de barras
        aspectRatio: 1.0, // Ratio de aspecto
        // Formatos de códigos de barras comunes en supermercados
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
        ],
        // Mejorar detección en móviles
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // Usar API nativa si está disponible
        },
      };

      scanConfigRef.current = config;

      // Intentar usar la cámara trasera primero
      const cameras = await Html5Qrcode.getCameras();
      
      if (cameras.length === 0) {
        throw new Error('No se encontraron cámaras disponibles');
      }

      // Buscar cámara trasera (environment)
      const backCamera = cameras.find(camera => 
        camera.label.toLowerCase().includes('back') || 
        camera.label.toLowerCase().includes('rear') ||
        camera.label.toLowerCase().includes('environment')
      );

      const cameraId = backCamera ? backCamera.id : cameras[0].id;

      await html5QrCode.start(
        cameraId,
        config,
        (decodedText) => {
          // Callback cuando se detecta un código
          handleBarcodeDetected(decodedText);
        },
        (errorMessage) => {
          // Ignorar errores de "no se encontró código" (es normal mientras escaneas)
          // Solo mostrar errores críticos
          if (!errorMessage.includes('No QR code')) {
            console.debug('Scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error iniciando scanner:', err);
      setIsLoading(false);
      setIsScanning(false);
      
      let errorMessage = 'Error al iniciar la cámara';
      
      if (err.name === 'NotAllowedError' || err.message.includes('permission')) {
        errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara en la configuración del navegador.';
      } else if (err.name === 'NotFoundError' || err.message.includes('camera')) {
        errorMessage = 'No se encontró ninguna cámara disponible.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    }
  };

  const handleBarcodeDetected = (text) => {
    const now = Date.now();
    const timeSinceLastDetection = now - lastDetectionTimeRef.current;
    
    // Prevenir detecciones duplicadas:
    // 1. Si es el mismo código que el último detectado
    // 2. Si ya estamos procesando una detección
    // 3. Si pasó menos de 2 segundos desde la última detección
    if (
      text === lastDetectedBarcodeRef.current ||
      isProcessingRef.current ||
      timeSinceLastDetection < 2000
    ) {
      return; // Ignorar esta detección
    }

    // Marcar como procesando y actualizar referencias
    isProcessingRef.current = true;
    lastDetectedBarcodeRef.current = text;
    lastDetectionTimeRef.current = now;

    // Detener el scanner temporalmente para evitar más detecciones
    stopScanner().then(() => {
      // Llamar al callback
      onBarcodeDetected(text);
      
      // Permitir nueva detección después de 2 segundos
      setTimeout(() => {
        isProcessingRef.current = false;
        lastDetectedBarcodeRef.current = null;
        // Reiniciar el scanner si el modal sigue abierto
        if (isOpen) {
          startScanner();
        }
      }, 2000);
    });
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };


  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="full" isCentered>
      <ModalOverlay />
      <ModalContent bg="black">
        <ModalHeader color="white">
          <HStack>
            <Icon as={MdCameraAlt} boxSize={6} />
            <Text>Escanear Código de Barras</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" />
        <ModalBody bg="black" p={0} position="relative">
          <VStack spacing={0} h="90vh" justify="center" align="center">
            {isLoading && (
              <Flex direction="column" align="center" justify="center" h="full" w="full">
                <Spinner size="xl" color="white" thickness="4px" mb={4} />
                <Text color="white">Iniciando cámara...</Text>
              </Flex>
            )}

            {error && (
              <Alert status="error" borderRadius="lg" m={4}>
                <AlertIcon />
                <VStack align="start" spacing={2}>
                  <Text fontWeight="bold">Error de cámara</Text>
                  <Text fontSize="sm">{error}</Text>
                  <HStack>
                    <Button size="sm" colorScheme="blue" onClick={startScanner}>
                      Reintentar
                    </Button>
                    <Button size="sm" colorScheme="red" onClick={handleClose}>
                      Cerrar
                    </Button>
                  </HStack>
                </VStack>
              </Alert>
            )}

            <Box 
              position="relative" 
              w="100%" 
              h="100%" 
              bg="black" 
              overflow="hidden"
              display={error ? 'none' : 'block'}
            >
              {/* Contenedor del scanner - debe estar siempre presente */}
              <Box
                id="barcode-scanner"
                ref={scannerRef}
                w="100%"
                h="100%"
                position="relative"
              />

              {/* Overlay con área de escaneo visual */}
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w={{ base: '80%', md: '60%' }}
                h={{ base: '30%', md: '35%' }}
                border="3px solid"
                borderColor="green.400"
                borderRadius="md"
                pointerEvents="none"
                boxShadow="0 0 30px rgba(74, 222, 128, 0.5)"
                zIndex={10}
              >
                {/* Esquinas decorativas */}
                <Box
                  position="absolute"
                  top="-2px"
                  left="-2px"
                  w="30px"
                  h="30px"
                  borderTop="4px solid"
                  borderLeft="4px solid"
                  borderColor="green.400"
                  borderRadius="4px 0 0 0"
                />
                <Box
                  position="absolute"
                  top="-2px"
                  right="-2px"
                  w="30px"
                  h="30px"
                  borderTop="4px solid"
                  borderRight="4px solid"
                  borderColor="green.400"
                  borderRadius="0 4px 0 0"
                />
                <Box
                  position="absolute"
                  bottom="-2px"
                  left="-2px"
                  w="30px"
                  h="30px"
                  borderBottom="4px solid"
                  borderLeft="4px solid"
                  borderColor="green.400"
                  borderRadius="0 0 0 4px"
                />
                <Box
                  position="absolute"
                  bottom="-2px"
                  right="-2px"
                  w="30px"
                  h="30px"
                  borderBottom="4px solid"
                  borderRight="4px solid"
                  borderColor="green.400"
                  borderRadius="0 0 4px 0"
                />
              </Box>

              {/* Instrucciones */}
              <VStack 
                position="absolute" 
                bottom={6} 
                left={0} 
                right={0} 
                spacing={2}
                zIndex={10}
                px={4}
              >
                <Text color="white" fontWeight="bold" textAlign="center" fontSize="lg">
                  Apunta al código de barras
                </Text>
                <Text color="gray.300" fontSize="sm" textAlign="center">
                  Mantén el código dentro del cuadro verde
                </Text>
                <Button size="md" onClick={handleClose} colorScheme="red" mt={2}>
                  Cerrar
                </Button>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BarcodeCameraScanner;
