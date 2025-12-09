import { useState, useEffect, useRef } from 'react';
import Quagga from 'quagga';
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

// Scanner de códigos de barras usando Quagga - ESPECIALMENTE DISEÑADO para códigos 1D
// Quagga funciona mucho mejor que html5-qrcode para códigos de barras tradicionales
// Soporta: EAN-13, EAN-8, UPC-A, UPC-E, Code128, Code39, ITF, etc.

const BarcodeCameraScanner = ({ isOpen, onClose, onBarcodeDetected }) => {
  const scannerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const lastDetectedBarcodeRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

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
    const timer = setTimeout(() => {
      if (scannerRef.current) {
        startScanner();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopScanner = () => {
    try {
      if (Quagga && Quagga.stop) {
        Quagga.stop();
      }
    } catch (err) {
      console.debug('Error stopping scanner:', err);
    }
    setIsScanning(false);
  };

  const handleBarcodeDetected = (code) => {
    const now = Date.now();
    const timeSinceLastDetection = now - lastDetectionTimeRef.current;
    
    // Prevenir detecciones duplicadas
    if (
      code === lastDetectedBarcodeRef.current ||
      isProcessingRef.current ||
      timeSinceLastDetection < 2000
    ) {
      return;
    }

    isProcessingRef.current = true;
    lastDetectedBarcodeRef.current = code;
    lastDetectionTimeRef.current = now;

    // Detener el scanner temporalmente
    stopScanner();
    
    // Llamar al callback
    onBarcodeDetected(code);
    
    // Permitir nueva detección después de 2 segundos
    setTimeout(() => {
      isProcessingRef.current = false;
      lastDetectedBarcodeRef.current = null;
      // Reiniciar si el modal sigue abierto
      if (isOpen) {
        startScanner();
      }
    }, 2000);
  };

  const startScanner = async () => {
    if (isScanning) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Configuración optimizada para códigos de barras 1D en móviles
      await Quagga.init(
        {
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: 'environment', // Cámara trasera
              aspectRatio: { min: 1, max: 2 },
            },
          },
          locator: {
            patchSize: 'medium',
            halfSample: false,
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          decoder: {
            readers: [
              'ean_reader',      // EAN-13, EAN-8
              'ean_8_reader',    // EAN-8 específico
              'code_128_reader', // Code 128
              'code_39_reader',  // Code 39
              'code_39_vin_reader',
              'codabar_reader',
              'upc_reader',      // UPC-A
              'upc_e_reader',    // UPC-E
              'i2of5_reader',    // Interleaved 2 of 5
            ],
            debug: {
              showCanvas: false,
              showPatches: false,
              showFoundPatches: false,
              showSkeleton: false,
              showLabels: false,
              showPatchLabels: false,
              showBoundingBox: false,
              showCrosshair: false,
            },
          },
          locate: true,
          frequency: 10, // Revisar cada 10 frames (mejor rendimiento)
        },
        (err) => {
          if (err) {
            console.error('Error iniciando Quagga:', err);
            setIsLoading(false);
            setIsScanning(false);
            
            let errorMessage = 'Error al iniciar la cámara';
            if (err.name === 'NotAllowedError') {
              errorMessage = 'Permiso de cámara denegado. Por favor, permite el acceso a la cámara.';
            } else if (err.name === 'NotFoundError') {
              errorMessage = 'No se encontró ninguna cámara disponible.';
            } else if (err.message) {
              errorMessage = err.message;
            }
            
            setError(errorMessage);
            return;
          }

          // Scanner iniciado correctamente
          Quagga.start();
          setIsScanning(true);
          setIsLoading(false);
        }
      );

      // Callback cuando se detecta un código
      Quagga.onDetected((result) => {
        if (result && result.codeResult && result.codeResult.code) {
          const code = result.codeResult.code;
          handleBarcodeDetected(code);
        }
      });

      // Manejar errores de detección
      Quagga.onProcessed((result) => {
        // Se puede usar para debugging si es necesario
        // console.log('Procesando...', result);
      });

    } catch (err) {
      console.error('Error en startScanner:', err);
      setIsLoading(false);
      setIsScanning(false);
      setError('Error al iniciar el scanner. Por favor, intenta de nuevo.');
    }
  };

  const handleClose = () => {
    stopScanner();
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
              {/* Contenedor del scanner Quagga */}
              <Box
                id="barcode-scanner"
                ref={scannerRef}
                w="100%"
                h="100%"
                position="relative"
                sx={{
                  '& video': {
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  },
                  '& canvas': {
                    display: 'none', // Ocultar canvas de debugging
                  },
                  // Ocultar elementos de debugging de Quagga
                  '& .drawingBuffer': {
                    display: 'none !important',
                  },
                }}
              />

              {/* Overlay con área de escaneo visual */}
              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w={{ base: '80%', md: '60%' }}
                h={{ base: '25%', md: '30%' }}
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
                  Mantén el código dentro del cuadro verde a una distancia cómoda
                </Text>
                <Button size="md" onClick={handleClose} colorScheme="red">
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
