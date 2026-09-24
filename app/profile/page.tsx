"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../lib/firebase";

export default function StudentProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);

  // Student Profile Data
  const [headline, setHeadline] = useState("Fullstack Builder • Distributed Systems & AI Researcher");
  const [department, setDepartment] = useState("B.Tech Computer Science & Engineering (3rd Year)");
  const [bio, setBio] = useState(
    "Building scalable campus infrastructure, high-concurrency microservices, and autonomous developer tools at Vridhi. Passionate about Next.js, Go, and Generative AI orchestration."
  );
  const [skills, setSkills] = useState(["Next.js", "TypeScript", "Python", "Docker", "Firebase", "Algorithms"]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  return (
    <main className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* LinkedIn-Style Profile Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {/* Banner Graphic */}
          <div className="h-44 w-full bg-gradient-to-r from-violet-900 via-indigo-900 to-black relative">
            <button
              onClick={() => setEditing(!editing)}
              className="absolute top-4 right-4 rounded-xl border border-white/20 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm hover:bg-black/60 transition"
            >
              {editing ? "Save Profile" : "✎ Edit Profile"}
            </button>
          </div>

          {/* Profile Details Container */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-16">
              <div className="flex items-end gap-4">
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-[#09090B] bg-gradient-to-tr from-indigo-500 to-purple-600 text-3xl font-extrabold text-white shadow-2xl">
                  {user?.displayName?.[0]?.toUpperCase() || "S"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-white">
                      {user?.displayName || "Student Developer"}
                    </h1>
                    <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                      Verified Student
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 font-medium mt-0.5">{headline}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {department} • Hyderabad, Telangana
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <Link
                  href="/chat"
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200 transition"
                >
                  Open Messages
                </Link>
                <Link
                  href="/projects"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
                >
                  My Repositories
                </Link>
              </div>
            </div>

            {/* Editable Fields when in Edit Mode */}
            {editing && (
              <div className="mt-6 rounded-xl border border-white/10 bg-black/40 p-4 space-y-3 text-xs">
                <div>
                  <label className="text-zinc-400 font-semibold block">Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 p-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block">Department & Batch</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 p-2 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 font-semibold block">About / Bio</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 p-2 text-white outline-none"
                  />
                </div>
              </div>
            )}

            {/* About Section */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">About</h3>
              <p className="mt-2 text-xs leading-relaxed text-zinc-300">{bio}</p>
            </div>

            {/* Verified Skills Badges */}
            <div className="mt-5 border-t border-white/10 pt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Skills & Technologies
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {skills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-zinc-300"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}