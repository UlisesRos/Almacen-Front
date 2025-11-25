import { useEffect, useRef, useCallback } from 'react';

export const useBarcode = (onBarcodeDetected, options = {}) => {
  const {
    minLength = 8,
    maxLength = 20,
    timeout = 100,
  } = options;

  const bufferRef = useRef('');
  const timeoutRef = useRef(null);

  // 🔒 evita repetidos
  const lastBarcodeRef = useRef('');
  const lockRef = useRef(false);

  const processBuffer = useCallback(() => {
    const code = bufferRef.current;

    if (code.length >= minLength && code.length <= maxLength) {

      // ⛔ evita llamar dos veces el mismo código
      if (code === lastBarcodeRef.current) {
        bufferRef.current = '';
        return;
      }

      // ⛔ evita múltiples disparos simultáneos
      if (lockRef.current) return;
      lockRef.current = true;

      lastBarcodeRef.current = code;
      onBarcodeDetected(code);

      // 🔓 desbloquear después de un pequeño delay
      setTimeout(() => {
        lockRef.current = false;
      }, 300);
    }

    bufferRef.current = '';
  }, [onBarcodeDetected, minLength, maxLength]);


  useEffect(() => {
    const handleKeyDown = (event) => {
      // evita escritura normal en inputs
      if (
        event.target.tagName === 'INPUT' &&
        !event.target.classList.contains('barcode-scanner-input')
      ) {
        return;
      }

      // solo permitir caracteres válidos de un escáner
      if (/^[0-9]$/.test(event.key) || event.key === 'Enter') {
        event.preventDefault();

        if (event.key === 'Enter') {
          processBuffer();
        } else {
          bufferRef.current += event.key;

          // reiniciar timeout
          if (timeoutRef.current) clearTimeout(timeoutRef.current);

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
    lastBarcodeRef.current = '';
    lockRef.current = false;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return { resetBuffer, buffer: bufferRef.current };
};
