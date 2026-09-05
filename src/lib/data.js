import { base44 } from "@/api/base44Client";

export async function loadUsers() {
  return await base44.entities.User.list("-created_date", 100);
}

export async function loadUser(id) {
  return await base44.entities.User.get(id);
}

export async function loadProjects() {
  return await base44.entities.Project.list("-created_date", 100);
}

export async function loadProject(id) {
  return await base44.entities.Project.get(id);
}

export async function loadProjectTasks(projectId) {
  return await base44.entities.Task.filter({ project_id: projectId }, "order_index", 500);
}

export async function loadTeamMembers(projectId) {
  return await base44.entities.TeamMember.filter({ project_id: projectId }, "-joined_at", 100);
}

export async function loadMyTeamMemberships(userId) {
  return await base44.entities.TeamMember.filter({ user_id: userId }, "-joined_at", 200);
}

export async function loadMyProjects(userId) {
  const [led, memberships] = await Promise.all([
    base44.entities.Project.filter({ project_leader_id: userId }, "-created_date", 100),
    loadMyTeamMemberships(userId),
  ]);
  const memberProjectIds = memberships.map((m) => m.project_id);
  const ledIds = new Set(led.map((p) => p.id));
  const extraIds = memberProjectIds.filter((id) => !ledIds.has(id));
  let extras = [];
  if (extraIds.length) {
    extras = await Promise.all(extraIds.map((id) => base44.entities.Project.get(id).catch(() => null)));
    extras = extras.filter(Boolean);
  }
  // dedupe
  const map = new Map();
  [...led, ...extras].forEach((p) => map.set(p.id, p));
  return Array.from(map.values());
}

export async function loadMyTasks(userId) {
  return await base44.entities.Task.filter({ assigned_to: userId }, "due_date", 500);
}

export async function loadAllTasks() {
  return await base44.entities.Task.list("-created_date", 1000);
}

export async function loadProjectWorklogs(projectId) {
  return await base44.entities.WorkLog.filter({ project_id: projectId }, "-log_date", 500);
}

export async function loadMyWorklogs(userId) {
  return await base44.entities.WorkLog.filter({ user_id: userId }, "-log_date", 500);
}

export async function loadAllWorklogs() {
  return await base44.entities.WorkLog.list("-log_date", 500);
}

export async function loadChannels() {
  return await base44.entities.Channel.list("-created_date", 200);
}

export async function loadChannelMessages(channelId) {
  return await base44.entities.ChannelMessage.filter({ channel_id: channelId }, "created_date", 500);
}

export async function loadDirectMessages(conversationId) {
  return await base44.entities.DirectMessage.filter({ conversation_id: conversationId }, "created_date", 500);
}

export async function loadMyNotifications(userId) {
  return await base44.entities.Notification.filter({ user_id: userId }, "-created_date", 100);
}

export async function loadActivityForProject(projectId) {
  const all = await base44.entities.ActivityLog.list("-created_date", 500);
  return all.filter((a) => a.entity_id === projectId || a.changes?.project_id === projectId);
}

// Build/normalize a DM conversation id from two user ids (sorted)
export function dmConversationId(a, b) {
  return [a, b].sort().join("__");
}

// Synchronization helper: logs every mutation to the shared ActivityLog so the
// Centro de Atividades reflects changes from any module. Never throws.
export async function logActivity({ entity_type, entity_id, action, changes }) {
  try {
    await base44.entities.ActivityLog.create({
      entity_type,
      entity_id: entity_id || null,
      action,
      changes: changes || {},
    });
  } catch {}
}

// Cascade delete a project and its related tasks, team members, channels and worklogs.
export async function deleteProject(projectId) {
  await Promise.all([
    base44.entities.Task.deleteMany({ project_id: projectId }).catch(() => {}),
    base44.entities.TeamMember.deleteMany({ project_id: projectId }).catch(() => {}),
    base44.entities.Channel.deleteMany({ project_id: projectId }).catch(() => {}),
    base44.entities.WorkLog.deleteMany({ project_id: projectId }).catch(() => {}),
  ]);
  await base44.entities.Project.delete(projectId);
}

// Cascade delete a task and its related comments and worklogs.
export async function deleteTask(taskId) {
  await Promise.all([
    base44.entities.Comment.deleteMany({ task_id: taskId }).catch(() => {}),
    base44.entities.WorkLog.deleteMany({ task_id: taskId }).catch(() => {}),
  ]);
  await base44.entities.Task.delete(taskId);
}