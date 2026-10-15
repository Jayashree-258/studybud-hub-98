
-- Roles
create type public.app_role as enum ('admin', 'student');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  course_id uuid,
  semester int,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Users read own profile" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(), 'admin'));
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Academic structure
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  created_at timestamptz not null default now()
);
create table public.semesters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  number int not null,
  unique (course_id, number)
);
create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  semester_id uuid not null references public.semesters(id) on delete cascade,
  name text not null,
  code text,
  description text,
  created_at timestamptz not null default now()
);
create table public.units (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  number int not null,
  title text not null,
  unique (subject_id, number)
);
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  title text not null,
  position int not null default 0
);
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  unit_id uuid references public.units(id) on delete set null,
  title text not null,
  summary text,
  content text not null,
  tags text[] not null default '{}',
  is_published boolean not null default true,
  download_count int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_subject_idx on public.notes(subject_id);
create index notes_title_idx on public.notes using gin (to_tsvector('english', title || ' ' || coalesce(summary,'')));

create table public.important_questions (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  question text not null,
  answer text,
  marks int,
  position int not null default 0
);
create table public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  note_id uuid not null references public.notes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, note_id)
);
create table public.downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  note_id uuid not null references public.notes(id) on delete cascade,
  downloaded_at timestamptz not null default now()
);

-- Grants
grant select on public.courses, public.semesters, public.subjects, public.units, public.topics, public.important_questions to authenticated;
grant select on public.courses, public.semesters, public.subjects, public.units, public.topics to anon;
grant select, insert, update, delete on public.notes to authenticated;
grant select on public.notes to anon;
grant select, insert, delete on public.bookmarks to authenticated;
grant select, insert on public.downloads to authenticated;
grant all on public.courses, public.semesters, public.subjects, public.units, public.topics, public.notes, public.important_questions, public.bookmarks, public.downloads to service_role;

alter table public.courses enable row level security;
alter table public.semesters enable row level security;
alter table public.subjects enable row level security;
alter table public.units enable row level security;
alter table public.topics enable row level security;
alter table public.notes enable row level security;
alter table public.important_questions enable row level security;
alter table public.bookmarks enable row level security;
alter table public.downloads enable row level security;

-- Public read for catalog; admin write
create policy "Anyone reads courses" on public.courses for select using (true);
create policy "Admins write courses" on public.courses for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Anyone reads semesters" on public.semesters for select using (true);
create policy "Admins write semesters" on public.semesters for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Anyone reads subjects" on public.subjects for select using (true);
create policy "Admins write subjects" on public.subjects for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Anyone reads units" on public.units for select using (true);
create policy "Admins write units" on public.units for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Anyone reads topics" on public.topics for select using (true);
create policy "Admins write topics" on public.topics for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Anyone reads published notes" on public.notes for select using (is_published or public.has_role(auth.uid(), 'admin'));
create policy "Admins write notes" on public.notes for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Anyone reads questions" on public.important_questions for select using (true);
create policy "Admins write questions" on public.important_questions for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Users manage own bookmarks" on public.bookmarks for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Users insert own downloads" on public.downloads for insert to authenticated with check (user_id = auth.uid());
create policy "Users read own downloads" on public.downloads for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

-- Seed data
insert into public.courses (id, name, code, description) values
  ('11111111-1111-1111-1111-111111111111', 'B.Sc Computer Science', 'BSC-CS', 'Three-year undergraduate program in computer science.'),
  ('22222222-2222-2222-2222-222222222222', 'B.Com (General)', 'BCOM', 'Three-year undergraduate commerce program.');

insert into public.semesters (id, course_id, number) values
  ('31111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 1),
  ('32222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 2),
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 1);

insert into public.subjects (id, semester_id, name, code, description) values
  ('41111111-1111-1111-1111-111111111111', '31111111-1111-1111-1111-111111111111', 'Programming in C', 'CS101', 'Fundamentals of C programming.'),
  ('42222222-2222-2222-2222-222222222222', '31111111-1111-1111-1111-111111111111', 'Mathematics I', 'MA101', 'Calculus and linear algebra.'),
  ('43333333-3333-3333-3333-333333333333', '32222222-2222-2222-2222-222222222222', 'Data Structures', 'CS201', 'Arrays, stacks, queues, trees, graphs.'),
  ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'Financial Accounting', 'FA101', 'Principles of accounting.');

insert into public.units (id, subject_id, number, title) values
  ('51111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', 1, 'Introduction to C'),
  ('52222222-2222-2222-2222-222222222222', '41111111-1111-1111-1111-111111111111', 2, 'Control Statements'),
  ('53333333-3333-3333-3333-333333333333', '43333333-3333-3333-3333-333333333333', 1, 'Arrays and Linked Lists');

