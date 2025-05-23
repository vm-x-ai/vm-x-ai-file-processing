'use client';

import { fileClassifierApi } from '@/api';
import { use, useEffect, useState } from 'react';
import Dropzone, { DropzoneState } from 'shadcn-dropzone';
import axios from 'axios';
import { FileRead } from '@/file-classifier-api';
import FileCard from '@/components/file-card';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default function Page({ params }: PageProps) {
  const { projectId } = use(params);
  const [files, setFiles] = useState<FileRead[]>([]);

  useEffect(() => {
    fileClassifierApi
      .getFiles({
        project_id: projectId,
      })
      .then(({ data }) => {
        setFiles(data);
      });
  }, [projectId]);

  return (
    <div className="grid grid-cols-12 gap-4">
      <div className="col-span-12">
        <Dropzone
          accept={{
            'application/pdf': ['.pdf'],
          }}
          dropZoneClassName="border-2 border-dashed border-gray-300 rounded-md"
          onDrop={async (acceptedFiles: File[]) => {
            for (const file of acceptedFiles) {
              const { data: uploadIntent } =
                await fileClassifierApi.uploadIntent(
                  {
                    project_id: projectId,
                  },
                  {
                    file_name: file.name,
                    file_size: file.size,
                  }
                );

              await axios.put(uploadIntent.upload_url, file, {
                headers: uploadIntent.headers,
              });

              setFiles((prev) => [...prev, uploadIntent.file]);
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
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onDelete={() => {
                setFiles((prev) => prev.filter((f) => f.id !== file.id));
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
