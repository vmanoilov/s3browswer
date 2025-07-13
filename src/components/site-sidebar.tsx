"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShieldCheck, CalendarClock, LineChart, ShieldAlert } from "lucide-react";
import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "./ui/button";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/scans", label: "Scans", icon: ShieldCheck },
  { href: "/scheduled", label: "Scheduled Scans", icon: CalendarClock },
  { href: "/reporting", label: "Reporting", icon: LineChart },
];

export function SiteSidebar() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="p-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
            <Button variant="ghost" size="icon" className="bg-primary/10 hover:bg-primary/20">
                <ShieldAlert className="w-5 h-5 text-primary" />
            </Button>
            <h1 className="text-lg font-semibold text-sidebar-foreground font-headline tracking-tight">S3Droid Scanner</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-1 p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                className="justify-start"
                tooltip={item.label}
              >
                <Link href={item.href}>
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
         <p className="text-xs text-sidebar-foreground/60">&copy; 2024 S3Droid Inc.</p>
      </SidebarFooter>
    </>
  );
}
