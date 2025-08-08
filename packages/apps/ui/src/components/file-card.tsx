'use client';

import { FileRead } from '@/clients/api/types.gen';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { FILE_TYPE_MAP, formatFileSize } from '@/utils/file';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Trash } from 'lucide-react';
import { CardStatusIndicator } from '@/components/card-status-indicator';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  deleteFileMutation,
  getFileOptions,
} from '@/clients/api/@tanstack/react-query.gen';

const THUMBNAIL_SIZE = 512;

type FileCardProps = {
  file: FileRead;
  readOnly?: boolean;
  onDelete?: (file: FileRead) => void;
};

export default function FileCard({
  file,
  onDelete,
  readOnly = false,
}: FileCardProps) {
  const [statusIndicator, setStatusIndicator] = useState<
    'loading' | 'error' | 'initial' | 'success'
  >(file.status === 'failed' ? 'error' : 'initial');

  const fileQuery = useQuery({
    ...getFileOptions({
      path: {
        project_id: file.project_id,
        file_id: file.id,
      },
    }),
    initialData: file,
    refetchInterval(query) {
      if (
        query.state.data?.status === 'completed' ||
        query.state.data?.status === 'failed'
      ) {
        setStatusIndicator(
          query.state.data?.status === 'completed' ? 'success' : 'error'
        );
        return false;
      } else {
        setStatusIndicator('loading');
      }

      return 2000;
    },
  });

  const deleteFile = useMutation({
    ...deleteFileMutation(),
  });

  const router = useRouter();

  const handleDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();

    await deleteFile.mutateAsync({
      path: {
        project_id: fileQuery.data.project_id,
        file_id: fileQuery.data.id,
      },
    });

    onDelete?.(fileQuery.data);
  };

  const handleClick = () => {
    if (readOnly) {
      return;
    }

    router.push(
      `/project/${fileQuery.data.project_id}/files/${fileQuery.data.id}`
    );
  };

  return (
    <CardStatusIndicator key={fileQuery.data.id} status={statusIndicator}>
      <Card
        className={cn(
          'gap-2 pt-2 h-70 hover:cursor-pointer',
          readOnly && 'hover:cursor-default'
        )}
        onClick={handleClick}
      >
        <CardHeader className="flex flex-row justify-between items-center pr-2">
          <CardTitle className="text-lg font-bold">
            {fileQuery.data.name}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleDelete}>
            <Trash className="text-red-500" />
          </Button>
        </CardHeader>
        <Separator />
        <CardContent className="grid grid-cols-2">
          <div className="col-span-1">
            <div>
              <strong>Status</strong>: {fileQuery.data.status}
            </div>
            <div>
              <strong>Type</strong>: {FILE_TYPE_MAP[fileQuery.data.type]}
            </div>
            <div>
              <strong>Size</strong>: {formatFileSize(fileQuery.data.size)}
            </div>
          </div>
          <div className="col-span-1">
            {fileQuery.data.thumbnail_url ? (
              <Image
                src={fileQuery.data.thumbnail_url}
                alt={`${fileQuery.data.name} thumbnail`}
                className="w-full h-auto object-cover"
                width={THUMBNAIL_SIZE}
                height={THUMBNAIL_SIZE}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-48 bg-gray-100 text-gray-500">
                {FILE_TYPE_MAP[fileQuery.data.type] || 'Unknown Type'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </CardStatusIndicator>
  );
}
