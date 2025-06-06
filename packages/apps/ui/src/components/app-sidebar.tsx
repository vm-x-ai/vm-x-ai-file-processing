'use client';

import * as React from 'react';
import { LayoutTemplate, SquareTerminal } from 'lucide-react';

import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
import { DMLogo } from '@/components/ui/dm-logo';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar';
import { ProjectRead } from '@/file-classifier-api';
import { useStore } from '@/store/store';

type AppSidebarProps = React.ComponentProps<typeof Sidebar> & {
  projects: ProjectRead[];
  onDeleteProjectAction: (
    projectId: string,
    isActive: boolean
  ) => Promise<void>;
};

export function AppSidebar({
  projects,
  onDeleteProjectAction,
  ...props
}: AppSidebarProps) {
  const { project } = useStore();

  const navMain = project
    ? [
        {
          title: 'Project',
          url: '#',
          icon: SquareTerminal,
          isActive: true,
          items: [
            {
              title: 'Explore',
              url: `/project/${project?.id}/explore`,
            },
            {
              title: 'Files',
              url: `/project/${project?.id}/files`,
            },
            {
              title: 'Evaluations',
              url: `/project/${project?.id}/evaluations`,
            },
            {
              title: 'Results',
              url: `/project/${project?.id}/results`,
            },
          ],
        },
        {
          title: 'Templates',
          url: '#',
          icon: LayoutTemplate,
          isActive: true,
          items: [
            {
              title: 'Evaluations',
              url: `/project/${project?.id}/templates/evaluations`,
            },
          ],
        },
      ]
    : [];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* DM Logo */}
        <div className="flex items-center gap-3 p-2">
          <DMLogo size={32} />
          <span className="font-semibold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
            VM-X AI
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects
          projects={projects}
          onDeleteAction={onDeleteProjectAction}
        />
      </SidebarContent>
      <SidebarFooter></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
