import { getFile } from '@/clients/api';
import { PartialZustandStoreProvider } from '@/store/provider';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    projectId: string;
    fileId: string;
  }>;
};
export default async function Layout({ children, params }: LayoutProps) {
  const { projectId, fileId } = await params;
  const file = await getFile({
    path: {
      project_id: projectId,
      file_id: fileId,
    },
  });

  if (!file.data) {
    return <div>File not found</div>;
  }

  return <PartialZustandStoreProvider state={{ file: file.data }}>{children}</PartialZustandStoreProvider>;
}
