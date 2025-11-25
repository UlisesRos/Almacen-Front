import { useEffect, useRef, useCallback } from 'react';

export const useBarcode = (onBarcodeDetected, options = {}) => {
  const {
    minLength = 8,
    maxLength = 20,
    timeout = 100,
  } = options;

  const bufferRef = useRef('');
  const timeoutRef = useRef(null);

  // Evita repetición del toast
  const lockedRef = useRef(false);

  const processBuffer = useCallback(() => {
    if (lockedRef.current) return; // evita disparar doble

    if (
      bufferRef.current.length >= minLength &&
      bufferRef.current.length <= maxLength
    ) {
      lockedRef.current = true; // bloquea ejecuciones repetidas

      onBarcodeDetected(bufferRef.current);

      // 🔓 desbloquea después de un breve tiempo
      setTimeout(() => {
        lockedRef.current = false;
      }, 300);
    }

    bufferRef.current = '';
  }, [onBarcodeDetected, minLength, maxLength]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (
        event.target.tagName === 'INPUT' &&
        event.target.className !== 'barcode-scanner-input'
      ) {
        return;
      }

      if (/^[\w-]$/.test(event.key) || event.key === 'Enter') {
        event.preventDefault();

        if (event.key === 'Enter') {
          processBuffer();
        } else {
          bufferRef.current += event.key;

          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          timeoutRef.current = setTimeout(processBuffer, timeout);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [processBuffer, timeout]);

  const resetBuffer = () => {
    bufferRef.current = '';
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    lockedRef.current = false; // importante
  };

  return { resetBuffer, buffer: bufferRef.current };
};
