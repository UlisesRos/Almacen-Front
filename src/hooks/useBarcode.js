import { useEffect, useRef, useCallback } from "react";

export const useBarcode = (onBarcodeDetected, options = {}) => {
  const {
    minLength = 8,
    maxLength = 50,
    timeout = 80, // ráfaga típica de apps de scanner
  } = options;

  const bufferRef = useRef("");
  const lastTimeRef = useRef(Date.now());
  const lastBarcodeRef = useRef("");
  const timeoutRef = useRef(null);

  const processBuffer = useCallback(() => {
    const code = bufferRef.current.trim();

    if (
      code.length >= minLength &&
      code.length <= maxLength &&
      code !== lastBarcodeRef.current // evita duplicados
    ) {
      lastBarcodeRef.current = code;
      onBarcodeDetected(code);
    }

    bufferRef.current = "";
  }, [minLength, maxLength, onBarcodeDetected]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      // ✅ IGNORAR si el usuario está escribiendo en un input o textarea
      const target = event.target;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
      ) {
        return; // No hacer nada, dejar que el usuario escriba normalmente
      }

      const now = Date.now();
      const timeDiff = now - lastTimeRef.current;

      // Si el usuario está escribiendo normal → ignorar
      if (timeDiff > 120) {
        bufferRef.current = "";
      }

      lastTimeRef.current = now;

      // Solo aceptar números + Enter
      if (!/^[0-9]$/.test(event.key) && event.key !== "Enter") return;

      // ✅ Ahora el preventDefault solo se ejecuta si NO estás en un input
      event.preventDefault();

      if (event.key === "Enter") {
        processBuffer();
      } else {
        bufferRef.current += event.key;

        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        timeoutRef.current = setTimeout(processBuffer, timeout);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [processBuffer, timeout]);

  const resetBuffer = () => {
    bufferRef.current = "";
    lastBarcodeRef.current = "";
    lastTimeRef.current = Date.now();
  };

  return { resetBuffer };
};