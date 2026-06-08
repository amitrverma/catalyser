# Organization Workspace Rollout

This runbook covers the organization-first workspace changes: platform roles, invitations, shared settings, project assignment scoping, and guarded member management.

## Migration Order

Apply Supabase migrations in filename order:

1. `20260530122000_initial_schema.sql`
2. `20260530123000_organizations_and_roles.sql`
3. `20260530131500_enterprise_tenancy_storage.sql`
4. `20260602120000_add_contractor_site_worker_roles.sql`
5. `20260602123000_add_other_contact_role.sql`
6. `20260605120000_platform_roles_and_invitations.sql`
7. `20260605121500_org_scoped_write_policies.sql`
8. `20260605123000_org_scoped_settings.sql`
9. `20260605124500_member_profile_visibility.sql`
10. `20260605130000_accept_organization_invitation.sql`
11. `20260605131500_project_assignments.sql`
12. `20260605133000_staff_assignment_read_policies.sql`
13. `20260605134500_manage_membership_guardrails.sql`

## Pre-Deploy Checks

- Back up Supabase data before applying RLS migrations.
- Confirm all existing users have at least one `organization_memberships` row.
- Confirm every shared business row has the intended `org_id`.
- Review duplicate `company_settings` and `staff_salaries` rows per org. The org-scoped settings migration keeps the most recently updated row.

## Post-Deploy Checks

- Owner can open Settings > Workspace Access.
- Owner can invite a member by email.
- Invited user signs in and joins the existing organization instead of receiving a separate personal workspace.
- Owner/admin can change allowed member roles.
- Last owner cannot be removed or demoted.
- Admin cannot manage owners/admins.
- Staff sees only assigned projects, related payments, related documents, and related contacts.
- Non-staff roles still see workspace-wide data according to their role permissions.

## Current Behavior

- `organization = workspace` in the UI.
- `owner`, `admin`, `project_manager`, `accountant`, `staff`, and `viewer` are platform roles.
- `client`, `vendor`, `supplier`, `contractor`, `site_worker`, and `other` remain directory/contact roles.
- Invitations are stored in-app. Email delivery is not implemented yet.
- Project assignment scoping currently applies only to `staff`.

## Known Follow-Ups

- Add actual invitation email delivery.
- Add a first-run screen for explicit create-or-join workspace onboarding.
- Add project assignment summaries to the Projects list.
- Add automated Supabase policy tests for owner/admin/staff/viewer scenarios.
