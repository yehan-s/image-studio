import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createUserSession, setSessionCookie } from "@/lib/auth";
import {
  countUsers,
  createKeyUser,
  getUserBySub2apiKeyHash,
  toPublicUser,
  updateUser,
  updateUserSub2apiKey,
} from "@/lib/db";
import { encryptToken } from "@/lib/openai-oauth";
import { verifySub2apiKey } from "@/lib/image-provider";
import { handleRouteError, jsonError } from "@/lib/http";
import {
  assertLoginAllowed,
  clearLoginFailures,
  loginRateLimitKey,
  recordLoginFailure,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// key 即账号登录：输入 sub2api key → 验证有效 → 用 SHA256(key) 当身份索引查/建用户 → 建 session。
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const input = loginSchema.parse(await request.json());
    const rateLimitKey = loginRateLimitKey(request, input.key.slice(0, 12));
    assertLoginAllowed(rateLimitKey);

    // 1. 验证 key 是否有效（调中转 /models），无效直接拒绝
    if (!(await verifySub2apiKey(input.key))) {
      recordLoginFailure(rateLimitKey);
      return jsonError("API Key 无效或已停用", 401);
    }
    clearLoginFailures(rateLimitKey);

    // 2. key 的 SHA256 作为身份索引；明文加密另存（生图时解密取用）
    const keyHash = crypto.createHash("sha256").update(input.key).digest("hex");
    const ciphertext = encryptToken(input.key);
    const adminHash = process.env.ADMIN_SUB2API_KEY_HASH?.trim() || null;

    // 3. 查或建用户
    let user = getUserBySub2apiKeyHash(keyHash);
    if (!user) {
      // 首个登录用户 = admin；或 hash 命中 ADMIN_SUB2API_KEY_HASH 兜底
      const isAdminSeed = countUsers() === 0 || (adminHash !== null && keyHash === adminHash);
      user = createKeyUser({ keyHash, ciphertext, role: isAdminSeed ? "admin" : "member" });
    } else {
      if (user.status === "disabled") {
        return jsonError("账号已被禁用，请联系管理员", 403);
      }
      // 刷新密文（应对加密密钥轮换）
      updateUserSub2apiKey(user.id, ciphertext, keyHash);
      // 命中 admin 兜底 hash 则自愈为 admin（防部署后被陌生人抢先占用首个=admin）
      if (user.role !== "admin" && adminHash !== null && keyHash === adminHash) {
        user = updateUser(user.id, { role: "admin" });
      }
    }

    const { token } = createUserSession(user.id);
    const response = NextResponse.json({ user: toPublicUser(user) });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleRouteError(error);
  }
}
