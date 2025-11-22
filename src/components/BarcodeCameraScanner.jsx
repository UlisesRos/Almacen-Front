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
import { MdCameraAlt } from 'react-icons/md';

const BarcodeCameraScanner = ({ isOpen, onClose, onBarcodeDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLoopRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const stopTracks = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };

    const getBackCameraDevice = async () => {
      try {

        const partialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        partialStream.getTracks().forEach(t => t.stop());
      } catch (err) {
        // ignore errors here — we'll try again when actually starting camera
        console.debug('Permission preview failed (ok):', err.message || err);
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');

      if (!mounted) return null;

      setAvailableDevices(videoInputs);

      // Prefer device label containing 'back' or 'rear' or 'environment' or the last device (common on mobile)
      const back = videoInputs.find(d => /back|rear|environment/i.test(d.label));
      return back ? back.deviceId : (videoInputs.length ? videoInputs[videoInputs.length - 1].deviceId : null);
    };

    const startCamera = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setCameraReady(false);

        const backDeviceId = await getBackCameraDevice();
        if (!mounted) return;

        // Build constraints: try to use deviceId first (best reliability), fallback to facingMode
        const constraints = {
          video: backDeviceId
            ? { deviceId: { exact: backDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
            : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        };

        // Try navigator.mediaDevices.getUserMedia with constraints
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // If we got here, set selectedDeviceId if available
        const track = stream.getVideoTracks()[0];
        const settings = track.getSettings?.();
        if (settings?.deviceId) setSelectedDeviceId(settings.deviceId);

        if (videoRef.current) {
          // Important attributes for mobile browsers (iOS Safari): playsInline and muted
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.playsInline = true;
          videoRef.current.muted = true;
          videoRef.current.autoplay = true;

          videoRef.current.srcObject = stream;

          // onloadedmetadata often necessary to wait before play and read videoWidth/Height
          videoRef.current.onloadedmetadata = () => {
            try {
              videoRef.current.play().catch(err => console.debug('video play() rejected:', err));
            } catch (err) {
              console.debug('video play error:', err);
            }
            setCameraReady(true);
            startScanning();
          };
        }
      } catch (err) {
        console.error('Error starting camera:', err);
        const errorMsg = (err && err.name === 'NotAllowedError')
          ? 'Permiso de cámara denegado. Habilita la cámara en la configuración del navegador.'
          : (err && err.message) || 'No se pudo acceder a la cámara. Prueba en otro navegador o revisa permisos.';

        setError(errorMsg);
        toast({ title: 'Error de cámara', description: errorMsg, status: 'error', duration: 5000, isClosable: true });
      } finally {
        setIsLoading(false);
      }
    };

    startCamera();

    return () => {
      mounted = false;
      stopTracks();
      if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    };
  }, [isOpen, toast]);

  const startScanning = () => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const video = videoRef.current;
    const detectedCodes = new Set();

    const scan = () => {
      try {
        if (video.readyState >= 2) { // HAVE_CURRENT_DATA
          // Avoid zero width/height
          const vw = video.videoWidth || video.clientWidth;
          const vh = video.videoHeight || video.clientHeight;

          if (vw && vh) {
            canvas.width = vw;
            canvas.height = vh;

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });

              if (code && code.data) {
                const barcodeValue = code.data.trim();

                if (!detectedCodes.has(barcodeValue)) {
                  detectedCodes.add(barcodeValue);
                  handleBarcodeFound(barcodeValue);

                  // allow re-detection after 1 second
                  setTimeout(() => detectedCodes.delete(barcodeValue), 1000);
                }
              }
            } catch (err) {
              // getImageData can throw if canvas is tainted or not ready
              console.debug('getImageData error (ok):', err);
            }
          }
        }
      } catch (err) {
        console.debug('scan loop error:', err);
      }

      scanLoopRef.current = requestAnimationFrame(scan);
    };

    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
    scanLoopRef.current = requestAnimationFrame(scan);
  };

  const handleBarcodeFound = (barcode) => {
    if (barcode && barcode.length >= 8) {
      // Pause scanning briefly to avoid multiple trigger
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.enabled = false);
      }

      onBarcodeDetected(barcode);

      toast({ title: 'Código detectado', description: `Código: ${barcode}`, status: 'success', duration: 1500, isClosable: true });

      // Resume camera after short delay so user sees feedback
      setTimeout(() => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.enabled = true);
      }, 800);
    }
  };

  // Optional: allow manual switch of camera if multiple devices
  const switchCamera = async () => {
    if (!availableDevices || availableDevices.length < 2) return;

    const currentIndex = availableDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];

    // Stop current
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    // Start with next deviceId
    try {
      setIsLoading(true);
      setCameraReady(false);

      const constraints = { video: { deviceId: { exact: nextDevice.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const track = stream.getVideoTracks()[0];
      const settings = track.getSettings?.();
      if (settings?.deviceId) setSelectedDeviceId(settings.deviceId);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try { videoRef.current.play(); } catch (e) { console.debug('replay error:', e); }
        setCameraReady(true);
        startScanning();
      }
    } catch (err) {
      console.error('Switch camera error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Close handler: stop tracks and cancel loop
  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (scanLoopRef.current) cancelAnimationFrame(scanLoopRef.current);
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

            {/* Video area */}
            <Box position="relative" w="100%" h="100%" bg="black" overflow="hidden">
              <video
                ref={videoRef}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  // Prevent the video element from showing controls or UI on mobile
                }}
                playsInline
                muted
                autoPlay
              />

              {/* Hidden canvas used for scanning */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Guide box (transparent) */}
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

              {/* Slight dark overlay edges so center remains bright */}
              <Box position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
                {/* nothing that fully covers the video */}
              </Box>

              {/* Instructions and actions */}
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