insert into public.topics (unit_id, title, position) values
  ('51111111-1111-1111-1111-111111111111', 'History and features of C', 1),
  ('51111111-1111-1111-1111-111111111111', 'Variables and data types', 2),
  ('52222222-2222-2222-2222-222222222222', 'if, else and switch', 1),
  ('52222222-2222-2222-2222-222222222222', 'Loops: for, while, do-while', 2),
  ('53333333-3333-3333-3333-333333333333', 'Array operations', 1),
  ('53333333-3333-3333-3333-333333333333', 'Singly linked lists', 2);

insert into public.notes (id, subject_id, unit_id, title, summary, content, tags) values
  ('61111111-1111-1111-1111-111111111111', '41111111-1111-1111-1111-111111111111', '51111111-1111-1111-1111-111111111111',
   'C Programming Basics — Complete Unit 1 Notes',
   'Definitions, data types, operators and first programs with exam-focused explanations.',
   E'# Introduction to C\n\n## Definition\nC is a general-purpose, procedural programming language developed by Dennis Ritchie at Bell Labs in 1972.\n\n## Key Concepts\n- **Compiled language**: source code is translated to machine code by a compiler.\n- **Structured programming**: programs are built from functions and blocks.\n- **Portability**: C programs run on many platforms with minimal changes.\n\n## Data Types\n| Type | Size | Example |\n|------|------|---------|\n| int | 4 bytes | 42 |\n| float | 4 bytes | 3.14 |\n| char | 1 byte | ''A'' |\n| double | 8 bytes | 3.14159265 |\n\n## Example Program\n```c\n#include <stdio.h>\nint main() {\n    printf("Hello, World!");\n    return 0;\n}\n```\n\n## Quick Revision\n- C is compiled, procedural, portable.\n- main() is the entry point.\n- printf/scanf handle I/O (stdio.h).',
   '{c,basics,unit-1}'),
  ('62222222-2222-2222-2222-222222222222', '41111111-1111-1111-1111-111111111111', '52222222-2222-2222-2222-222222222222',
   'Control Statements in C — Unit 2 Notes',
   'Decision making and looping constructs with examples and common exam traps.',
   E'# Control Statements\n\n## Definition\nControl statements determine the flow of execution of a program.\n\n## Key Concepts\n- **if / else if / else**: conditional branching.\n- **switch**: multi-way branch on an integral expression.\n- **Loops**: for (counted), while (pre-test), do-while (post-test).\n\n## Examples\n```c\nfor (int i = 0; i < 10; i++) printf("%d ", i);\n\nint day = 3;\nswitch (day) {\n  case 1: printf("Mon"); break;\n  default: printf("Other");\n}\n```\n\n## Common Exam Traps\n- Missing break in switch causes fall-through.\n- do-while executes at least once.\n- = vs == in conditions.\n\n## Quick Revision\n- for = known iterations; while = unknown.\n- Always use braces for clarity.',
   '{c,control-flow,unit-2}'),
  ('63333333-3333-3333-3333-333333333333', '43333333-3333-3333-3333-333333333333', '53333333-3333-3333-3333-333333333333',
   'Arrays vs Linked Lists — Unit 1 Notes',
   'Comparison, operations, and complexity analysis for exams.',
   E'# Arrays and Linked Lists\n\n## Definitions\n- **Array**: contiguous collection of elements of the same type, accessed by index.\n- **Linked list**: nodes connected by pointers; each node holds data and a next pointer.\n\n## Comparison\n| Feature | Array | Linked List |\n|---------|-------|-------------|\n| Access | O(1) random | O(n) sequential |\n| Insertion (middle) | O(n) | O(1) with pointer |\n| Memory | Fixed, contiguous | Dynamic, scattered |\n\n## Key Operations\n- Traversal, insertion, deletion, search.\n\n## Quick Revision\n- Array: fast access, costly insert.\n- List: fast insert, slow access.',
   '{data-structures,arrays,linked-lists}');

insert into public.important_questions (note_id, question, answer, marks, position) values
  ('61111111-1111-1111-1111-111111111111', 'Define C language and list its key features.', 'C is a general-purpose procedural language by Dennis Ritchie (1972). Features: compiled, structured, portable, rich operators, low-level memory access.', 5, 1),
  ('61111111-1111-1111-1111-111111111111', 'Explain the basic data types in C with sizes.', 'int (4B), float (4B), char (1B), double (8B). Each has signed/unsigned variants and format specifiers.', 5, 2),
  ('62222222-2222-2222-2222-222222222222', 'Differentiate between while and do-while loops.', 'while is pre-test (may run zero times); do-while is post-test (runs at least once).', 3, 1),
  ('62222222-2222-2222-2222-222222222222', 'Write a program to check if a number is prime using a for loop.', 'Loop i from 2 to n/2; if n % i == 0, not prime. Handle n < 2 separately.', 8, 2),
  ('63333333-3333-3333-3333-333333333333', 'Compare arrays and linked lists with respect to insertion and access time.', 'Array: O(1) access, O(n) insert; Linked list: O(n) access, O(1) insert with pointer.', 5, 1);
