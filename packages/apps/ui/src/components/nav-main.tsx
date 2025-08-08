'use client';

import { ChevronRight, LayoutTemplate, SquareTerminal } from 'lucide-react';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import Link from 'next/link';
import { useAppStore } from '@/store/provider';

export function NavMain() {
  const project = useAppStore((state) => state.project);

  const items = project
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
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible
            key={item.title}
            asChild
            defaultOpen={item.isActive}
            className="group/collapsible"
          >
            <SidebarMenuItem>
              <CollapsibleTrigger asChild>
                <SidebarMenuButton tooltip={item.title}>
                  {item.icon && <item.icon />}
                  <span>{item.title}</span>
                  <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.items?.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.title}>
                      <SidebarMenuSubButton asChild>
                        <Link href={subItem.url}>
                          <span>{subItem.title}</span>
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              </CollapsibleContent>
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
