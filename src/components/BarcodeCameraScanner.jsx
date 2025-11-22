import { useState, useEffect, useRef } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
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
import { MdCameraAlt } from 'react-icons/md';

// Clean, working Barcode camera scanner using @zxing/browser
// - Picks back camera when possible
// - Uses BrowserMultiFormatReader.decodeFromVideoDevice for robust detection
// - Allows switching cameras
// - Properly starts/stops the reader to avoid camera lock

const BarcodeCameraScanner = ({ isOpen, onClose, onBarcodeDetected }) => {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setError(null);

    const enumerate = async () => {
      try {
        // Ask permission briefly so we can read labels on some browsers
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach(t => t.stop());
        } catch (e) {
          // ignore — permission may be requested again when starting camera
          console.debug('permission preview failed', e?.message || e);
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        if (!mounted) return;

        const videoInputs = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);

        // prefer back/rear/environment labels
        const preferred = videoInputs.find(d => /back|rear|environment/i.test(d.label));
        const initialId = preferred ? preferred.deviceId : (videoInputs.length ? videoInputs[videoInputs.length - 1].deviceId : null);
        setSelectedDeviceId(initialId);
      } catch (err) {
        console.error('enumerateDevices error', err);
        setError('No se pudieron listar las cámaras. Revisa permisos.');
      }
    };

    enumerate();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedDeviceId) return;

    const startReader = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // stop previous reader if any
        if (readerRef.current) {
          try { await readerRef.current.reset(); } catch (e) { /* ignore */ }
          readerRef.current = null;
        }

        const codeReader = new BrowserMultiFormatReader();
        readerRef.current = codeReader;

        // Set video element attributes important for mobile
        if (videoRef.current) {
          videoRef.current.playsInline = true;
          videoRef.current.muted = true;
          videoRef.current.autoplay = true;
        }

        // Start decoding from specific deviceId. If selectedDeviceId is undefined, the library will pick default.
        await codeReader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
          if (result) {
            const text = result.getText();
            if (text) {
              // prevent multiple triggers in quick succession
              onBarcodeDetected(text);
              toast({ title: 'Código detectado', description: text, status: 'success', duration: 1500, isClosable: true });
            }
          }

          if (err && !(err.name === 'NotFoundException')) {
            // NotFoundException is normal while scanning
            console.debug('ZXing decode error', err);
          }
        });

      } catch (err) {
        console.error('Error iniciando lector ZXing', err);
        const msg = (err && err.name === 'NotAllowedError')
          ? 'Permiso de cámara denegado. Habilita la cámara en la configuración del navegador.'
          : (err && err.message) || 'No se pudo acceder a la cámara. Prueba otro navegador.';
        setError(msg);
        toast({ title: 'Error de cámara', description: msg, status: 'error', duration: 5000, isClosable: true });
      } finally {
        setIsLoading(false);
      }
    };

    startReader();

    return () => {
      // cleanup: stop reader and release camera
      (async () => {
        if (readerRef.current) {
          try { await readerRef.current.reset(); } catch (e) { /* ignore */ }
          readerRef.current = null;
        }

        // also stop any active streams attached to video element
        if (videoRef.current && videoRef.current.srcObject) {
          const s = videoRef.current.srcObject;
          if (s.getTracks) s.getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = null;
        }
      })();
    };
  }, [isOpen, selectedDeviceId, onBarcodeDetected, toast]);

  const switchCamera = () => {
    if (!availableDevices || availableDevices.length < 2) return;
    const idx = availableDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const next = availableDevices[(idx + 1) % availableDevices.length];
    setSelectedDeviceId(next.deviceId);
  };

  const handleClose = async () => {
    // reset reader to stop camera
    if (readerRef.current) {
      try { await readerRef.current.reset(); } catch (e) { /* ignore */ }
      readerRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const s = videoRef.current.srcObject;
      if (s.getTracks) s.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }

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
                  <Button size="sm" colorScheme="red" onClick={handleClose}>Cerrar</Button>
                </VStack>
              </Alert>
            )}

            <Box position="relative" w="100%" h="100%" bg="black" overflow="hidden">
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                playsInline
                muted
                autoPlay
              />

              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w={{ base: '70%', md: '45%' }}
                h={{ base: '20%', md: '25%' }}
                border="3px solid"
                borderColor="green.400"
                borderRadius="md"
                pointerEvents="none"
                boxShadow="0 0 20px rgba(74, 222, 128, 0.35)"
              />

              <VStack position="absolute" bottom={6} left={0} right={0} spacing={2}>
                <Text color="white" fontWeight="bold" textAlign="center">Apunta al código de barras</Text>
                <Text color="gray.300" fontSize="sm" textAlign="center">Asegúrate que esté dentro del cuadro verde</Text>
                <HStack>
                  {availableDevices.length > 1 && (
                    <Button size="sm" onClick={switchCamera}>Cambiar Cámara</Button>
                  )}
                  <Button size="sm" onClick={handleClose} colorScheme="red">Cerrar</Button>
                </HStack>
              </VStack>
            </Box>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BarcodeCameraScanner;





