import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { handleRouteError } from "@/lib/http";
import { getRuntimeImageSettings, getUserSub2apiKey } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 查询当前登录用户在 sub2api 的钱包余额。
 * 用该用户的 sub2api key 调 sub2api 的 `GET /usage`：余额模式下返回 { balance, remaining, unit:"USD" }。
 * 生图站本身不记账，余额是用户在 sub2api 充的钱；查不到则返回 balance:null（前端显示 “--”，不报错）。
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const user = requireUser(request);
    const key = getUserSub2apiKey(user.id);
    if (!key) {
      return NextResponse.json({ balance: null, unit: "USD" });
    }

    const baseUrl = getRuntimeImageSettings().sub2apiBaseUrl.replace(/\/+$/, "");
    const res = await fetch(`${baseUrl}/usage`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return NextResponse.json({ balance: null, unit: "USD" });
    }

    const data = (await res.json()) as { balance?: unknown; remaining?: unknown; unit?: unknown };
    const balance =
      typeof data.balance === "number"
        ? data.balance
        : typeof data.remaining === "number"
          ? data.remaining
          : null;
    return NextResponse.json({ balance, unit: typeof data.unit === "string" ? data.unit : "USD" });
  } catch (error) {
    return handleRouteError(error);
  }
}
