import { NextResponse } from "next/server";
import { ActionError, detectedActions, mergeActions, normalizeCustomAction, runProjectAction } from "@/lib/actions";
import { withProjectIcon } from "@/lib/icon";
import { readStore, touchProject, writeStore } from "@/lib/store";
import type { ProjectAction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const store = readStore();
  const project = store.projects.find((item) => item.id === id);
  if (!project) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  return NextResponse.json({
    ok: true,
    detected: detectedActions(project.path),
    custom: project.actions || [],
    actions: mergeActions(project.actions, detectedActions(project.path)),
  });
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json()) as {
    action?: "run" | "add" | "remove";
    actionId?: string;
    command?: string;
    label?: string;
  };
  const store = readStore();
  const index = store.projects.findIndex((item) => item.id === id);
  if (index === -1) return NextResponse.json({ ok: false, error: "Project not found" }, { status: 404 });
  const project = store.projects[index];

  try {
    if (body.action === "add") {
      const next = normalizeCustomAction({ label: body.label, command: body.command });
      const actions = [...(project.actions || []).filter((item) => item.id !== next.id), next];
      store.projects[index] = touchProject(project, { actions });
      writeStore(store);
      return NextResponse.json({ ok: true, project: withProjectIcon(store.projects[index]), action: next });
    }

    if (body.action === "remove") {
      const actions = (project.actions || []).filter((item) => item.id !== body.actionId);
      store.projects[index] = touchProject(project, { actions });
      writeStore(store);
      return NextResponse.json({ ok: true, project: withProjectIcon(store.projects[index]) });
    }

    const available = mergeActions(project.actions, detectedActions(project.path));
    const chosen: ProjectAction | undefined = body.actionId
      ? available.find((item) => item.id === body.actionId)
      : undefined;
    const command = chosen?.command || body.command;
    if (!command) return NextResponse.json({ ok: false, error: "Choose an action or a command" }, { status: 400 });
    const result = runProjectAction(project.path, command);
    return NextResponse.json({ ok: true, pid: result.pid, command });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not run the action";
    const status = error instanceof ActionError ? 400 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
