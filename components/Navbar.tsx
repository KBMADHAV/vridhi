"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const navLinks = [
    { name: "Home", href: "/", icon: "🏠" },
    { name: "Feed", href: "/feed", icon: "📰" },
    { name: "Projects", href: "/projects", icon: "💻" },
    { name: "Arena", href: "/arena", icon: "⚡" },
    { name: "Chat", href: "/chat", icon: "💬" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 relative">
        {/* Left: Brand Logo */}
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-sm font-black text-white shadow-md">
              V
            </span>
            <span className="text-lg font-black tracking-tight text-white">
              VRIDHI
            </span>
          </Link>
        </div>

        {/* Center: Centered Navigation (Home, Feed, Projects, Arena, Chat) */}
        <nav className="hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: User Profile / Auth Controls */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/profile"
                className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  pathname === "/profile"
                    ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:text-white"
                }`}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {user.displayName?.[0]?.toUpperCase() ||
                    user.email?.[0]?.toUpperCase() ||
                    "U"}
                </div>
                <span>My Profile</span>
              </Link>

              <button
                onClick={() => signOut(auth)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-400 transition hover:bg-red-500/10 hover:text-red-400"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-white px-3.5 py-1.5 text-xs font-bold text-black transition hover:bg-zinc-200"
              >
                Join Campus
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}