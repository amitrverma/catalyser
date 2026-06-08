-- Allow organization members to see basic profile emails for co-members.

drop policy if exists "Members can read profiles of organization co-members" on public.profiles;
create policy "Members can read profiles of organization co-members"
on public.profiles for select
using (
  auth.uid() = user_id
  or exists (
    select 1
    from public.organization_memberships viewer_membership
    join public.organization_memberships target_membership
      on target_membership.organization_id = viewer_membership.organization_id
    where viewer_membership.user_id = auth.uid()
      and target_membership.user_id = profiles.user_id
  )
);
