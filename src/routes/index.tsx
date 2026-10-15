import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, BookmarkCheck, Download, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Life Saver — Exam-Ready Notes for UG Students" },
      {
        name: "description",
        content:
          "Syllabus-based, exam-oriented notes for undergraduate students. Browse by course and semester, search, bookmark and download printable PDFs.",
      },
      { property: "og:title", content: "Life Saver — Exam-Ready Notes for UG Students" },
      {
        property: "og:description",
        content:
          "Syllabus-based, exam-oriented notes for undergraduate students. Search, bookmark and download printable PDFs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: BookOpen,
    title: "Syllabus-based notes",
    text: "Organized by course, semester, subject and unit — exactly the way your exams are.",
  },
  {
    icon: Search,
    title: "Search & filters",
    text: "Find definitions, key concepts and examples in seconds across every subject.",
  },
  {
    icon: BookmarkCheck,
    title: "Bookmarks & recents",
    text: "Save notes for revision and jump back to what you were reading.",
  },
  {
    icon: Download,
    title: "Printable PDFs",
    text: "Clean, professional PDFs with cover details and structured content.",
  },
  {
    icon: Sparkles,
    title: "Important questions",
    text: "Every note ships with exam questions, answers and mark weightage.",
  },
  {
    icon: ShieldCheck,
    title: "Secure accounts",
    text: "Sign in with email, Google or Lovable. Your data stays private.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-bold">Life Saver</span>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost">
            <Link to="/auth">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Get started</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 text-center">
          <p className="mx-auto mb-4 w-fit rounded-full border border-border bg-card px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            For undergraduate students
          </p>
          <h1 className="mx-auto max-w-3xl text-5xl font-bold leading-tight md:text-6xl">
            Notes that actually <span className="text-primary">save</span> your semester
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Concise, exam-oriented notes with definitions, key concepts, examples, important
            questions and quick revision summaries — organized by your syllabus.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start reading free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">Browse notes</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-secondary text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-6xl px-6 py-16 text-center">
            <h2 className="text-3xl font-bold">Ready before your next exam?</h2>
            <p className="mt-3 text-muted-foreground">
              Create a free account and start revising in minutes.
            </p>
            <Button asChild size="lg" className="mt-6">
              <Link to="/auth">Create your account</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        Life Saver — study smarter, not longer.
      </footer>
    </div>
  );
}
