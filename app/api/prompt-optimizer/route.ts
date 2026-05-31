import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { optimizePromptWithModel } from "@/lib/prompt-optimizer";
import { optimizePromptSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    requireUser(request); // 仍要求登录；提示词优化统一走后台全局 Key，不再用各用户自己的 key
    const input = optimizePromptSchema.parse(await request.json());
    const prompt = await optimizePromptWithModel(input);
    return NextResponse.json({ prompt });
  } catch (error) {
    return handleRouteError(error);
  }
}
