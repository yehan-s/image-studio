import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appConfig } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// SSO 起点：生图站作为 SSO client，在此生成 state、写一次性 cookie（CSRF 由 client 持有），
// 然后把浏览器导向 sub2api SPA 的中继页 /sso。中继页在登录态下用 fetch 调 authorize 拿到
// 回跳地址，再 window.location 跳回本站 /api/auth/sso/callback。
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!appConfig.sub2apiSsoSharedSecret) {
    return NextResponse.json({ error: "SSO 未启用" }, { status: 404 });
  }

  const url = new URL(request.url);
  const origin = (process.env.APP_BASE_URL?.trim() || url.origin).replace(/\/+$/, "");
  const redirectUri = `${origin}/api/auth/sso/callback`;
  const state = crypto.randomUUID();

  const relay = new URL("/sso", appConfig.sub2apiAppUrl);
  relay.searchParams.set("redirect_uri", redirectUri);
  relay.searchParams.set("state", state);

  const response = NextResponse.redirect(relay.toString());
  response.cookies.set("sso_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: redirectUri.startsWith("https"),
  });
  return response;
}
