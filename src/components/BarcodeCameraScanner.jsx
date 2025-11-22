import { useEffect, useRef } from 'react';
import Quagga from 'quagga';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Spinner,
  Flex
} from '@chakra-ui/react';
import { MdCameraAlt } from 'react-icons/md';

const BarcodeCameraScanner = ({ isOpen, onClose, onBarcodeDetected }) => {
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const startScanner = () => {
      Quagga.init(
        {
          inputStream: {
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }
          },
          decoder: {
            readers: [
              'ean_reader',
              'ean_8_reader',
              'code_128_reader',
              'upc_reader',
              'upc_e_reader'
            ]
          },
          locator: {
            patchSize: 'medium',
            halfSample: true
          }
        },
        (err) => {
          if (err) {
            console.log('Error Quagga:', err);
            return;
          }
          Quagga.start();
        }
      );

      Quagga.onDetected(handleDetected);
    };

    const handleDetected = (result) => {
      const code = result.codeResult.code;
      if (code) {
        onBarcodeDetected(code);
        Quagga.stop();
        onClose();
      }
    };

    startScanner();

    return () => {
      try {
        Quagga.stop();
      } catch {}
      Quagga.offDetected(handleDetected);
    };
  }, [isOpen, onClose, onBarcodeDetected]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalOverlay />
      <ModalContent bg="black">
        <ModalHeader color="white">
          <HStack>
            <Icon as={MdCameraAlt} boxSize={6} />
            <Text>Escanear Código de Barras</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton color="white" />

        <ModalBody p={0}>
          <Box
            ref={scannerRef}
            w="100%"
            h="100vh"
            position="relative"
            overflow="hidden"
          />

          {/* Overlay */}
          <VStack
            position="absolute"
            bottom={6}
            left={0}
            right={0}
            spacing={1}
          >
            <Text color="white" fontWeight="bold" textAlign="center">
              Apunta al código de barras
            </Text>
          </VStack>

          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w="80%"
            h="120px"
            border="3px solid green"
            borderRadius="lg"
            pointerEvents="none"
          />
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BarcodeCameraScanner;
