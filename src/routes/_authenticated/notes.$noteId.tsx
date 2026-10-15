import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { renderMarkdown } from "@/lib/markdown";
import { downloadNoteAsPdf } from "@/lib/pdf";
import { pushRecent } from "@/lib/recent";
import { recordDownload } from "@/lib/notes.functions";

export const Route = createFileRoute("/_authenticated/notes/$noteId")({
  head: () => ({ meta: [{ title: "Note — Life Saver" }] }),
  component: NotePage,
});

function NotePage() {
  const { noteId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data: note, isLoading } = useQuery({
    queryKey: ["note", noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notes")
        .select("*, subjects(name, code), units(number, title), important_questions(*)")
        .eq("id", noteId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: bookmarked } = useQuery({
    queryKey: ["bookmark", noteId],
    queryFn: async () => {
      const { data } = await supabase.from("bookmarks").select("id").eq("note_id", noteId).maybeSingle();
      return !!data;
    },
  });

  useEffect(() => {
    if (note) pushRecent({ id: note.id, title: note.title });
  }, [note]);

  const html = useMemo(() => (note ? renderMarkdown(note.content) : ""), [note]);

  const toggleBookmark = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      if (bookmarked) {
        await supabase.from("bookmarks").delete().eq("note_id", noteId);
      } else {
        const { error } = await supabase.from("bookmarks").insert({ note_id: noteId, user_id: u.user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookmark", noteId] });
      queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast.success(bookmarked ? "Removed from bookmarks" : "Bookmarked");
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleDownload() {
    if (!note) return;
    const questions = [...note.important_questions].sort((a, b) => a.position - b.position);
    const ok = downloadNoteAsPdf({
      title: note.title,
      subject: `${note.subjects?.name ?? ""}${note.subjects?.code ? ` (${note.subjects.code})` : ""}`,
      unit: note.units ? `Unit ${note.units.number}: ${note.units.title}` : null,
      summary: note.summary,
      contentHtml: html,
      questions,
    });
    if (!ok) {
      toast.error("Please allow pop-ups to download the PDF");
      return;
    }
    try {
      await recordDownload({ data: { noteId } });
    } catch {
      /* download still succeeded for the user */
    }
  }

  if (isLoading) return <div className="min-h-screen bg-background"><AppHeader /><p className="p-8 text-muted-foreground">Loading…</p></div>;
  if (!note) return <div className="min-h-screen bg-background"><AppHeader /><p className="p-8">Note not found.</p></div>;

  const questions = [...note.important_questions].sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/dashboard" className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to notes
        </Link>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          {note.subjects?.name}{note.units ? ` · Unit ${note.units.number}` : ""}
        </p>
        <h1 className="mt-2 text-3xl font-bold leading-tight md:text-4xl">{note.title}</h1>
        {note.summary && <p className="mt-3 text-lg text-muted-foreground">{note.summary}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {note.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={handleDownload}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
          <Button variant="outline" onClick={() => toggleBookmark.mutate()} disabled={toggleBookmark.isPending}>
            {bookmarked ? <BookmarkCheck className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
            {bookmarked ? "Bookmarked" : "Bookmark"}
          </Button>
        </div>

        <article className="prose-note mt-8 rounded-xl border border-border bg-card p-6 md:p-8" dangerouslySetInnerHTML={{ __html: html }} />

        {questions.length > 0 && (
          <section className="mt-8 rounded-xl border border-border bg-card p-6 md:p-8">
            <h2 className="text-2xl font-bold">Important questions</h2>
            <ol className="mt-4 space-y-4">
              {questions.map((q, i) => (
                <li key={q.id} className="border-l-4 border-accent pl-4">
                  <p className="font-semibold">
                    {i + 1}. {q.question} {q.marks && <span className="text-sm font-normal text-muted-foreground">({q.marks} marks)</span>}
                  </p>
                  {q.answer && <p className="mt-1 text-sm text-muted-foreground">{q.answer}</p>}
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
