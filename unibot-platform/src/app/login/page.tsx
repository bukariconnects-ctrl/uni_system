"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-app-bg">
      <div className="w-full max-w-md rounded-2xl bg-card-bg p-8 shadow-sm border border-border">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-ai-light to-ai-lavender">
            <span className="text-3xl">🎓</span>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">UniBot</h1>
          <p className="mt-1 text-sm text-text-secondary">المنصة الأكاديمية الذكية</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-card-bg px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-1 focus:ring-action-blue"
              placeholder="admin@university.edu"
              dir="ltr"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-text-primary">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-border bg-card-bg px-4 py-2.5 text-sm text-text-primary outline-none transition-colors focus:border-action-blue focus:ring-1 focus:ring-action-blue"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-danger/10 px-4 py-2.5 text-sm text-danger">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-action-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-action-blue/90 disabled:opacity-50"
          >
            {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
          </button>
        </form>
      </div>
    </div>
  );
}
