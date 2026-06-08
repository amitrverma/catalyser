-- Let an invited signed-in user join the organization tied to their email invitation.

create or replace function public.accept_organization_invitation(invitation_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invitation_record public.organization_invitations%rowtype;
  user_email text;
begin
  select email into user_email
  from auth.users
  where id = auth.uid();

  select *
  into invitation_record
  from public.organization_invitations invitation
  where invitation.id = invitation_id
    and invitation.status = 'pending'
    and lower(invitation.email) = lower(coalesce(user_email, ''))
    and (invitation.expires_at is null or invitation.expires_at > now())
  limit 1;

  if invitation_record.id is null then
    raise exception 'Invitation is not available for this user.';
  end if;

  insert into public.organization_memberships (organization_id, user_id, role)
  values (invitation_record.organization_id, auth.uid(), invitation_record.role)
  on conflict (organization_id, user_id) do update
  set role = excluded.role,
      updated_at = now();

  update public.organization_invitations
  set status = 'accepted',
      accepted_by = auth.uid(),
      accepted_at = now()
  where id = invitation_record.id;

  return invitation_record.organization_id;
end;
$$;
