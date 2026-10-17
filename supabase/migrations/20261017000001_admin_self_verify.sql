-- Lets an admin mark their own profile as verified without uploading a selfie or ID,
-- so the founder can test the full app. Regular users can never call this successfully.
create function public.admin_self_verify() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  insert into verifications (user_id, status, id_type, reviewed_at, reviewed_by)
  values (auth.uid(), 'approved', 'pan', now(), auth.uid())
  on conflict (user_id) do update set
    status = 'approved', reject_reason = null, id_path = null, reviewed_at = now(), reviewed_by = auth.uid();
end;
$$;
