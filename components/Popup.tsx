import { useEffect } from 'react';

type PopupVariant = 'success' | 'danger' | 'warning' | 'info';

interface PopupProps {
  show: boolean;
  onClose: () => void;
  message: string;
  title?: string;
  variant?: PopupVariant;
  autoCloseMs?: number;
}

const variantConfig: Record<PopupVariant, { title: string; color: string }> = {
  success: { title: 'Operación exitosa', color: 'success' },
  danger: { title: 'Ha ocurrido un error', color: 'danger' },
  warning: { title: 'Atención', color: 'warning' },
  info: { title: 'Información', color: 'info' },
};

export default function Popup({
  show,
  onClose,
  message,
  title,
  variant = 'info',
  autoCloseMs = 0,
}: PopupProps) {
  useEffect(() => {
    if (!show || !autoCloseMs) return;
    const timeout = setTimeout(() => {
      onClose();
    }, autoCloseMs);

    return () => clearTimeout(timeout);
  }, [show, autoCloseMs, onClose]);

  if (!show) return null;

  const { color, title: defaultTitle } = variantConfig[variant];

  return (
    <div
      className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 2000 }}
    >
      <div className="bg-white rounded-4 shadow-lg p-4" style={{ minWidth: '280px', maxWidth: '90%' }}>
        <h5 className={`text-${color} fw-bold mb-3`}>{title || defaultTitle}</h5>
        <p className="text-dark mb-4" style={{ whiteSpace: 'pre-line' }}>
          {message}
        </p>
        <button className={`btn btn-${color} w-100`} onClick={onClose}>
          Aceptar
        </button>
      </div>
    </div>
  );
}
