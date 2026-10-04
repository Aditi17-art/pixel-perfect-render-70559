import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  BookOpen,
  ChevronDown,
  Home,
  Images,
  Info,
  LogOut,
  Menu,
  ScanLine,
  ShieldAlert,
  Settings,
  User,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProfile } from "@/lib/analyses";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: Home },
  { to: "/segmentation", label: "Segmentation", icon: ScanLine },
  { to: "/results", label: "Results", icon: Images },
  { to: "/qa-review", label: "AI Review", icon: ShieldAlert },
  { to: "/research", label: "Research", icon: BookOpen },
  { to: "/about", label: "About", icon: Info },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function useProfile() {
  return useQuery({ queryKey: ["profile"], queryFn: getProfile });
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const displayName = profile?.fullName?.trim() || profile?.email?.split("@")[0] || "Researcher";
  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <Link to="/dashboard" className="mb-4 flex items-center gap-2.5 px-2" onClick={() => setOpen(false)}>
        <span className="flex size-9 items-center justify-center rounded-xl bg-accent-gradient text-primary-foreground">
          <Activity className="size-4.5" />
        </span>
        <span className="font-display text-base font-semibold">SpineSeg AI</span>
      </Link>
      {nav.map((item) => {
        const active = pathname === item.to;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <div className="mt-auto space-y-1 border-t border-sidebar-border pt-3">
        <Link
          to="/profile"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <User className="size-4" />
          <span className="truncate">{displayName}</span>
        </Link>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-soft">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-foreground/20" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 bg-sidebar shadow-panel">
            <button
              className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/85 px-4 backdrop-blur sm:px-8">
          <button
            className="rounded-md p-2 text-muted-foreground lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-display text-sm font-semibold lg:hidden">SpineSeg AI</span>

          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
              <Link to="/segmentation">New analysis</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-accent">
                <span className="flex size-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {initials || "SA"}
                </span>
                <span className="hidden max-w-32 truncate font-medium sm:block">{displayName}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <p className="font-medium">{displayName}</p>
                  <p className="truncate text-xs font-normal text-muted-foreground">{profile?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/results">Previous analyses</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subtitle}</p> : null}
            <div className="mt-8">{children}</div>
            <p className="mt-14 rounded-xl border border-border bg-card/70 p-4 text-xs leading-relaxed text-muted-foreground">
              <span className="font-medium text-foreground">Research Disclaimer. </span>
              This platform is intended for research and educational purposes only. It is not a medical diagnostic
              tool and should not be used for clinical diagnosis or treatment decisions.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
