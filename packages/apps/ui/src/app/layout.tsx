import { Roboto, Geist, Geist_Mono } from 'next/font/google';
import { AppSidebar } from '@/components/app-sidebar';
import { Separator } from '@/components/ui/separator';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { ThemeProvider } from '@/components/theme-provider';

import './global.css';
import { fileClassifierApi } from '@/api';
import Breadcrumbs from '@/components/breadcrumbs';
import { HeaderUser } from '@/components/header-user';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
});

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: 'Diligence Machine',
  description: 'Diligence Machine',
};

type RootLayoutProps = {
  children: React.ReactNode;
};
export default async function RootLayout({ children }: RootLayoutProps) {
  const projects = await fileClassifierApi.getProjects();

  return (
    <html lang="en" suppressHydrationWarning className={roboto.variable}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NuqsAdapter>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            <SidebarProvider>
              <AppSidebar
                projects={projects.data}
                onDeleteProjectAction={async (projectId, isActive) => {
                  'use server';

                  await fileClassifierApi.deleteProject(projectId);

                  revalidatePath('/');
                  revalidatePath(`/project`);
                  revalidatePath(`/project/${projectId}`);

                  if (isActive) {
                    redirect(`/project`);
                  }
                }}
              />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-muted/50">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator
                      orientation="vertical"
                      className="mr-2 data-[orientation=vertical]:h-4"
                    />
                    <Breadcrumbs />
                  </div>
                  {/* User profile moved to top right */}
                  <div className="px-4">
                    <HeaderUser />
                  </div>
                </header>
                <div className="flex flex-1 flex-col gap-4 p-4 pt-0 bg-muted/50 min-h-screen">
                  {children}
                </div>
              </SidebarInset>
            </SidebarProvider>
          </ThemeProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
