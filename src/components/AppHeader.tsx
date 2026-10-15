import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Bookmark, LayoutDashboard, LogOut, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return false;
      const { data } = await supabase.rpc("has_role", { _user_id: u.user.id, _role: "admin" });
      return Boolean(data);
    },
  });
}

export function AppHeader() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin } = useIsAdmin();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-4 w-4" />
          </span>
          <span className="font-display text-lg font-bold">Life Saver</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard">
              <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to="/bookmarks">
              <Bookmark className="mr-1 h-4 w-4" /> Bookmarks
            </Link>
          </Button>
          {isAdmin && (
            <Button asChild variant="ghost" size="sm">
              <Link to="/admin">
                <Shield className="mr-1 h-4 w-4" /> Admin
              </Link>
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            <LogOut className="mr-1 h-4 w-4" /> Sign out
          </Button>
        </nav>
      </div>
    </header>
  );
}
