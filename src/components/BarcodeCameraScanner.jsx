import { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import {
  Box,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useToast,
  VStack,
  HStack,
  Text,
  Icon,
  Alert,
  AlertIcon,
  Spinner,
  Flex,
} from '@chakra-ui/react';
import { MdCameraAlt, MdClose } from 'react-icons/md';

const BarcodeCameraScanner = ({ isOpen, onClose, onBarcodeDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const scanLoopRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;

    const startCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            setCameraReady(true);
            startScanning();
          };
        }
      } catch (err) {
        const errorMsg = err.name === 'NotAllowedError' 
          ? 'Permiso de cámara denegado. Habilita la cámara en configuración del navegador.'
          : err.message || 'No se pudo acceder a la cámara';
        
        setError(errorMsg);
        toast({
          title: 'Error de cámara',
          description: errorMsg,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (scanLoopRef.current) {
        cancelAnimationFrame(scanLoopRef.current);
      }
    };
  }, [isOpen, toast]);

  const startScanning = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const video = videoRef.current;
    const detectedCodes = new Set();

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            const barcodeValue = code.data;
            
            // Evitar duplicados (detecta el mismo código múltiples veces)
            if (!detectedCodes.has(barcodeValue)) {
              detectedCodes.add(barcodeValue);
              handleBarcodeFound(barcodeValue);
              
              // Limpiar después de 1 segundo
              setTimeout(() => {
                detectedCodes.delete(barcodeValue);
              }, 1000);
            }
          }
        } catch (err) {
          console.log('Error escaneando:', err);
        }
      }

      scanLoopRef.current = requestAnimationFrame(scan);
    };

    scan();
  };

  const handleBarcodeFound = (barcode) => {
    if (barcode && barcode.length >= 8) {
      onBarcodeDetected(barcode);
      toast({
        title: 'Código detectado',
        description: `Código: ${barcode}`,
        status: 'success',
        duration: 2000,
        isClosable: true,
      });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" isCentered>
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
              <Flex direction="column" align="center" justify="center" h="full">
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
                  <Button size="sm" colorScheme="red" onClick={onClose}>
                    Cerrar
                  </Button>
                </VStack>
              </Alert>
            )}

            {cameraReady && !error && (
              <Box
                position="relative"
                w="100%"
                h="100%"
                bg="black"
                overflow="hidden"
              >
                <video
                  ref={videoRef}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
                <canvas ref={canvasRef} display="none" />

                {/* Overlay guide */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  transform="translate(-50%, -50%)"
                  w="300px"
                  h="150px"
                  border="3px solid"
                  borderColor="green.400"
                  borderRadius="lg"
                  pointerEvents="none"
                  boxShadow="0 0 20px rgba(74, 222, 128, 0.5)"
                />

                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bottom={0}
                  bg="blackAlpha.300"
                  pointerEvents="none"
                />

                {/* Instrucciones */}
                <VStack
                  position="absolute"
                  bottom={6}
                  left={0}
                  right={0}
                  spacing={2}
                >
                  <Text color="white" fontWeight="bold" textAlign="center">
                    Apunta al código de barras
                  </Text>
                  <Text color="gray.300" fontSize="sm" textAlign="center">
                    Asegúrate de que esté dentro del cuadro verde
                  </Text>
                </VStack>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BarcodeCameraScanner;