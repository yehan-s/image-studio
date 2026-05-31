import { Suspense } from "react";
import { AuthClient } from "@/components/auth/AuthClient";
import { appConfig } from "@/lib/config";

// 必须运行时渲染：ssoEnabled 取自运行时环境变量，若被静态预渲染会用 build 期的空值
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const ssoEnabled = Boolean(appConfig.sub2apiSsoSharedSecret);
  return (
    <Suspense fallback={null}>
      <AuthClient ssoEnabled={ssoEnabled} />
    </Suspense>
  );
}
