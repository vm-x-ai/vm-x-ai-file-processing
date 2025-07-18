import { StoreProvider } from '@/store/provider';
import { fileClassifierApi } from '@/api';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    projectId: string;
  }>;
};
export default async function Layout({ children, params }: LayoutProps) {
  const projects = await fileClassifierApi.getProjects();
  const { projectId } = await params;

  const project = projects.data.find((project) => project.id === projectId);

  if (!project) {
    return <div>Project not found</div>;
  }

  return <StoreProvider state={{ project }}>{children}</StoreProvider>;
}
