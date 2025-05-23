import { StoreProvider } from '@/store/provider';
import { fileClassifierApi } from '@/api';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    projectId: string;
    fileId: string;
  }>;
};
export default async function Layout({ children, params }: LayoutProps) {
  const { projectId, fileId } = await params;
  const file = await fileClassifierApi.getFile({
    project_id: projectId,
    file_id: fileId,
  });

  if (!file.data) {
    return <div>File not found</div>;
  }

  return <StoreProvider state={{ file: file.data }}>{children}</StoreProvider>;
}
