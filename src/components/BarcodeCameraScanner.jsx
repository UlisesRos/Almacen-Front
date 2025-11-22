// --- UNIVERSAL BARCODE SCANNER (ANDROID + IPHONE) ---
// PRIORIDAD:
// 1) Si BarcodeDetector está soportado → usarlo (más rápido y preciso)
// 2) Si NO está soportado (iPhone Safari) → fallback automático a ZXing
// 3) UI igual para ambos, detección eficiente
// 4) Cámara trasera por defecto

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

const BarcodeCameraScanner = ({ isOpen, onClose, onBarcodeDetected }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const barcodeReaderRef = useRef(null); // ZXING fallback
  const scanRef = useRef(null); // BarcodeDetector loop

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const toast = useToast();

  const barcodeSupported = 'BarcodeDetector' in window;

  // -----------------------------------------------
  // Enumerar cámaras y elegir trasera
  // -----------------------------------------------

  useEffect(() => {
    if (!isOpen) return;

    const loadCameras = async () => {
      try {
        // Necesario en iPhone para habilitar labels
        try {
          const tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
          tempStream.getTracks().forEach(t => t.stop());
        } catch (e) {}

        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter(d => d.kind === 'videoinput');
        setAvailableDevices(cams);

        const backCam = cams.find(c => /back|rear|environment/i.test(c.label));
        setSelectedDeviceId(backCam ? backCam.deviceId : cams[0]?.deviceId);
      } catch (err) {
        setError('No se pudieron obtener las cámaras del dispositivo');
      }
    };

    loadCameras();
  }, [isOpen]);

  // -----------------------------------------------
  // Cuando se selecciona cámara → iniciar escaner
  // -----------------------------------------------

  useEffect(() => {
    if (!isOpen || !selectedDeviceId) return;

    startCamera();

    return () => stopEverything();
  }, [isOpen, selectedDeviceId]);

  // -----------------------------------------------
  // Iniciar cámara
  // -----------------------------------------------

  const startCamera = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const constraints = {
        video: {
          deviceId: { exact: selectedDeviceId },
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const video = videoRef.current;
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.muted = true;
      await video.play();

      // Android Chrome → BarcodeDetector
      // iPhone Safari → ZXing fallback
      if (barcodeSupported) {
        startBarcodeDetector();
      } else {
        startZXingFallback();
      }
    } catch (err) {
      setError('No se pudo iniciar la cámara. Revisa permisos.');
    } finally {
      setIsLoading(false);
    }
  };

  // -----------------------------------------------
  // STOP ALL
  // -----------------------------------------------

  const stopEverything = () => {
    if (scanRef.current) cancelAnimationFrame(scanRef.current);

    if (barcodeReaderRef.current) {
      try {
        barcodeReaderRef.current.reset();
      } catch {}
      barcodeReaderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const handleClose = () => {
    stopEverything();
    onClose();
  };

  // -----------------------------------------------
  // 1) BarcodeDetector (ANDROID)
  // -----------------------------------------------

  const startBarcodeDetector = () => {
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'upc_a'] });
    const video = videoRef.current;

    const scan = async () => {
      if (video.readyState >= 2) {
        try {
          const detections = await detector.detect(video);
          if (detections.length > 0) {
            return handleBarcodeFound(detections[0].rawValue);
          }
        } catch (err) {
          console.log('Detector error:', err);
        }
      }
      scanRef.current = requestAnimationFrame(scan);
    };

    scanRef.current = requestAnimationFrame(scan);
  };

  // -----------------------------------------------
  // 2) ZXing FALLBACK (IPHONE)
  // -----------------------------------------------

  const startZXingFallback = () => {
    const reader = new BrowserMultiFormatReader();
    barcodeReaderRef.current = reader;

    reader.decodeFromVideoDevice(selectedDeviceId, videoRef.current, (result, err) => {
      if (result) {
        handleBarcodeFound(result.getText());
      }
    }).catch(err => console.log('ZXing error:', err));
  };

  // -----------------------------------------------
  // Cuando encuentra un código
  // -----------------------------------------------

  const handleBarcodeFound = (code) => {
    stopEverything();

    toast({
      title: 'Código detectado',
      description: code,
      status: 'success',
      duration: 1000,
    });

    onBarcodeDetected(code);

    setTimeout(() => onClose(), 600);
  };

  // -----------------------------------------------
  // UI
  // -----------------------------------------------

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

        <ModalBody bg="black" p={0}>
          {isLoading && (
            <Flex direction="column" align="center" justify="center" h="80vh">
              <Spinner size="xl" color="white" mb={4} />
              <Text color="white">Iniciando cámara...</Text>
            </Flex>
          )}

          {error && (
            <Alert status="error" borderRadius="lg" m={4}>
              <AlertIcon />
              <Text>{error}</Text>
            </Alert>
          )}

          {!error && (
            <Box position="relative" w="100%" h="90vh" overflow="hidden">
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                playsInline
                autoPlay
                muted
              />

              <Box
                position="absolute"
                top="50%"
                left="50%"
                transform="translate(-50%, -50%)"
                w="300px"
                h="150px"
                border="3px solid"
                borderColor="green.400"
                borderRadius="md"
                pointerEvents="none"
              />
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BarcodeCameraScanner;





