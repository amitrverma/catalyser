import { isSupabaseConfigured, supabase } from './supabase';

export type ProjectAssignment = {
  projectId: string;
  userId: string;
};

export async function listProjectAssignments(projectIds: string[] = []): Promise<ProjectAssignment[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  let query = supabase.from('project_assignments').select('project_id, user_id');
  if (projectIds.length > 0) {
    query = query.in('project_id', projectIds);
  }

  const result = await query;
  if (result.error) {
    console.error('Supabase project assignment lookup failed:', result.error);
    return [];
  }

  return (result.data || []).map((assignment) => ({
    projectId: assignment.project_id,
    userId: assignment.user_id,
  }));
}

export async function listCurrentUserProjectIds(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const result = await supabase
    .from('project_assignments')
    .select('project_id')
    .eq('user_id', user.id);

  if (result.error) {
    console.error('Supabase project assignment lookup failed:', result.error);
    return [];
  }

  return (result.data || []).map((assignment) => assignment.project_id);
}

export async function replaceProjectAssignments(projectId: string, userIds: string[]) {
  if (!isSupabaseConfigured || !supabase) return false;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const deleteResult = await supabase.from('project_assignments').delete().eq('project_id', projectId);
  if (deleteResult.error) {
    console.error('Supabase project assignment delete failed:', deleteResult.error);
    return false;
  }

  if (userIds.length === 0) return true;

  const insertResult = await supabase.from('project_assignments').insert(
    userIds.map((userId) => ({
      project_id: projectId,
      user_id: userId,
      assigned_by: user.id,
    })),
  );

  if (insertResult.error) {
    console.error('Supabase project assignment save failed:', insertResult.error);
    return false;
  }

  return true;
}
