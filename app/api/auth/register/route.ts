import { NextResponse } from "next/server";
import { jsonError } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 本站改为「key 即账号」登录，不再支持注册。
export async function POST(): Promise<NextResponse> {
  return jsonError("本站使用 API Key 登录，无需注册", 404);
}
