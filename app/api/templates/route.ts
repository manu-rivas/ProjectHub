import { NextResponse } from "next/server";
import {
  createMyTemplate,
  deleteMyTemplate,
  listAllTemplates,
  updateMyTemplate,
} from "@/lib/user-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ ok: true, templates: listAllTemplates() });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    files?: Record<string, string>;
    fromId?: string;
  };
  try {
    const template = createMyTemplate(body);
    return NextResponse.json({ ok: true, template, templates: listAllTemplates() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not create the template" },
      { status: 400 },
    );
  }
}

export async function PATCH(request: Request) {
  const body = (await request.json()) as {
    id?: string;
    name?: string;
    description?: string;
    files?: Record<string, string>;
  };
  if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  try {
    const template = updateMyTemplate(body.id, body);
    return NextResponse.json({ ok: true, template, templates: listAllTemplates() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not save the template" },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { id?: string };
  if (!body.id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
  try {
    deleteMyTemplate(body.id);
    return NextResponse.json({ ok: true, templates: listAllTemplates() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not delete the template" },
      { status: 400 },
    );
  }
}
