'use client';

import { ProjectRead } from '@/clients/api/types.gen';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useTransition } from 'react';

export type DeleteProjectDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectRead;
  onCancel: () => void;
  onConfirm: (project: ProjectRead) => Promise<void>;
};

export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  onCancel,
  onConfirm,
}: DeleteProjectDialogProps) {
  const [isDeleting, startTransition] = useTransition();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete all
            uploaded files, evaluations and embeddings for this project.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isDeleting}
            onClick={async () => {
              await startTransition(async () => {
                await onConfirm(project);
              });
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
