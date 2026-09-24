"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      if (err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError(err.message || "Failed to log in.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090B] px-6 text-white">
      <div className="w-full max-w-md">

        {/* Logo */}
        <Link href="/" className="mb-10 flex justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-lg font-bold">
              V
            </div>
            <span className="text-2xl font-bold">Vridhi</span>
          </div>
        </Link>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Welcome back</h1>
            <p className="mt-3 text-sm text-zinc-400">
              Log in to continue your journey with Vridhi.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-5">
            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Password</label>
                <button type="button" className="text-xs text-indigo-400 hover:text-indigo-300">
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 outline-none transition placeholder:text-zinc-600 focus:border-indigo-500"
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-white py-3.5 font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>

          {/* Signup Link */}
          <p className="mt-7 text-center text-sm text-zinc-500">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-indigo-400 hover:text-indigo-300">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-zinc-600">
          By continuing, you agree to Vridhi's Terms and Privacy Policy.
        </p>

      </div>
    </main>
  );
}