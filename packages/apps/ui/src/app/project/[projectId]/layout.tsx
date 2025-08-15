import { getProjects } from '@/clients/api';
import { PartialZustandStoreProvider } from '@/store/provider';

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    projectId: string;
  }>;
};
export default async function Layout({ children, params }: LayoutProps) {
  const projects = await getProjects();
  const { projectId } = await params;

  const project = projects.data?.find((project) => project.id === projectId);

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <PartialZustandStoreProvider state={{ project }}>
      {children}
    </PartialZustandStoreProvider>
  );
}
