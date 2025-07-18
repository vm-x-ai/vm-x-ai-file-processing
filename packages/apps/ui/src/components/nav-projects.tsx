'use client';

import { MoreHorizontal, Trash2, Frame, Plus, Pencil } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { ProjectRead } from '@/file-classifier-api';
import Link from 'next/link';
import { DeleteProjectDialog } from './project/delete-dialog';
import { useState } from 'react';
import { useParams } from 'next/navigation';

export type NavProjectsProps = {
  projects: ProjectRead[];
  onDeleteAction: (projectId: string, isActive: boolean) => Promise<void>;
};

export function NavProjects({ projects, onDeleteAction }: NavProjectsProps) {
  const params = useParams();
  const { isMobile } = useSidebar();
  const [projectToDelete, setProjectToDelete] = useState<ProjectRead | null>(
    null
  );

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
        <SidebarGroupLabel>Projects</SidebarGroupLabel>
        <SidebarMenu>
          {projects.map((item) => (
            <SidebarMenuItem key={item.name}>
              <SidebarMenuButton asChild>
                <Link href={`/project/${item.id}`}>
                  <Frame />
                  <span>{item.name}</span>
                </Link>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction showOnHover>
                    <MoreHorizontal />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-48 rounded-lg"
                  side={isMobile ? 'bottom' : 'right'}
                  align={isMobile ? 'end' : 'start'}
                >
                  <DropdownMenuItem asChild>
                    <Link href={`/project/${item.id}/edit`}>
                      <Pencil className="text-muted-foreground" />
                      <span>Edit Project</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setProjectToDelete(item)}>
                    <Trash2 className="text-muted-foreground" />
                    <span>Delete Project</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
          <SidebarMenuItem>
            <SidebarMenuButton className="text-sidebar-foreground/70" asChild>
              <Link href={`/project/new`}>
                <Plus className="text-sidebar-foreground/70" />
                <span>Add Project</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      {projectToDelete && (
        <DeleteProjectDialog
          open={!!projectToDelete}
          onOpenChange={() => setProjectToDelete(null)}
          project={projectToDelete}
          onCancel={() => setProjectToDelete(null)}
          onConfirm={async (project) => {
            setProjectToDelete(null);

            const isActive = params.projectId === project.id;
            await onDeleteAction(project.id, isActive);
          }}
        />
      )}
    </>
  );
}
