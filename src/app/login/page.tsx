"use client";
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Unable to sign in. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-100 p-5">
      <section className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-700 text-2xl text-white">
            🏍
          </div>

          <h1 className="mt-5 text-2xl font-bold text-stone-900">
            Deals by Anas
          </h1>

          <p className="mt-2 text-sm text-stone-500">
            Used two-wheelers dealership management
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-stone-700"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-stone-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-600 focus:ring-2 focus:ring-orange-100"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-orange-700 px-4 py-3 font-semibold text-white transition hover:bg-orange-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-stone-500">
          Authorized dealership users only.
        </p>
      </section>
    </main>
  );
}

