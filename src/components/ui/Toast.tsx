'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps): JSX.Element {
  useEffect(() => {
    const timeout = setTimeout(onClose, 2000);
    return () => clearTimeout(timeout);
  }, [onClose]);

  return (
    <div className="fixed bottom-4 right-4 z-50 rounded-md border border-border bg-surface px-4 py-3 text-sm text-text shadow-lg">
      {message}
    </div>
  );
}
