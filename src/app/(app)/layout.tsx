import { SiteSidebar } from "@/components/site-sidebar";
import { Header } from "@/components/header";
import { Sidebar, SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
        <Sidebar>
            <SiteSidebar />
        </Sidebar>
        <SidebarInset>
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1 p-4 md:p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </SidebarInset>
    </SidebarProvider>
  );
}
