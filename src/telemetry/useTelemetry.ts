/**
 * Hook React tipis di atas TelemetryLogger.
 * Logger disimpan di useRef supaya identitasnya stabil antar render
 * dan pencatatan 60 fps tidak memicu re-render.
 */
import { useEffect, useRef } from 'react';
import { db } from './TelemetryDB';
import { TelemetryLogger } from './TelemetryLogger';

export function useTelemetry(): TelemetryLogger {
  const loggerRef = useRef<TelemetryLogger | null>(null);
  if (loggerRef.current === null) {
    loggerRef.current = new TelemetryLogger(db);
  }

  useEffect(() => {
    const logger = loggerRef.current;
    return () => {
      // Pastikan data terakhir tersimpan saat komponen unmount.
      void logger?.endSession();
    };
  }, []);

  return loggerRef.current;
}
