-- Guarded workspace membership management.

create or replace function public.update_organization_member_role(
  target_organization_id uuid,
  target_user_id uuid,
  next_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  current_role text;
  owner_count integer;
begin
  select role into actor_role
  from public.organization_memberships
  where organization_id = target_organization_id
    and user_id = auth.uid();

  if actor_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can manage member roles.';
  end if;

  if next_role not in ('owner', 'admin', 'project_manager', 'accountant', 'staff', 'viewer') then
    raise exception 'Invalid role.';
  end if;

  select role into current_role
  from public.organization_memberships
  where organization_id = target_organization_id
    and user_id = target_user_id;

  if current_role is null then
    raise exception 'Member not found.';
  end if;

  if actor_role = 'admin' and current_role in ('owner', 'admin') then
    raise exception 'Admins cannot manage owners or admins.';
  end if;

  if actor_role = 'admin' and next_role in ('owner', 'admin') then
    raise exception 'Admins cannot promote members to owner or admin.';
  end if;

  if current_role = 'owner' and next_role <> 'owner' then
    select count(*) into owner_count
    from public.organization_memberships
    where organization_id = target_organization_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'An organization must keep at least one owner.';
    end if;
  end if;

  update public.organization_memberships
  set role = next_role,
      updated_at = now()
  where organization_id = target_organization_id
    and user_id = target_user_id;
end;
$$;

create or replace function public.remove_organization_member(
  target_organization_id uuid,
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_role text;
  current_role text;
  owner_count integer;
begin
  select role into actor_role
  from public.organization_memberships
  where organization_id = target_organization_id
    and user_id = auth.uid();

  if actor_role not in ('owner', 'admin') then
    raise exception 'Only owners and admins can remove members.';
  end if;

  select role into current_role
  from public.organization_memberships
  where organization_id = target_organization_id
    and user_id = target_user_id;

  if current_role is null then
    raise exception 'Member not found.';
  end if;

  if actor_role = 'admin' and current_role in ('owner', 'admin') then
    raise exception 'Admins cannot remove owners or admins.';
  end if;

  if current_role = 'owner' then
    select count(*) into owner_count
    from public.organization_memberships
    where organization_id = target_organization_id
      and role = 'owner';

    if owner_count <= 1 then
      raise exception 'An organization must keep at least one owner.';
    end if;
  end if;

  delete from public.project_assignments
  where user_id = target_user_id
    and exists (
      select 1
      from public.projects project
      where project.id = project_assignments.project_id
        and project.org_id = target_organization_id
    );

  delete from public.organization_memberships
  where organization_id = target_organization_id
    and user_id = target_user_id;
end;
$$;
