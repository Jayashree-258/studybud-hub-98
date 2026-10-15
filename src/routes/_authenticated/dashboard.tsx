import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Clock, FileText, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getRecent } from "@/lib/recent";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Life Saver" }] }),
  component: Dashboard,
});

const PAGE_SIZE = 9;

function Dashboard() {
  const [courseId, setCourseId] = useState<string>("");
  const [semesterId, setSemesterId] = useState<string>("all");
  const [subjectId, setSubjectId] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [recent, setRecent] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => setRecent(getRecent()), []);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(0), [courseId, semesterId, subjectId, debounced]);

  const { data: courses = [] } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => (await supabase.from("courses").select("*").order("name")).data ?? [],
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!courseId && courses.length) setCourseId(courses[0]!.id);
  }, [courses, courseId]);

  const { data: semesters = [] } = useQuery({
    queryKey: ["semesters", courseId],
    enabled: !!courseId,
    queryFn: async () =>
      (await supabase.from("semesters").select("*").eq("course_id", courseId).order("number")).data ?? [],
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["subjects", semesters.map((s) => s.id).join()],
    enabled: semesters.length > 0,
    queryFn: async () =>
      (
        await supabase
          .from("subjects")
          .select("*")
          .in("semester_id", semesters.map((s) => s.id))
          .order("name")
      ).data ?? [],
  });

  const visibleSubjects = useMemo(
    () => (semesterId === "all" ? subjects : subjects.filter((s) => s.semester_id === semesterId)),
    [subjects, semesterId],
  );
  const subjectIds = subjectId === "all" ? visibleSubjects.map((s) => s.id) : [subjectId];

  const { data: notesResult, isLoading } = useQuery({
    queryKey: ["notes", subjectIds.join(), debounced, page],
    enabled: subjectIds.length > 0,
    queryFn: async () => {
      let q = supabase
        .from("notes")
        .select("id, title, summary, tags, download_count, subject_id, subjects(name)", { count: "exact" })
        .in("subject_id", subjectIds)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (debounced.trim()) {
        const term = debounced.trim().replace(/[%,]/g, "");
        q = q.or(`title.ilike.%${term}%,summary.ilike.%${term}%,content.ilike.%${term}%`);
      }
      const { data, count } = await q;
      return { notes: data ?? [], count: count ?? 0 };
    },
  });

  const notes = notesResult?.notes ?? [];
  const totalPages = Math.max(1, Math.ceil((notesResult?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Your notes</h1>
        <p className="mt-1 text-muted-foreground">Pick your course and semester, then dive in.</p>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <Select value={courseId} onValueChange={(v) => { setCourseId(v); setSemesterId("all"); setSubjectId("all"); }}>
            <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
            <SelectContent>
              {courses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={semesterId} onValueChange={(v) => { setSemesterId(v); setSubjectId("all"); }}>
            <SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All semesters</SelectItem>
              {semesters.map((s) => <SelectItem key={s.id} value={s.id}>Semester {s.number}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {visibleSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search notes…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {recent.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Recent:</span>
            {recent.map((r) => (
              <Link key={r.id} to="/notes/$noteId" params={{ noteId: r.id }} className="rounded-full border border-border bg-card px-3 py-1 hover:bg-secondary">
                {r.title}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading && <p className="text-muted-foreground">Loading notes…</p>}
          {!isLoading && notes.length === 0 && (
            <p className="text-muted-foreground">No notes found. Try a different filter or search.</p>
          )}
          {notes.map((n) => (
            <Link
              key={n.id}
              to="/notes/$noteId"
              params={{ noteId: n.id }}
              className="group flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-primary">{n.subjects?.name}</span>
              <h3 className="mt-2 text-lg font-semibold leading-snug group-hover:text-primary">{n.title}</h3>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{n.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                {n.tags.slice(0, 3).map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}
                <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                  <FileText className="h-3 w-3" /> {n.download_count}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</Button>
            <span className="text-sm text-muted-foreground">Page {page + 1} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        )}
      </main>
    </div>
  );
}
