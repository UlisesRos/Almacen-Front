import { useEffect, useRef, useCallback } from 'react';

export const useBarcode = (onBarcodeDetected, options = {}) => {
  const {
    minLength = 8,
    maxLength = 20,
    timeout = 100,
  } = options;

  const bufferRef = useRef('');
  const timeoutRef = useRef(null);

  const processBuffer = useCallback(() => {
    if (bufferRef.current.length >= minLength && bufferRef.current.length <= maxLength) {
      onBarcodeDetected(bufferRef.current);
    }
    bufferRef.current = '';
  }, [onBarcodeDetected, minLength, maxLength]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignorar si está escribiendo en un input (excepto si es el scanner)
      if (event.target.tagName === 'INPUT' && 
          event.target.className !== 'barcode-scanner-input') {
        return;
      }

      // Caracteres válidos en códigos de barras (alfanuméricos)
      if (/^[\w-]$/.test(event.key) || event.key === 'Enter') {
        event.preventDefault();

        if (event.key === 'Enter') {
          processBuffer();
        } else {
          bufferRef.current += event.key;

          // Resetear timeout
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          // Procesar después del timeout si no hay más input
          timeoutRef.current = setTimeout(processBuffer, timeout);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [processBuffer, timeout]);

  const resetBuffer = () => {
    bufferRef.current = '';
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return { resetBuffer, buffer: bufferRef.current };
};