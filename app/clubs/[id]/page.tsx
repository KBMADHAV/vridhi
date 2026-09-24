"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "../../../lib/firebase";

interface ClubPost {
  id: string;
  author: string;
  role: string;
  time: string;
  content: string;
  likes: number;
}

export default function ClubProfilePage() {
  const params = useParams();
  const clubId = typeof params?.id === "string" ? params.id : "club-coding-guild";

  const [user, setUser] = useState<User | null>(null);
  const [following, setFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState<"Posts" | "About" | "Events" | "Leads">("Posts");
  const [newBroadcast, setNewBroadcast] = useState("");
  const [posts, setPosts] = useState<ClubPost[]>([
    {
      id: "1",
      author: "Aditya Nair",
      role: "Guild Lead • Competitive Coding",
      time: "1d ago",
      content:
        "🚀 Registrations are officially live for Speed Duel 2026! 3 hours, 6 algorithmic challenges, cash prizes worth ₹25,000. Check the Campus Radar for the syllabus.",
      likes: 38,
    },
    {
      id: "2",
      author: "Competitive Coding Guild",
      role: "Official Club Broadcast",
      time: "4d ago",
      content:
        "Weekly DSA practice problems have been posted in the Vridhi Arena. Focus this week: Segment Trees and Dynamic Programming with bitmasks.",
      likes: 54,
    },
  ]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const handlePublishBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBroadcast.trim()) return;

    const newP: ClubPost = {
      id: Date.now().toString(),
      author: user?.displayName || user?.email?.split("@")[0] || "Club Admin",
      role: "Core Committee",
      time: "Just now",
      content: newBroadcast.trim(),
      likes: 0,
    };

    setPosts([newP, ...posts]);
    setNewBroadcast("");
  };

  return (
    <main className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* LinkedIn-Style Organization Header Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {/* Banner Graphic */}
          <div className="h-44 w-full bg-gradient-to-r from-indigo-900 via-purple-900 to-zinc-900 relative">
            <div className="absolute top-4 right-4 rounded-lg bg-black/50 px-3 py-1 text-xs font-mono text-zinc-300 backdrop-blur-sm">
              Official University Organization
            </div>
          </div>

          {/* Profile & Info Bar */}
          <div className="px-6 pb-6 pt-0 relative">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-16">
              <div className="flex items-end gap-4">
                <div className="flex h-28 w-28 items-center justify-center rounded-2xl border-4 border-[#09090B] bg-gradient-to-tr from-indigo-600 to-purple-600 text-3xl font-extrabold text-white shadow-2xl">
                  🏛️
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white capitalize">
                    {clubId.replace(/-/g, " ")}
                  </h1>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Official Student Guild • Department of Computer Science & Engineering
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Hyderabad, Telangana • 320 Active Campus Members
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFollowing(!following)}
                  className={`rounded-xl px-5 py-2 text-xs font-bold transition shadow-sm ${
                    following
                      ? "border border-white/20 bg-white/10 text-white"
                      : "bg-white text-black hover:bg-zinc-200"
                  }`}
                >
                  {following ? "✓ Following" : "+ Follow"}
                </button>
                <Link
                  href="/chat"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
                >
                  💬 Message
                </Link>
              </div>
            </div>

            {/* LinkedIn-Style Tabs */}
            <div className="mt-8 flex gap-6 border-b border-white/10 text-xs font-bold text-zinc-400">
              {(["Posts", "About", "Events", "Leads"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-3 transition ${
                    activeTab === tab
                      ? "border-b-2 border-indigo-500 text-white"
                      : "hover:text-zinc-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Contents */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Main Feed Content (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            {activeTab === "Posts" && (
              <>
                {/* Admin Post Box */}
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-xs">
                      C
                    </div>
                    <span className="text-xs font-semibold text-zinc-300">
                      Post an announcement or opportunity as Club Admin
                    </span>
                  </div>

                  <form onSubmit={handlePublishBroadcast} className="mt-3">
                    <textarea
                      rows={2}
                      value={newBroadcast}
                      onChange={(e) => setNewBroadcast(e.target.value)}
                      placeholder="Share hackathons, meeting schedules, or project recruitments..."
                      className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white outline-none focus:border-indigo-500"
                    />
                    <div className="mt-2 flex justify-end">
                      <button
                        type="submit"
                        className="rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition"
                      >
                        Publish Post
                      </button>
                    </div>
                  </form>
                </div>

                {/* Broadcasts Feed */}
                {posts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-xs font-bold">
                          {post.author[0]}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{post.author}</div>
                          <div className="text-[10px] text-zinc-400">
                            {post.role} • {post.time}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-500">•••</span>
                    </div>

                    <p className="text-xs leading-relaxed text-zinc-300 whitespace-pre-wrap">
                      {post.content}
                    </p>

                    <div className="border-t border-white/5 pt-2 flex items-center gap-4 text-xs text-zinc-400">
                      <button className="hover:text-white transition">👍 Like ({post.likes})</button>
                      <button className="hover:text-white transition">💬 Comment</button>
                      <button className="hover:text-white transition">↗ Share</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {activeTab === "About" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4 text-xs leading-relaxed text-zinc-300">
                <h3 className="text-sm font-bold text-white">About the Guild</h3>
                <p>
                  Established to cultivate advanced problem-solving, competitive coding, and system design competencies across all engineering batches. We conduct weekly algorithmic sprints, mock interviews, and university hackathons.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                    <span className="text-zinc-500 font-semibold block uppercase text-[10px]">Department</span>
                    <span className="text-white mt-1 block">Computer Science & Engineering</span>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                    <span className="text-zinc-500 font-semibold block uppercase text-[10px]">Official Email</span>
                    <span className="text-indigo-400 mt-1 block">codingguild@mru.edu.in</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "Events" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-xs text-zinc-400">
                <h3 className="text-sm font-bold text-white mb-3">Upcoming & Past Events</h3>
                <p>• Speed Duel 2026 (Nov 20, 2026)</p>
                <p className="mt-2">• ICPC Regional Mock Round 1 (Dec 05, 2026)</p>
              </div>
            )}

            {activeTab === "Leads" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-3">
                <h3 className="text-sm font-bold text-white">Executive Committee</h3>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl border border-white/5 bg-black/30 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Aditya Nair</span>
                      <span className="text-zinc-400 text-[11px]">President & Technical Lead</span>
                    </div>
                    <Link href="/chat" className="text-indigo-400 hover:text-indigo-300">Chat</Link>
                  </div>
                  <div className="p-3 rounded-xl border border-white/5 bg-black/30 flex justify-between items-center">
                    <div>
                      <span className="font-bold text-white block">Sneha Rao</span>
                      <span className="text-zinc-400 text-[11px]">Vice President & Event Coordinator</span>
                    </div>
                    <Link href="/chat" className="text-indigo-400 hover:text-indigo-300">Chat</Link>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar (4 Cols) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Leadership & Contacts
              </h4>
              <p className="mt-2 text-xs text-zinc-300">
                Faculty Advisor: <strong>Dr. K. Srinivas</strong>
              </p>
              <p className="mt-1 text-xs text-zinc-300">
                Guild Room: <strong>Lab Block 3, Room 402</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}