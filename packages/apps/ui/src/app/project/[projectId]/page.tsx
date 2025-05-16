'use client';

import { fileClassifierApi } from '@/api';
import { use, useState } from 'react';
import Dropzone, { DropzoneState } from 'shadcn-dropzone';
import axios from 'axios';
import { FileRead } from '@/file-classifier-api';

type PageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default function Page({ params }: PageProps) {
  const { projectId } = use(params);
  const [files, setFiles] = useState<FileRead[]>([]);

  return (
    <div className="flex flex-col gap-2">
      <Dropzone
        onDrop={async (acceptedFiles: File[]) => {
          for (const file of acceptedFiles) {
            const { data: uploadIntent } = await fileClassifierApi.uploadIntent(
              {
                project_id: projectId,
              },
              {
                file_name: file.name,
                file_size: file.size,
              }
            );

            await axios.put(uploadIntent.upload_url, file);

            setFiles((prev) => [...prev, uploadIntent.file]);
          }
        }}
      >
        {(dropzone: DropzoneState) => (
          <>
            <div
              className={`flex items-center flex-col gap-1.5 h-32 justify-center`}
            >
              <div className="flex items-center flex-row gap-0.5 text-sm font-medium">
                {dropzone.isDragAccept
                  ? 'Drop your files here!'
                  : 'Upload files'}
              </div>
            </div>
          </>
        )}
      </Dropzone>
      {files.map((file) => (
        <div key={file.id}>{file.name}</div>
      ))	}
    </div>
  );
}
