'use client';

import { FileRead } from '@/file-classifier-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { FILE_TYPE_MAP, formatFileSize } from '@/utils/file';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { CardStatusIndicator } from '@/components/card-status-indicator';
import { useEffect, useMemo, useState } from 'react';
import { fileClassifierApi } from '@/api';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

const THUMBNAIL_SIZE = 512;

type FileCardProps = {
  file: FileRead;
  readOnly?: boolean;
  onDelete?: (file: FileRead) => void;
};

export default function FileCard({
  file: initialFile,
  onDelete,
  readOnly = false,
}: FileCardProps) {
  const router = useRouter();
  const [file, setFile] = useState<FileRead>(initialFile);
  const loadingStatus = useMemo(
    () => file.status !== 'completed' && file.status !== 'failed',
    [file.status]
  );
  const [statusIndicator, setStatusIndicator] = useState<
    'loading' | 'error' | 'initial' | 'success'
  >(file.status === 'failed' ? 'error' : 'initial');

  useEffect(() => {
    if (loadingStatus) {
      const interval = setInterval(() => {
        setStatusIndicator('loading');
        fileClassifierApi
          .getFile({
            project_id: file.project_id,
            file_id: file.id,
          })
          .then(({ data }) => {
            setFile(data);

            if (data.status === 'completed' || data.status === 'failed') {
              clearInterval(interval);

              setStatusIndicator(
                data.status === 'completed' ? 'success' : 'error'
              );
            }
          });
      }, 2000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    await fileClassifierApi.deleteFile({
      project_id: file.project_id,
      file_id: file.id,
    });

    onDelete?.(file);
  };

  const handleClick = () => {
    if (readOnly) {
      return;
    }

    router.push(`/project/${file.project_id}/files/${file.id}`);
  };

  return (
    <CardStatusIndicator key={file.id} status={statusIndicator}>
      <Card
        className={cn(
          'gap-2 pt-2 h-70 hover:cursor-pointer',
          readOnly && 'hover:cursor-default'
        )}
        onClick={handleClick}
      >
        <CardHeader className="flex flex-row justify-between items-center pr-2">
          <CardTitle className="text-lg font-bold">{file.name}</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash className="text-red-500" />
          </Button>
        </CardHeader>
        <Separator />
        <CardContent className="grid grid-cols-2">
          <div className="col-span-1">
            <div>
              <strong>Status</strong>: {file.status}
            </div>
            <div>
              <strong>Type</strong>: {FILE_TYPE_MAP[file.type]}
            </div>
            <div>
              <strong>Size</strong>: {formatFileSize(file.size)}
            </div>
          </div>
          <div className="col-span-1">
            {file.thumbnail_url ? (
              <Image
                src={file.thumbnail_url}
                alt={`${file.name} thumbnail`}
                className="w-full h-auto object-cover"
                width={THUMBNAIL_SIZE}
                height={THUMBNAIL_SIZE}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-48 bg-gray-100 text-gray-500">
                {FILE_TYPE_MAP[file.type] || 'Unknown Type'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </CardStatusIndicator>
  );
}
