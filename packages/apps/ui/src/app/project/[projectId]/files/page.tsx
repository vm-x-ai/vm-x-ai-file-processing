'use client';

import { use } from 'react';
import Dropzone, { DropzoneState } from 'shadcn-dropzone';
import axios from 'axios';
import FileCard from '@/components/file-card';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getFilesOptions,
  uploadIntentMutation,
} from '@/clients/api/@tanstack/react-query.gen';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default function Page({ params }: PageProps) {
  const { projectId } = use(params);
  const files = useQuery({
    ...getFilesOptions({
      path: {
        project_id: projectId,
      },
    }),
  });

  const uploadIntent = useMutation({
    ...uploadIntentMutation(),
  });

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Dropzone
          accept={{
            'application/pdf': ['.pdf'],
            'text/plain': ['.txt'],
          }}
          dropZoneClassName="border-2 border-dashed border-gray-300 rounded-md"
          onDrop={async (acceptedFiles: File[]) => {
            for (const file of acceptedFiles) {
              const data = await uploadIntent.mutateAsync({
                path: {
                  project_id: projectId,
                },
                body: {
                  file_name: file.name,
                  file_size: file.size,
                },
              });

              await axios.put(data.upload_url, file, {
                headers: data.headers,
              });

              files.refetch();
            }
          }}
        >
          {(dropzone: DropzoneState) => (
            <div
              className={`flex items-center flex-col gap-1.5 h-32 justify-center`}
            >
              <div className="flex items-center flex-row gap-0.5 text-sm font-medium">
                {dropzone.isDragAccept
                  ? 'Drop your files here!'
                  : 'Upload files'}
              </div>
              <div className="text-gray-500">Accepted file types: pdf</div>
            </div>
          )}
        </Dropzone>
      </div>
      <div className="col-span-12">
        <div className="grid grid-cols-4 gap-4">
          {files.data?.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={() => {
                files.refetch();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
