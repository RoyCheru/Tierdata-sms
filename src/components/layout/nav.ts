import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users2,
  FolderKanban,
  UploadCloud,
  Megaphone,
  MessageSquare,
  CalendarClock,
  Plug,
  FileBarChart,
  ShieldCheck,
  ScrollText,
  Settings,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  end?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [{ to: "/", label: "Dashboard", icon: LayoutDashboard, permission: "reports:read", end: true }],
  },
  {
    label: "Messaging",
    items: [
      { to: "/customers", label: "Customers", icon: Users2, permission: "customers:read" },
      { to: "/groups", label: "Groups", icon: FolderKanban, permission: "groups:read" },
      { to: "/imports", label: "Imports", icon: UploadCloud, permission: "imports:read" },
      { to: "/campaigns", label: "Campaigns", icon: Megaphone, permission: "campaigns:read" },
      { to: "/messages", label: "Messages", icon: MessageSquare, permission: "messages:read" },
      { to: "/schedules", label: "Scheduled", icon: CalendarClock, permission: "schedules:read" },
    ],
  },
  {
    label: "Configuration",
    items: [
      { to: "/provider", label: "Provider", icon: Plug, permission: "provider:read" },
      { to: "/settings", label: "Settings", icon: Settings, permission: "settings:read" },
    ],
  },
  {
    label: "Insights",
    items: [
      { to: "/reports", label: "Reports", icon: FileBarChart, permission: "reports:read" },
      { to: "/audit", label: "Audit log", icon: ScrollText, permission: "audit:read" },
    ],
  },
  {
    label: "Admin",
    items: [{ to: "/users", label: "Users", icon: ShieldCheck, permission: "users:read" }],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_SECTIONS.flatMap((section) => section.items);
