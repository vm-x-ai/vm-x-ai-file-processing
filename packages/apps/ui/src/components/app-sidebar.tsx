import * as React from 'react';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { deleteProject, getProjects } from '@/clients/api';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { ensureServerClientsInitialized } from '@/clients/server-api-utils';

type AppSidebarProps = React.ComponentProps<typeof Sidebar>;

export async function AppSidebar({ ...props }: AppSidebarProps) {
  const projects = await getProjects();

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <span className="font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            VM-X AI
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
        <NavProjects
          projects={projects.data ?? []}
          onDeleteAction={async (projectId, isActive) => {
            'use server';
            ensureServerClientsInitialized();

            await deleteProject({
              path: {
                project_id: projectId,
              },
            });

            revalidatePath('/');
            revalidatePath(`/project`);
            revalidatePath(`/project/${projectId}`);

            if (isActive) {
              redirect(`/project`);
            }
          }}
        />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
