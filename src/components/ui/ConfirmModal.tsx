import React from 'react';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isAlert?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isAlert = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="modal-overlay" 
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      style={{
        zIndex: 9999, // Ensure it is on top of everything
      }}
    >
      <div 
        className="modal-content" 
        style={{ 
          maxWidth: '450px', 
          width: '90%', 
          animation: 'modalFadeIn 0.25s ease-out'
        }}
      >
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: '700' }}>
          {title}
        </h3>
        
        <p style={{ 
          fontSize: '0.95rem', 
          color: 'var(--text-secondary)', 
          lineHeight: '1.5',
          marginBottom: '1.75rem',
          whiteSpace: 'pre-wrap' // Preserve line breaks for messages
        }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          {!isAlert && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button type="button" variant={isAlert ? 'primary' : 'danger'} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
