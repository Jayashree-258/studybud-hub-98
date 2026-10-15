import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { BookOpen, Download, FileText, Pencil, Plus, ShieldAlert, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader, useIsAdmin } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Life Saver" }] }),
  component: AdminPage,
});

interface NoteForm {
  id?: string;
  title: string;
  summary: string;
  content: string;
  subject_id: string;
  tags: string;
  is_published: boolean;
}

const emptyNote: NoteForm = { title: "", summary: "", content: "", subject_id: "", tags: "", is_published: true };

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const [noteForm, setNoteForm] = useState<NoteForm>(emptyNote);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newCourse, setNewCourse] = useState({ name: "", code: "" });
  const [newSubject, setNewSubject] = useState({ name: "", code: "", semester_id: "" });

  useEffect(() => {
    if (!roleLoading && !isAdmin) navigate({ to: "/dashboard" });
  }, [roleLoading, isAdmin, navigate]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const [users, notes, downloads, bookmarks] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("notes").select("id", { count: "exact", head: true }),
        supabase.from("downloads").select("id", { count: "exact", head: true }),
        supabase.from("bookmarks").select("id", { count: "exact", head: true }),
      ]);
      return {
        users: users.count ?? 0,
        notes: notes.count ?? 0,
        downloads: downloads.count ?? 0,
        bookmarks: bookmarks.count ?? 0,
      };
    },
  });

  const { data: topNotes = [] } = useQuery({
    queryKey: ["admin-top-notes"],
    enabled: !!isAdmin,
    queryFn: async () =>
      (await supabase.from("notes").select("id, title, download_count, subjects(name)").order("download_count", { ascending: false }).limit(10)).data ?? [],
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["admin-notes"],
    enabled: !!isAdmin,
    queryFn: async () =>
      (await supabase.from("notes").select("id, title, is_published, download_count, subjects(name)").order("created_at", { ascending: false })).data ?? [],
  });

  const { data: subjects = [] } = useQuery({
    queryKey: ["admin-subjects"],
    enabled: !!isAdmin,
    queryFn: async () => (await supabase.from("subjects").select("id, name, semester_id").order("name")).data ?? [],
  });

  const { data: semesters = [] } = useQuery({
    queryKey: ["admin-semesters"],
    enabled: !!isAdmin,
    queryFn: async () =>
      (await supabase.from("semesters").select("id, number, courses(name)").order("number")).data ?? [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, created_at").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const saveNote = useMutation({
    mutationFn: async (form: NoteForm) => {
      const payload = {
        title: form.title,
        summary: form.summary,
        content: form.content,
        subject_id: form.subject_id,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_published: form.is_published,
      };
      if (form.id) {
        const { error } = await supabase.from("notes").update(payload).eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notes").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Note saved");
      setDialogOpen(false);
      setNoteForm(emptyNote);
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Note deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-notes"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const addCourse = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("courses").insert(newCourse);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Course added");
      setNewCourse({ name: "", code: "" });
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  const addSubject = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("subjects").insert(newSubject);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Subject added");
      setNewSubject({ name: "", code: "", semester_id: "" });
      queryClient.invalidateQueries();
    },
    onError: (e) => toast.error(e.message),
  });

  if (roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex flex-col items-center py-24 text-muted-foreground">
          <ShieldAlert className="h-10 w-10" />
          <p className="mt-3">{roleLoading ? "Checking access…" : "Admins only."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-3xl font-bold">Admin dashboard</h1>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, label: "Students", value: stats?.users },
            { icon: FileText, label: "Notes", value: stats?.notes },
            { icon: Download, label: "Downloads", value: stats?.downloads },
            { icon: BookOpen, label: "Bookmarks", value: stats?.bookmarks },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <s.icon className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{s.value ?? "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="notes" className="mt-8">
          <TabsList>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="catalog">Catalog</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="notes" className="mt-4">
            <div className="mb-4 flex justify-end">
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => setNoteForm(emptyNote)}>
                    <Plus className="mr-2 h-4 w-4" /> New note
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{noteForm.id ? "Edit note" : "New note"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Select value={noteForm.subject_id} onValueChange={(v) => setNoteForm({ ...noteForm, subject_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Choose subject" /></SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Summary</Label>
                      <Input value={noteForm.summary} onChange={(e) => setNoteForm({ ...noteForm, summary: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Content (markdown)</Label>
                      <Textarea rows={12} value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags (comma separated)</Label>
                      <Input value={noteForm.tags} onChange={(e) => setNoteForm({ ...noteForm, tags: e.target.value })} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={noteForm.is_published} onCheckedChange={(v) => setNoteForm({ ...noteForm, is_published: v })} />
                      <Label>Published</Label>
                    </div>
                    <Button
                      className="w-full"
                      disabled={!noteForm.title || !noteForm.subject_id || !noteForm.content || saveNote.isPending}
                      onClick={() => saveNote.mutate(noteForm)}
                    >
                      Save note
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notes.map((n) => (
                    <TableRow key={n.id}>
                      <TableCell className="font-medium">{n.title}</TableCell>
                      <TableCell>{n.subjects?.name}</TableCell>
                      <TableCell>{n.download_count}</TableCell>
                      <TableCell>{n.is_published ? "Published" : "Draft"}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const { data } = await supabase.from("notes").select("*").eq("id", n.id).single();
                            if (data) {
                              setNoteForm({ ...data, tags: data.tags.join(", "), summary: data.summary ?? "" });
                              setDialogOpen(true);
                            }
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteNote.mutate(n.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="catalog" className="mt-4 space-y-6">
            <Card>
              <CardHeader><CardTitle>Add course</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={newCourse.name} onChange={(e) => setNewCourse({ ...newCourse, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input value={newCourse.code} onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })} />
                </div>
                <Button disabled={!newCourse.name || !newCourse.code || addCourse.isPending} onClick={() => addCourse.mutate()}>Add</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Add subject</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                  <Label>Semester</Label>
                  <Select value={newSubject.semester_id} onValueChange={(v) => setNewSubject({ ...newSubject, semester_id: v })}>
                    <SelectTrigger className="w-56"><SelectValue placeholder="Choose semester" /></SelectTrigger>
                    <SelectContent>
                      {semesters.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.courses?.name} — Sem {s.number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={newSubject.name} onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input value={newSubject.code} onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })} />
                </div>
                <Button disabled={!newSubject.name || !newSubject.semester_id || addSubject.isPending} onClick={() => addSubject.mutate()}>Add</Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Most downloaded notes</CardTitle></CardHeader>
              <CardContent>
                <ol className="space-y-2">
                  {topNotes.map((n, i) => (
                    <li key={n.id} className="flex items-center justify-between text-sm">
                      <span>{i + 1}. {n.title} <span className="text-muted-foreground">({n.subjects?.name})</span></span>
                      <span className="font-semibold">{n.download_count}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            <div className="rounded-xl border border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
