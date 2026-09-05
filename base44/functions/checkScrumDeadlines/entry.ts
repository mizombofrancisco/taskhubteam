import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole.entities;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const soon = new Date(today);
    soon.setDate(soon.getDate() + 3);

    // Projetos Scrum (SCRUM ou BOTH)
    const [scrumOnly, both] = await Promise.all([
      db.Project.filter({ methodology: "SCRUM" }, "-created_date", 500),
      db.Project.filter({ methodology: "BOTH" }, "-created_date", 500),
    ]);
    const projects = [...scrumOnly, ...both];

    let overdueNotified = 0;
    let sprintNotified = 0;

    for (const project of projects) {
      // 1. Tarefas atrasadas (não concluídas e com prazo vencido)
      const tasks = await db.Task.filter({ project_id: project.id }, "-created_date", 500);
      const overdueTasks = tasks.filter(
        (t) => t.stage !== "DONE" && t.due_date && new Date(t.due_date) < today
      );
      for (const t of overdueTasks) {
        if (!t.assigned_to) continue;
        const link = `task:${t.id}`;
        const existing = await db.Notification.filter({ user_id: t.assigned_to, link });
        if (existing.length) continue;
        await db.Notification.create({
          user_id: t.assigned_to,
          type: "TASK_OVERDUE",
          title: `Tarefa atrasada: ${t.title}`,
          body: `A tarefa ${t.reference || ""} do projeto "${project.name}" está atrasada (prazo: ${t.due_date}).`,
          link,
        });
        overdueNotified++;
      }

      // 2. Sprints a expirar (próximos 3 dias) ou já expirados
      const sprints = await db.Sprint.filter({ project_id: project.id }, "-start_date", 100);
      const activeSprints = sprints.filter((s) => s.status === "ACTIVE" && s.end_date);
      for (const s of activeSprints) {
        const end = new Date(s.end_date);
        const isOverdue = end < today;
        const isDueSoon = end >= today && end <= soon;
        if (!isOverdue && !isDueSoon) continue;

        const link = `sprint:${s.id}`;
        // Notificar líder + membros da equipa
        const members = await db.TeamMember.filter({ project_id: project.id });
        const userIds = new Set();
        if (project.project_leader_id) userIds.add(project.project_leader_id);
        members.forEach((m) => { if (!m.removed_at) userIds.add(m.user_id); });

        for (const uid of userIds) {
          const existing = await db.Notification.filter({ user_id: uid, link });
          if (existing.length) continue;
          await db.Notification.create({
            user_id: uid,
            type: isOverdue ? "SPRINT_OVERDUE" : "SPRINT_DUE_SOON",
            title: isOverdue ? `Sprint atrasado: ${s.name}` : `Sprint a expirar: ${s.name}`,
            body: `O sprint "${s.name}" do projeto "${project.name}" ${isOverdue ? "terminou" : "termina em breve"} (${s.end_date}).`,
            link,
          });
          sprintNotified++;
        }
      }
    }

    return Response.json({
      ok: true,
      projectsChecked: projects.length,
      overdueNotified,
      sprintNotified,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}