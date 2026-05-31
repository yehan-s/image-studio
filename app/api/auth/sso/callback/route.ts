import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { appConfig, IMAGE_USER_AGENT } from "@/lib/config";
import { createUserSession, setSessionCookie } from "@/lib/auth";
import {
  countUsers,
  createSsoUser,
  getUserByEmail,
  updateUserSub2apiKey,
} from "@/lib/db";
import { encryptToken } from "@/lib/openai-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SsoTokenData {
  temp_key?: string;
  user?: { id?: unknown; email?: string; username?: string };
}

// SSO 回调：浏览器从 sub2api 携 code+state 跳回这里。
// 用 code + 共享密钥向 sub2api 换“临时 key + 用户信息” → 按 sub2api user_id 稳定身份建/取用户 → 建会话。
// 临时 key 每次登录都会轮换，故身份索引用 sub2api user_id（email 派生），不用 key 哈希。
export async function GET(request: NextRequest): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = (process.env.APP_BASE_URL?.trim() || url.origin).replace(/\/+$/, "");
  const fail = (reason: string) => NextResponse.redirect(`${origin}/login?sso_error=${reason}`);

  if (!appConfig.sub2apiSsoSharedSecret) {
    return fail("disabled");
  }
  // 校验 state 防 CSRF（start 时写入的一次性 cookie）
  const cookieState = request.cookies.get("sso_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) {
    return fail("state");
  }

  let payload: SsoTokenData | null = null;
  try {
    const resp = await fetch(`${appConfig.sub2apiSsoBaseUrl}/auth/sso/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SSO-Secret": appConfig.sub2apiSsoSharedSecret,
        "User-Agent": IMAGE_USER_AGENT,
      },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await resp.json().catch(() => null)) as { code?: number; data?: SsoTokenData } | null;
    if (!resp.ok || !body || body.code !== 0 || !body.data?.temp_key) {
      return fail("exchange");
    }
    payload = body.data;
  } catch {
    return fail("network");
  }

  const tempKey = payload?.temp_key ?? "";
  const sub2apiUserId = String(payload?.user?.id ?? "");
  if (!tempKey || !sub2apiUserId) {
    return fail("user");
  }

  const keyHash = crypto.createHash("sha256").update(tempKey).digest("hex");
  const ciphertext = encryptToken(tempKey);
  const email = `sso_${sub2apiUserId}@sub2api.local`;

  let user = getUserByEmail(email);
  if (!user) {
    const isAdminSeed = countUsers() === 0;
    user = createSsoUser({
      sub2apiUserId,
      username: payload?.user?.username ?? payload?.user?.email ?? null,
      ciphertext,
      keyHash,
      role: isAdminSeed ? "admin" : "member",
    });
  } else {
    if (user.status === "disabled") {
      return fail("account_disabled");
    }
    // 刷新临时 key 密文/哈希
    updateUserSub2apiKey(user.id, ciphertext, keyHash);
  }

  const { token } = createUserSession(user.id);
  const response = NextResponse.redirect(`${origin}/`);
  setSessionCookie(response, token);
  response.cookies.delete("sso_state");
  return response;
}
