"use client";

import { ChevronRight, KeyRound, Mail, Phone, ShieldQuestion } from "lucide-react";
import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/storage";

type UserWithEmail = {
  email?: string | null;
  login_email?: string | null;
};

export default function AccountPage() {
  const [email, setEmail] = useState("未绑定");

  useEffect(() => {
    const user = getCurrentUser() as (ReturnType<typeof getCurrentUser> & UserWithEmail) | null;
    setEmail(user?.email || user?.login_email || "未绑定");
  }, []);

  const items = [
    { icon: Mail, label: "登录邮箱", value: email },
    { icon: KeyRound, label: "修改密码", value: "" },
    { icon: ShieldQuestion, label: "忘记密码", value: "" },
    { icon: Phone, label: "手机号", value: "未绑定" }
  ] as const;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-label text-acid">账号中心</p>
        <h1 className="text-h1 text-white">账号与安全</h1>
        <p className="mt-3 text-body text-muted">管理登录方式与账号安全信息。</p>
      </div>

      <section className="glass rounded-card overflow-hidden">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div className={`flex items-center gap-3 px-5 py-4 ${index ? "border-t border-line" : ""}`} key={item.label}>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-acid/25 bg-acid/10 text-acid">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 text-body text-zinc-100">{item.label}</span>
              {item.value ? <span className="shrink-0 truncate text-right text-meta text-muted">{item.value}</span> : <ChevronRight className="h-4 w-4 shrink-0 text-muted" />}
            </div>
          );
        })}
      </section>
    </div>
  );
}
