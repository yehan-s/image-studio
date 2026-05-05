import { NextRequest, NextResponse } from "next/server";
import { getCanvasProject, saveCanvasProject, toPublicCanvasProject } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { handleRouteError, jsonError } from "@/lib/http";
import { saveCanvasProjectSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxCanvasSnapshotBytes = 5 * 1024 * 1024;

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireUser(request);
    return NextResponse.json({ project: toPublicCanvasProject(getCanvasProject(user.id)) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireUser(request);
    const input = saveCanvasProjectSchema.parse(await request.json());
    const snapshotJson = JSON.stringify(input.snapshot ?? null);
    if (new TextEncoder().encode(snapshotJson).length > maxCanvasSnapshotBytes) {
      return jsonError("画布内容过大，请先删除不需要的素材后再保存", 413);
    }

    const project = saveCanvasProject({
      userId: user.id,
      name: input.name,
      snapshot: input.snapshot ?? null,
    });
    return NextResponse.json({ project: toPublicCanvasProject(project) });
  } catch (error) {
    return handleRouteError(error);
  }
}
