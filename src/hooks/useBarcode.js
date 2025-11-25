import { useState, useEffect, useRef } from 'react';

export const useBarcode = () => {
  const [barcode, setBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isScannerReady, setIsScannerReady] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);
  const scanIntervalRef = useRef(null);

  useEffect(() => {
    // Cargar la librería html5-qrcode
    if (!window.Html5QrcodeScanner) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.4/html5-qrcode.min.js';
      script.onload = () => setIsScannerReady(true);
      script.onerror = () => console.error('Error loading html5-qrcode library');
      document.body.appendChild(script);
    } else {
      setIsScannerReady(true);
    }

    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (err) {
          console.log('Scanner cleanup:', err);
        }
      }
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, []);

  const startScanning = (onScan, container = 'barcode-scanner') => {
    if (!isScannerReady || !window.Html5QrcodeScanner) {
      console.error('Scanner not ready');
      return;
    }

    try {
      setIsScanning(true);
      
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        disableFlip: false,
        rememberLastUsedCamera: true,
        showTorchButtonIfSupported: true,
      };

      const scanner = new window.Html5QrcodeScanner(container, config, false);
      scannerRef.current = scanner;

      const onScanSuccess = (decodedText) => {
        setBarcode(decodedText);
        onScan(decodedText);
      };

      const onScanError = (error) => {
        // Ignorar errores silenciosamente mientras escanea
      };

      scanner.render(onScanSuccess, onScanError);

    } catch (err) {
      console.error('Error starting scanner:', err);
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        scannerRef.current = null;
      } catch (err) {
        console.log('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  };

  return {
    barcode,
    setBarcode,
    isScanning,
    isScannerReady,
    startScanning,
    stopScanning,
    videoRef,
  };
};