'use client';

import { ProjectReadWithStats } from '@/clients/api/types.gen';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Plus, Trash } from 'lucide-react';
import { Separator } from '../ui/separator';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { formatFileSize } from '@/utils/file';
import { useState } from 'react';
import { DeleteProjectDialog } from './delete-dialog';

export type ProjectListProps = {
  projects: ProjectReadWithStats[];
  onDeleteAction: (projectId: string) => void;
};

export function ProjectList({ projects, onDeleteAction }: ProjectListProps) {
  const [projectToDelete, setProjectToDelete] =
    useState<ProjectReadWithStats | null>(null);

  const handleDelete = (
    event: React.MouseEvent<HTMLButtonElement>,
    project: ProjectReadWithStats
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setProjectToDelete(project);
  };

  return (
    <div className="grid grid-cols-1 gap-4 w-full">
      <div className="grid grid-cols-3 gap-4">
        {projects.map((project) => (
          <Link key={project.id} href={`/project/${project.id}/files`}>
            <Card className={cn('gap-2 pt-2 hover:cursor-pointer')}>
              <CardHeader className="flex flex-row justify-between items-center pr-2">
                <CardTitle className="text-lg font-bold">
                  {project.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(event) => handleDelete(event, project)}
                >
                  <Trash className="text-red-500" />
                </Button>
              </CardHeader>
              <Separator />
              <CardContent className="grid grid-cols-1 gap-4">
                <div className="flex flex-col gap-2">
                  <strong>Project Description</strong>
                  <span className="text-sm text-muted-foreground">
                    {project.description}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <strong>Created At</strong>
                  <span className="text-sm text-muted-foreground">
                    {new Date(project.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div className="flex flex-col gap-2">
                    <strong>Total Files</strong>
                    <span className="text-sm text-muted-foreground">
                      {project.total_files_count}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <strong>Completed</strong>
                    <span className="text-sm text-muted-foreground">
                      {project.completed_files_count}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <strong>Failed</strong>
                    <span className="text-sm text-muted-foreground">
                      {project.failed_files_count}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    <strong>Total Size</strong>
                    <span className="text-sm text-muted-foreground">
                      {formatFileSize(project.total_size ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <strong>Total Evaluations</strong>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-muted-foreground">
                      {project.total_evaluations}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-4">
        <Card
          className={cn(
            'gap-2 pt-2 hover:cursor-pointer border-dashed border-2 border-gray-400'
          )}
        >
          <Link
            href="/project/new"
            className="h-full w-full hover:cursor-pointer"
          >
            <CardContent className="flex flex-row items-center justify-center h-[100px]">
              <div className="flex flex-row items-center gap-2 mt-2">
                <Plus className="text-gray-400" />
                <span className="text-gray-400 text-lg font-bold">
                  Create New Project
                </span>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
      {projectToDelete && (
        <DeleteProjectDialog
          open={!!projectToDelete}
          onOpenChange={() => setProjectToDelete(null)}
          project={projectToDelete}
          onCancel={() => setProjectToDelete(null)}
          onConfirm={async (project) => {
            await onDeleteAction(project.id);
            setProjectToDelete(null);
          }}
        />
      )}
    </div>
  );
}
