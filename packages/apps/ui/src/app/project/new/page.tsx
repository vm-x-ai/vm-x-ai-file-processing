import ProjectForm from '@/components/project/form';
import { submitForm } from './actions';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

export default async function ProjectPage() {
  return (
    <div className="grid grid-cols-1 gap-4">
      <h3 className="text-2xl font-bold">Create New Project</h3>
      <Separator />
      <ProjectForm submitAction={submitForm} />
    </div>
  );
}
