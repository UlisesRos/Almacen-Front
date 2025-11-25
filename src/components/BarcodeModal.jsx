import { useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Button,
  VStack,
  Text,
  Box,
  useToast,
} from '@chakra-ui/react';
import { MdQrCode } from 'react-icons/md';
import { useBarcode } from '../hooks/useBarcode';

export const BarcodeModal = ({ isOpen, onClose, onBarcodeDetected }) => {
  const { isScanning, isScannerReady, startScanning, stopScanning } = useBarcode();
  const toast = useToast();

  useEffect(() => {
    if (isOpen && isScannerReady) {
      startScanning((barcode) => {
        toast({
          title: 'Código detectado',
          description: `Código: ${barcode}`,
          status: 'success',
          duration: 2000,
          isClosable: true,
        });
        onBarcodeDetected(barcode);
        stopScanning();
        onClose();
      }, 'barcode-scanner-container');
    }

    return () => {
      if (isOpen) {
        stopScanning();
      }
    };
  }, [isOpen, isScannerReady, startScanning, stopScanning, onClose, onBarcodeDetected, toast]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent bg="black">
        <ModalHeader color="white">
          <VStack spacing={2}>
            <Text>Escanear Código de Barras</Text>
            <Text fontSize="sm" color="gray.300">
              Acerca el código a la cámara
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton color="white" onClick={() => stopScanning()} />
        <ModalBody pb={6}>
          <VStack spacing={4}>
            {/* Contenedor para el escáner */}
            <Box
              id="barcode-scanner-container"
              w="full"
              bg="black"
              borderRadius="lg"
              overflow="hidden"
              minH="400px"
            />

            {isScanning && (
              <Text fontSize="sm" color="green.300" textAlign="center">
                ✓ Escáner activo - Cámara activada
              </Text>
            )}

            <Button
              w="full"
              colorScheme="red"
              size="lg"
              onClick={() => {
                stopScanning();
                onClose();
              }}
            >
              Cancelar Escaneo
            </Button>
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default BarcodeModal;