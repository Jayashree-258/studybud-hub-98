import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookmarkX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/bookmarks")({
  head: () => ({ meta: [{ title: "Bookmarks — Life Saver" }] }),
  component: BookmarksPage,
});

function BookmarksPage() {
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select("id, created_at, notes(id, title, summary, tags, subjects(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Your bookmarks</h1>
        <p className="mt-1 text-muted-foreground">Notes you saved for revision.</p>

        {isLoading && <p className="mt-8 text-muted-foreground">Loading…</p>}
        {!isLoading && bookmarks.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center">
            <BookmarkX className="h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">
              No bookmarks yet. Open a note and hit Bookmark to save it here.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookmarks.map((b) =>
            b.notes ? (
              <Link
                key={b.id}
                to="/notes/$noteId"
                params={{ noteId: b.notes.id }}
                className="flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {b.notes.subjects?.name}
                </span>
                <h3 className="mt-2 text-lg font-semibold leading-snug">{b.notes.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{b.notes.summary}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {b.notes.tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </Link>
            ) : null,
          )}
        </div>
      </main>
    </div>
  );
}
