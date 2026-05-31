"use client";

import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, LogIn, Sparkles } from "lucide-react";
import clsx from "clsx";
import { apiJson } from "@/components/client-api";
import type { CurrentUser } from "@/lib/types";

interface AuthResponse {
  user: CurrentUser | null;
}

export function AuthClient({ ssoEnabled = false }: { ssoEnabled?: boolean }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  // SSO 启用时，Key 登录仅作备用，默认隐藏，点小入口才展开
  const [showKeyLogin, setShowKeyLogin] = useState(false);

  useEffect(() => {
    apiJson<AuthResponse>("/api/auth/me")
      .then((payload) => {
        if (payload.user) {
          window.location.href = "/";
        }
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      await apiJson<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ key: key.trim() }),
      });
      window.location.href = "/";
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "登录失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="auth-layout">
      <div className="auth-copy">
        <span className="badge">
          <Sparkles size={13} aria-hidden="true" />
          image-2 workspace
        </span>
        <h1>进入生成工作台</h1>
        <p>
          用你的 sub2api 账号登录，选择生图分组后即可开始创作。生成图片将消耗你账户在该分组下的额度。
        </p>
      </div>

      <form className="panel auth-card" onSubmit={submit}>
        <div className="panel-header">
          <div>
            <h2>{ssoEnabled ? "登录" : "API Key 登录"}</h2>
            <p>{ssoEnabled ? "推荐使用 sub2api 账号登录" : "使用你的 sub2api API Key 进入系统"}</p>
          </div>
        </div>
        <div className="panel-body form-stack">
          {ssoEnabled ? (
            <a className="button primary" href="/api/auth/sso/start">
              <LogIn size={16} aria-hidden="true" />
              用 sub2api 账号登录
            </a>
          ) : null}

          {/* Key 登录：未启用 SSO 时为主登录；启用 SSO 时仅作备用，藏在小入口后 */}
          {!ssoEnabled || showKeyLogin ? (
            <>
              <div className="field">
                <label htmlFor="api-key">API Key</label>
                <input
                  id="api-key"
                  className="input"
                  type="password"
                  value={key}
                  onChange={(event) => setKey(event.target.value)}
                  autoComplete="off"
                  placeholder="sk-..."
                  required
                />
              </div>

              <button className={clsx("button", !ssoEnabled && "primary")} type="submit" disabled={busy}>
                {busy ? <KeyRound size={16} aria-hidden="true" /> : <LogIn size={16} aria-hidden="true" />}
                {busy ? "验证中" : "用 API Key 登录"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="auth-text-toggle"
              onClick={() => setShowKeyLogin(true)}
            >
              使用 API Key 登录（备用）
            </button>
          )}

          <div className={clsx("toast-line", error && "error")}>{error}</div>
        </div>
      </form>
    </section>
  );
}
