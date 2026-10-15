create or replace function public.increment_download(_note_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.notes set download_count = download_count + 1 where id = _note_id
$$;
grant execute on function public.increment_download(uuid) to authenticated;