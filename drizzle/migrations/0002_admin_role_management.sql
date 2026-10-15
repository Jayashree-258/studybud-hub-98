grant insert, delete on public.user_roles to authenticated;
create policy "Admins read all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins grant roles" on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins revoke roles" on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin') and user_id <> auth.uid());
grant insert, update, delete on public.courses, public.semesters, public.subjects, public.units, public.topics, public.important_questions to authenticated;

-- First registered user becomes admin automatically
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''));
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;