import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { countAdmins, deleteUser, getUserById, getUserGroup, toPublicUser, updateUser } from "@/lib/db";
import { handleRouteError, jsonError } from "@/lib/http";
import { updateUserSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const admin = requireAdmin(request);
    const { id } = await context.params;
    const input = updateUserSchema.parse(await request.json());

    if (input.groupId && !getUserGroup(input.groupId)) {
      return jsonError("分组不存在", 400);
    }

    if (admin.id === id && input.role && input.role !== "admin") {
      return jsonError("不能移除自己的管理员权限", 400);
    }

    if (admin.id === id && input.status === "disabled") {
      return jsonError("不能禁用当前登录的管理员账号", 400);
    }

    const existing = getUserById(id);
    if (!existing) {
      return jsonError("用户不存在", 404);
    }

    const willNoLongerBeActiveAdmin =
      existing.role === "admin" &&
      (input.role === "member" || input.status === "disabled" || (existing.status === "disabled" && input.status !== "active"));
    if (willNoLongerBeActiveAdmin && countAdmins(id) === 0) {
      return jsonError("至少需要保留一个可用管理员账号", 400);
    }

    const user = updateUser(id, input);

    return NextResponse.json({ user: toPublicUser(user) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  try {
    const admin = requireAdmin(request);
    const { id } = await context.params;

    if (admin.id === id) {
      return jsonError("不能删除当前登录的管理员账号", 400);
    }

    const existing = getUserById(id);
    if (!existing) {
      return jsonError("用户不存在", 404);
    }

    if (existing.role === "admin" && existing.status === "active" && countAdmins(id) === 0) {
      return jsonError("至少需要保留一个可用管理员账号", 400);
    }

    const user = deleteUser(id);
    return NextResponse.json({ user: toPublicUser(user), deleted: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
