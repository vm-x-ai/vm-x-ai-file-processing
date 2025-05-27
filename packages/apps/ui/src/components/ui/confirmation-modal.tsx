'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog';
import { Button } from './button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'confirm' | 'alert';
  destructive?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'confirm',
  destructive = false,
}: ConfirmationModalProps) {
  const handleConfirm = () => {
    onConfirm?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {variant === 'confirm' ? (
            <>
              <Button variant="outline" onClick={onClose}>
                {cancelText}
              </Button>
              <Button
                variant={destructive ? 'destructive' : 'default'}
                onClick={handleConfirm}
              >
                {confirmText}
              </Button>
            </>
          ) : (
            <Button onClick={onClose}>OK</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 