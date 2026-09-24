"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "@/lib/firebase";

type GitHubView =
  | "Overview"
  | "AllIssues"
  | "AllPullRequests"
  | "Repositories"
  | "Challenges"
  | "Discussions"
  | "Codespaces"
  | "Copilot"
  | "Explore"
  | "Marketplace"
  | "MCPRegistry";

interface VerificationBadge {
  level: "Arena Verified" | "Multi-Contributor" | "Original Build";
  score: number;
  testPassed: boolean;
}

interface TeamRecruitment {
  isRecruiting: boolean;
  openRoles: string[];
}

interface Repository {
  id: string;
  name: string;
  owner: string;
  description: string;
  language: string;
  visibility: "Public" | "Private";
  stars: number;
  forks: number;
  updatedAt?: string;
  topics: string[];
  verification: VerificationBadge;
  team: TeamRecruitment;
  demoOutput?: string;
}

interface ChallengeRepo {
  id: string;
  title: string;
  host: string;
  department: string;
  stipendOrPrize: string;
  deadline: string;
  openSlots: number;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  requirements: string[];
}

interface IssueItem {
  id: string;
  title: string;
  repo: string;
  author: string;
  comments: number;
  status: "Open" | "Closed";
  time: string;
}

interface PullRequestItem {
  id: string;
  title: string;
  repo: string;
  branch: string;
  author: string;
  status: "Open" | "Merged";
  time: string;
}

export default function ProjectsHubPage() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<GitHubView>("Overview");
  const [showDrawer, setShowDrawer] = useState(false);
  const [showNewRepoModal, setShowNewRepoModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState<2026 | 2025>(2026);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLang, setSelectedLang] = useState<string>("All");

  // Modals for the 4 Unique Features
  const [activeVerifyRepo, setActiveVerifyRepo] = useState<Repository | null>(null);
  const [activeJoinTeamRepo, setActiveJoinTeamRepo] = useState<Repository | null>(null);
  const [activeDemoRepo, setActiveDemoRepo] = useState<Repository | null>(null);
  const [demoExecuting, setDemoExecuting] = useState(false);

  // Team Application Form State
  const [applicantRole, setApplicantRole] = useState("");
  const [applicantPitch, setApplicantPitch] = useState("");

  // Copilot Chat prompt state
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<
    { role: "user" | "copilot"; text: string }[]
  >([
    {
      role: "copilot",
      text: "Hello! I am your Vridhi Campus Copilot. Ask me to generate API endpoints, debug Next.js code, or draft algorithm solutions.",
    },
  ]);

  // New Repository Form State
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [newRepoLang, setNewRepoLang] = useState("TypeScript");
  const [newRepoVis, setNewRepoVis] = useState<"Public" | "Private">("Public");
  const [creating, setCreating] = useState(false);

  // Repositories equipped with Proof of Build & Team Roster
  const [repos, setRepos] = useState<Repository[]>([
    {
      id: "vridhi-core-engine",
      name: "vridhi-core-engine",
      owner: "KBMADHAV",
      description: "High performance microservice suite with Monaco editor integration, sandboxed AST validation & peer verification.",
      language: "TypeScript",
      visibility: "Public",
      stars: 8,
      forks: 3,
      updatedAt: "Sep 22, 2026",
      topics: ["Next.js", "Firebase", "Microservices"],
      verification: {
        level: "Arena Verified",
        score: 98,
        testPassed: true,
      },
      team: {
        isRecruiting: true,
        openRoles: ["Frontend (Tailwind/Next.js)", "DevOps / Docker"],
      },
      demoOutput: ">> Running Vridhi Microservice Suite...\n>> Initializing sandboxed Redis cache: OK\n>> Verifying JWT auth guard headers: PASSED\n>> AST benchmark response: 2.4ms (99.8th percentile)\n>> Server live on port 8080. Ready for test payloads.",
    },
    {
      id: "swaraksha-frontend",
      name: "swaraksha_frontend",
      owner: "KBMADHAV",
      description: "Smart campus surveillance client portal with real-time WebRTC streams, emergency beaconing & automated SOS broadcast.",
      language: "HTML",
      visibility: "Public",
      stars: 4,
      forks: 1,
      updatedAt: "Sep 20, 2026",
      topics: ["WebRTC", "CampusSafety", "Sockets"],
      verification: {
        level: "Multi-Contributor",
        score: 92,
        testPassed: true,
      },
      team: {
        isRecruiting: true,
        openRoles: ["Computer Vision Lead", "Android/iOS Integrator"],
      },
      demoOutput: ">> Connecting to Campus WebRTC Signal Server...\n>> Signaling channel verified on wss://signal.mru.edu.in\n>> Live stream video latency: 45ms\n>> Beacon test packet sent: ACK received.",
    },
    {
      id: "synapse-ai-architect",
      name: "synapse-ai-architect",
      owner: "KBMADHAV",
      description: "Generative peer matchmaking and hackathon role distribution engine powered by vector embeddings and prompt graph parsing.",
      language: "Python",
      visibility: "Public",
      stars: 11,
      forks: 5,
      updatedAt: "Sep 15, 2026",
      topics: ["FastAPI", "VectorDB", "GenAI"],
      verification: {
        level: "Original Build",
        score: 95,
        testPassed: true,
      },
      team: {
        isRecruiting: false,
        openRoles: [],
      },
      demoOutput: ">> Loading vector embeddings index...\n>> Loading student skill graph: 1,240 nodes\n>> Simulating role distribution across 10 sample squads:\n>> Match coefficient: 94.6% confidence score.\n>> Execution finished in 180ms.",
    },
  ]);

  // Challenge Pipeline Repos (Fork-to-Internship)
  const [challenges] = useState<ChallengeRepo[]>([
    {
      id: "asl-perception-challenge",
      title: "Real-Time Sensor Fusion & Perception Pipeline",
      host: "Autonomous Systems & AI Lab (ASL)",
      department: "Dept. of AI & Data Science",
      stipendOrPrize: "₹35,000 / mo Fellowship",
      deadline: "Oct 28, 2026",
      openSlots: 2,
      difficulty: "Advanced",
      requirements: ["Fork challenge repo", "Submit PR with LiDAR filter test cases passing"],
    },
    {
      id: "vridhi-distributed-cache",
      title: "Zero-Latency Event Scraping & WebSocket Broadcaster",
      host: "Vridhi Core Infrastructure Guild",
      department: "Dean of Student Affairs / Tech Guild",
      stipendOrPrize: "Winter Software Intern Role",
      deadline: "Nov 10, 2026",
      openSlots: 3,
      difficulty: "Intermediate",
      requirements: ["Implement redis queue worker", "Pass Arena latency benchmark < 5ms"],
    },
  ]);

  const [issues] = useState<IssueItem[]>([
    {
      id: "#14",
      title: "Monaco editor syntax highlighting sync for TypeScript models",
      repo: "KBMADHAV/vridhi-core-engine",
      author: "ananya-s",
      comments: 3,
      status: "Open",
      time: "2 hours ago",
    },
    {
      id: "#11",
      title: "Firebase Auth onAuthStateChanged race condition on slow network",
      repo: "KBMADHAV/vridhi-core-engine",
      author: "KBMADHAV",
      comments: 5,
      status: "Open",
      time: "1 day ago",
    },
  ]);

  const [prs] = useState<PullRequestItem[]>([
    {
      id: "#08",
      title: "feat(auth): Add resilient fallback state for Firebase config",
      repo: "KBMADHAV/vridhi-core-engine",
      branch: "feature/auth-guards -> main",
      author: "KBMADHAV",
      status: "Open",
      time: "3 hours ago",
    },
  ]);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  const fetchCloudRepos = async () => {
    try {
      const q = query(collection(db, "repositories"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const fetched: Repository[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || data.title || "untitled-repo",
            owner: data.ownerName || (user?.displayName || "KBMADHAV"),
            description: data.description || "No description provided.",
            language: data.language || "TypeScript",
            visibility: data.visibility || "Public",
            stars: Array.isArray(data.stars) ? data.stars.length : 0,
            forks: data.forks || 0,
            updatedAt: "Recently",
            topics: data.tags || [data.language || "TypeScript"],
            verification: {
              level: "Arena Verified",
              score: 95,
              testPassed: true,
            },
            team: {
              isRecruiting: data.isRecruiting ?? true,
              openRoles: data.openRoles || ["Fullstack Collaborator"],
            },
            demoOutput: ">> Executing cloud sandbox entry...\n>> Code compiled with 0 warnings.\n>> Test suite: 4 passed, 0 failed.",
          };
        });
        setRepos(fetched);
      }
    } catch (err) {
      console.warn("Using sample repository state:", err);
    }
  };

  useEffect(() => {
    fetchCloudRepos();
  }, [user]);

  const handleCreateRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;
    setCreating(true);

    const initialFiles = [
      {
        name: "src",
        type: "folder",
        children: [
          {
            name: newRepoLang === "Python" ? "main.py" : "index.ts",
            type: "file",
            content: `// ${newRepoName} entry point\nconsole.log("Service initializing on Vridhi Git...");\n`,
          },
        ],
      },
      {
        name: "README.md",
        type: "file",
        content: `# ${newRepoName} 🚀\n\n${newRepoDesc || "A student project created on Vridhi"}\n\n### Tech Stack\n- Language: ${newRepoLang}\n\n### Quick Start\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\``,
      },
    ];

    try {
      const docRef = await addDoc(collection(db, "repositories"), {
        name: newRepoName.trim(),
        title: newRepoName.trim(),
        description: newRepoDesc.trim(),
        language: newRepoLang,
        visibility: newRepoVis,
        ownerId: user?.uid || "guest",
        ownerName: user?.displayName || "KBMADHAV",
        ownerEmail: user?.email || "student@mru.edu.in",
        stars: [],
        forks: 0,
        files: initialFiles,
        isRecruiting: true,
        openRoles: ["Contributor"],
        createdAt: serverTimestamp(),
      });

      const newEntry: Repository = {
        id: docRef.id,
        name: newRepoName.trim(),
        owner: user?.displayName || "KBMADHAV",
        description: newRepoDesc.trim(),
        language: newRepoLang,
        visibility: newRepoVis,
        stars: 0,
        forks: 0,
        updatedAt: "Just now",
        topics: [newRepoLang, "CampusProject"],
        verification: {
          level: "Original Build",
          score: 100,
          testPassed: true,
        },
        team: {
          isRecruiting: true,
          openRoles: ["Core Contributor"],
        },
        demoOutput: ">> Repository scaffolded successfully.\n>> Ready for test commits in Synapse Arena.",
      };

      setRepos([newEntry, ...repos]);
      setNewRepoName("");
      setNewRepoDesc("");
      setShowNewRepoModal(false);
    } catch (err) {
      console.error("Failed to create repository:", err);
      alert("Failed to publish repository.");
    } finally {
      setCreating(false);
    }
  };

  const handleSendTeamRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantPitch.trim()) return;
    alert(`Application sent directly to ${activeJoinTeamRepo?.owner} for the "${applicantRole}" position!`);
    setActiveJoinTeamRepo(null);
    setApplicantPitch("");
  };

  const handleRunDemo = (repo: Repository) => {
    setActiveDemoRepo(repo);
    setDemoExecuting(true);
    setTimeout(() => {
      setDemoExecuting(false);
    }, 900);
  };

  const handleSendCopilot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;

    const userMsg = copilotQuery.trim();
    setCopilotMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setCopilotQuery("");

    setTimeout(() => {
      setCopilotMessages((prev) => [
        ...prev,
        {
          role: "copilot",
          text: `Analyzing your workspace for "${userMsg}"... Suggested code solution:\n\n\`\`\`ts\nexport async function handleCampusTask() {\n  // Verified for Synapse Arena Sandbox\n  return { status: "success", timestamp: Date.now() };\n}\n\`\`\``,
        },
      ]);
    }, 600);
  };

  const getLanguageColor = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "typescript":
        return "bg-indigo-400";
      case "javascript":
        return "bg-amber-400";
      case "python":
        return "bg-emerald-400";
      case "html":
        return "bg-rose-500";
      default:
        return "bg-violet-400";
    }
  };

  const username = user?.displayName || "KBMADHAV";

  const filteredRepos = repos.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang =
      selectedLang === "All" || r.language.toLowerCase() === selectedLang.toLowerCase();
    return matchesSearch && matchesLang;
  });

  return (
    <main className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header / Control Bar */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowDrawer(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white transition shadow-sm"
              title="Open Navigation Hub"
            >
              <span className="text-lg">☰</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-wider text-indigo-400">
                  Campus Code Hub & Verification Mesh
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                  Active Workspace: {currentView}
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {username}'s Workspace
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCurrentView("Copilot")}
              className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-bold text-violet-300 hover:bg-violet-500/20 transition"
            >
              <span>🤖</span>
              <span>Ask Copilot</span>
            </button>

            <button
              onClick={() => setShowNewRepoModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-2 text-xs font-bold text-black hover:bg-zinc-200 transition shadow-md"
            >
              <span>+</span>
              <span>New Repository</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Profile Card + Navigation Tabs (4 Cols) */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 text-2xl font-black text-white shadow-xl">
                  {username[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{username}</h2>
                  <p className="text-xs text-zinc-400">{user?.email || "student@mru.edu.in"}</p>
                  <span className="mt-1 inline-block rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">
                    🎓 3rd Year B.Tech CSE
                  </span>
                </div>
              </div>

              {/* Developer Metric Badges */}
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-4 text-center">
                <div className="rounded-xl bg-black/40 p-2.5 border border-white/5">
                  <span className="block text-sm font-black text-white">{repos.length}</span>
                  <span className="text-[10px] text-zinc-400">Repos</span>
                </div>
                <div className="rounded-xl bg-black/40 p-2.5 border border-white/5">
                  <span className="block text-sm font-black text-indigo-400">96%</span>
                  <span className="text-[10px] text-zinc-400">Verified</span>
                </div>
                <div className="rounded-xl bg-black/40 p-2.5 border border-white/5">
                  <span className="block text-sm font-black text-emerald-400">{challenges.length}</span>
                  <span className="text-[10px] text-zinc-400">Pipelines</span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Link
                  href="/profile"
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-center text-xs font-semibold text-zinc-300 hover:bg-white/10 transition"
                >
                  Edit Profile
                </Link>
                <Link
                  href="/chat"
                  className="flex-1 rounded-xl bg-indigo-600/20 border border-indigo-500/30 py-2 text-center text-xs font-semibold text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                >
                  Messages
                </Link>
              </div>
            </div>

            {/* Navigation Shortcuts */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 px-3 pb-2 block">
                Workspaces & Tools
              </span>
              {[
                { id: "Overview", label: "Overview & Activity", icon: "📖" },
                { id: "Repositories", label: "All Repositories", icon: "📦" },
                { id: "Challenges", label: "Fork-to-Internship", icon: "🏆" },
                { id: "AllIssues", label: "All Issues", icon: "🎯" },
                { id: "AllPullRequests", label: "All Pull Requests", icon: "⑂" },
                { id: "Codespaces", label: "Codespaces (Arena)", icon: "💻" },
                { id: "Copilot", label: "Copilot AI Assistant", icon: "🤖" },
                { id: "Discussions", label: "Discussions & RFCs", icon: "💬" },
                { id: "Explore", label: "Explore Campus Builds", icon: "🔭" },
                { id: "Marketplace", label: "Marketplace / Modules", icon: "🏪" },
                { id: "MCPRegistry", label: "MCP Tool Registry", icon: "🔌" },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as GitHubView)}
                  className={`w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    currentView === item.id
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {item.id === "Challenges" && (
                    <span className="rounded-full bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[9px] font-bold">
                      NEW
                    </span>
                  )}
                  {item.id === "AllIssues" && (
                    <span className="rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                      {issues.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Right Column: View Dynamic Container (8 Cols) */}
          <section className="lg:col-span-8 space-y-6">
            {/* VIEW 1: Overview & Heatmap */}
            {currentView === "Overview" && (
              <>
                <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                        Contribution Heatmap & Verified Benchmarks
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Cryptographically signed commits, test runs & code evaluations in {selectedYear}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/40 p-1">
                      <button
                        onClick={() => setSelectedYear(2026)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          selectedYear === 2026
                            ? "bg-indigo-600 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        2026
                      </button>
                      <button
                        onClick={() => setSelectedYear(2025)}
                        className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                          selectedYear === 2025
                            ? "bg-indigo-600 text-white"
                            : "text-zinc-400 hover:text-white"
                        }`}
                      >
                        2025
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto pb-2">
                    <div className="flex gap-1.5 min-w-[600px]">
                      <div className="flex flex-col justify-between py-0.5 text-[9px] font-mono text-zinc-500 pr-2">
                        <span>Mon</span>
                        <span>Wed</span>
                        <span>Fri</span>
                      </div>
                      <div className="flex flex-1 gap-1">
                        {Array.from({ length: 42 }).map((_, weekIndex) => (
                          <div key={weekIndex} className="flex flex-col gap-1">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                              const isGreen =
                                (weekIndex === 39 && dayIndex === 1) ||
                                (weekIndex === 40 && dayIndex === 3) ||
                                (weekIndex === 41 && dayIndex === 4) ||
                                (weekIndex === 35 && dayIndex === 2) ||
                                (weekIndex === 28 && dayIndex === 5);
                              return (
                                <div
                                  key={dayIndex}
                                  className={`h-2.5 w-2.5 rounded-sm transition ${
                                    isGreen
                                      ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                                      : "bg-white/[0.04] border border-white/5 hover:border-zinc-500"
                                  }`}
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Popular Repositories Grid with Badges, Live Demo & Roster buttons */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">Popular Verified Repositories</h3>
                    <button
                      onClick={() => setCurrentView("Repositories")}
                      className="text-xs text-indigo-400 hover:underline"
                    >
                      View all ({repos.length}) →
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {repos.map((repo) => (
                      <div
                        key={repo.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-indigo-500/40 hover:bg-white/[0.03] transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Proof of Build Badge Indicator */}
                          <div className="flex items-center justify-between gap-2 pb-2">
                            <button
                              onClick={() => setActiveVerifyRepo(repo)}
                              className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition"
                              title="Click to view Recruiter Proof-of-Build Certificate"
                            >
                              <span>🛡️</span>
                              <span>{repo.verification.level}</span>
                              <span className="text-emerald-300 font-mono">({repo.verification.score}%)</span>
                            </button>

                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400 font-mono">
                              {repo.visibility}
                            </span>
                          </div>

                          <Link
                            href={`/projects/${repo.id}`}
                            className="text-base font-bold text-white hover:text-indigo-400 transition mt-1 block"
                          >
                            {repo.name}
                          </Link>

                          <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                            {repo.description}
                          </p>

                          {/* Recruiting Teammates Banner */}
                          {repo.team.isRecruiting && (
                            <div className="mt-3 rounded-xl border border-violet-500/30 bg-violet-500/10 p-2.5 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                                  🤝 Team Roster Open
                                </span>
                                <span className="text-[11px] text-zinc-300 truncate block">
                                  Needs: {repo.team.openRoles.join(", ")}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setActiveJoinTeamRepo(repo);
                                  setApplicantRole(repo.team.openRoles[0] || "Contributor");
                                }}
                                className="rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-500 transition shrink-0"
                              >
                                Join Team
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Bottom Actions: Instant Demo Sandbox & Code */}
                        <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-zinc-500">
                            <span className="flex items-center gap-1.5 font-medium text-zinc-400">
                              <span className={`h-2 w-2 rounded-full ${getLanguageColor(repo.language)}`} />
                              {repo.language}
                            </span>
                            <span>★ {repo.stars}</span>
                            <span>⑂ {repo.forks}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleRunDemo(repo)}
                              className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/20 transition flex items-center gap-1"
                            >
                              <span>▶</span> Demo
                            </button>
                            <Link
                              href={`/projects/${repo.id}`}
                              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white/10"
                            >
                              Code ↗
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* VIEW 2: All Repositories */}
            {currentView === "Repositories" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {["All", "TypeScript", "JavaScript", "Python", "HTML"].map((l) => (
                      <button
                        key={l}
                        onClick={() => setSelectedLang(l)}
                        className={`rounded-lg px-3 py-1 text-xs font-semibold transition ${
                          selectedLang === l
                            ? "bg-white text-black"
                            : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>

                  <input
                    type="text"
                    placeholder="Search repositories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-60 rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-3">
                  {filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 hover:border-indigo-500/40 hover:bg-white/[0.03] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/projects/${repo.id}`}
                            className="text-base font-bold text-white hover:text-indigo-400 transition"
                          >
                            {repo.name}
                          </Link>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">
                            {repo.visibility}
                          </span>
                          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 text-[9px] font-bold">
                            🛡️ {repo.verification.level}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{repo.description}</p>
                        
                        {repo.team.isRecruiting && (
                          <span className="inline-block mt-2 text-[11px] font-semibold text-violet-300">
                            🤝 Hiring: {repo.team.openRoles.join(", ")}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleRunDemo(repo)}
                          className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition"
                        >
                          ▶ Run Demo
                        </button>
                        <Link
                          href={`/projects/${repo.id}`}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition"
                        >
                          Explore Code ↗
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW: Fork-to-Internship Pipeline (Feature 4) */}
            {currentView === "Challenges" && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] p-6">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px] font-mono font-bold uppercase">
                      Direct Recruitment Pipeline
                    </span>
                    <span className="text-xs text-zinc-400">• Official Lab Challenges</span>
                  </div>
                  <h2 className="text-2xl font-black text-white mt-2">
                    Fork-to-Internship Challenge Repositories
                  </h2>
                  <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                    Fork these challenge repositories, complete the algorithm or microservice task, and submit a PR. Merged pull requests automatically secure research grants or interview fast-tracks.
                  </p>
                </div>

                <div className="space-y-4">
                  {challenges.map((c) => (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:border-emerald-500/40 transition flex flex-col justify-between gap-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/5 pb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white hover:text-emerald-300 transition">
                              {c.title}
                            </span>
                            <span className="rounded bg-purple-500/20 text-purple-300 px-2 py-0.5 text-[10px] font-bold">
                              {c.difficulty}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1">
                            Hosted by: <strong className="text-white">{c.host}</strong> ({c.department})
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-extrabold text-emerald-400 block">{c.stipendOrPrize}</span>
                          <span className="text-[11px] text-zinc-500">Deadline: {c.deadline}</span>
                        </div>
                      </div>

                      <div className="text-xs space-y-1.5">
                        <span className="font-bold text-zinc-300 block uppercase text-[10px] tracking-wider">
                          Evaluation Criteria & PR Steps:
                        </span>
                        {c.requirements.map((req, ri) => (
                          <div key={ri} className="flex items-center gap-2 text-zinc-400">
                            <span className="text-emerald-400">✓</span>
                            <span>{req}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-3">
                        <span className="text-xs text-zinc-500">👥 {c.openSlots} Open Slots for Fellows</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => alert(`Challenge repo "${c.title}" forked to your workspace!`)}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
                          >
                            ⑂ Fork Challenge Repo
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 3: All Issues */}
            {currentView === "AllIssues" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white">Campus Issue Tracker</h3>
                  <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition">
                    + New Issue
                  </button>
                </div>

                <div className="space-y-3">
                  {issues.map((iss) => (
                    <div
                      key={iss.id}
                      className="rounded-xl border border-white/5 bg-black/40 p-4 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            iss.status === "Open"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {iss.status}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-white hover:text-indigo-400 cursor-pointer">
                            {iss.title}
                          </span>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {iss.id} in <span className="text-indigo-400">{iss.repo}</span> opened by{" "}
                            {iss.author} • {iss.time}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">💬 {iss.comments}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 4: All Pull Requests */}
            {currentView === "AllPullRequests" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white">Pull Requests Queue</h3>
                  <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition">
                    + New Pull Request
                  </button>
                </div>

                <div className="space-y-3">
                  {prs.map((pr) => (
                    <div
                      key={pr.id}
                      className="rounded-xl border border-white/5 bg-black/40 p-4 flex items-center justify-between gap-3 hover:border-indigo-500/30 transition"
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            pr.status === "Open"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}
                        >
                          {pr.status}
                        </span>
                        <div>
                          <span className="font-bold text-sm text-white hover:text-indigo-400 cursor-pointer">
                            {pr.title}
                          </span>
                          <div className="text-[11px] text-zinc-500 mt-0.5">
                            {pr.id} in <span className="text-indigo-400">{pr.repo}</span> ({pr.branch}) by{" "}
                            {pr.author} • {pr.time}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-zinc-400">Review Required</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 5: Codespaces (Arena Linkage) */}
            {currentView === "Codespaces" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-4">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-3xl">
                  💻
                </div>
                <h3 className="text-xl font-black text-white">Cloud Codespaces Sandbox</h3>
                <p className="text-xs text-zinc-400 max-w-md mx-auto">
                  Execute repositories in isolated containers with pre-installed Node.js, Python, and GCC compilers. Zero local setup required.
                </p>
                <div className="pt-2">
                  <Link
                    href="/arena"
                    className="inline-block rounded-xl bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-zinc-200 transition shadow-lg"
                  >
                    Launch Codespace in Synapse Arena ↗
                  </Link>
                </div>
              </div>
            )}

            {/* VIEW 6: Copilot AI Assistant */}
            {currentView === "Copilot" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 flex flex-col h-[520px]">
                <div className="border-b border-white/10 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">Vridhi Campus Copilot</h3>
                      <p className="text-[11px] text-zinc-400">Pair programming & architecture advisor</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 px-2 py-0.5 text-[10px] font-mono">
                    Model: Synapse-Coder-v2
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 py-4 pr-1 text-xs">
                  {copilotMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl max-w-[85%] ${
                        msg.role === "user"
                          ? "ml-auto bg-indigo-600 text-white"
                          : "mr-auto bg-black/60 border border-white/10 text-zinc-200 font-mono whitespace-pre-wrap"
                      }`}
                    >
                      {msg.text}
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSendCopilot} className="flex gap-2 pt-2 border-t border-white/10">
                  <input
                    type="text"
                    value={copilotQuery}
                    onChange={(e) => setCopilotQuery(e.target.value)}
                    placeholder="Ask Copilot to refactor code, generate types, or optimize SQL..."
                    className="flex-1 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-black hover:bg-zinc-200 transition"
                  >
                    Send
                  </button>
                </form>
              </div>
            )}

            {/* VIEW 7: Explore */}
            {currentView === "Explore" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-black p-6">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                    The Download • Campus Developer News
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    Explore Trending Repositories & Student Builds
                  </h3>
                  <p className="mt-1 text-xs text-zinc-300">
                    Discover projects created across campus departments, star open-source libraries, and fork starters.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repos.map((r) => (
                    <div key={r.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <Link href={`/projects/${r.id}`} className="font-bold text-indigo-300 hover:underline">
                        {r.owner}/{r.name}
                      </Link>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{r.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 8: Marketplace */}
            {currentView === "Marketplace" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Campus Developer Marketplace</h3>
                <p className="text-xs text-zinc-400">
                  Reusable components, microservice templates, and verified hackathon starters published by students.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-white/5 bg-black/40">
                    <span className="font-bold text-white block">Next.js + Firebase Authentication Starter</span>
                    <span className="text-zinc-400 mt-1 block">Production ready RBAC with auth state guards.</span>
                    <button className="mt-3 rounded-lg bg-white/10 px-3 py-1 font-semibold text-zinc-200 hover:bg-white/20">
                      Install Template
                    </button>
                  </div>
                  <div className="p-4 rounded-xl border border-white/5 bg-black/40">
                    <span className="font-bold text-white block">FastAPI Vector Embedding Pipeline</span>
                    <span className="text-zinc-400 mt-1 block">Lightweight semantic search starter module.</span>
                    <button className="mt-3 rounded-lg bg-white/10 px-3 py-1 font-semibold text-zinc-200 hover:bg-white/20">
                      Install Template
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 9: MCP Registry */}
            {currentView === "MCPRegistry" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                <h3 className="text-sm font-bold text-white">Model Context Protocol (MCP) Registry</h3>
                <p className="text-xs text-zinc-400">
                  Campus-hosted MCP endpoints enabling local AI models to inspect student repositories, scrape timetable data, and submit pull requests.
                </p>
                <div className="space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl border border-white/5 bg-black/40 flex items-center justify-between">
                    <div>
                      <span className="text-indigo-400 font-bold block">mcp://vridhi.dev/git/repo-inspector</span>
                      <span className="text-zinc-500 text-[11px]">Inspect code trees and run AST linter</span>
                    </div>
                    <span className="rounded bg-emerald-500/20 text-emerald-300 px-2 py-0.5 text-[10px]">Active</span>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 10: Discussions */}
            {currentView === "Discussions" && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="text-sm font-bold text-white">Developer Discussions & RFCs</h3>
                  <button className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white">
                    + Start Discussion
                  </button>
                </div>
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl border border-white/5 bg-black/40">
                    <span className="font-bold text-white block">RFC: Proposed Architecture for Campus Microservices</span>
                    <span className="text-zinc-500 text-[11px]">Started by KBMADHAV • 14 replies</span>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>

        {/* MODAL 1: PROOF OF BUILD CERTIFICATE (Feature 1) */}
        {activeVerifyRepo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🛡️</span>
                  <h3 className="text-base font-bold text-white">Proof of Build Verification</h3>
                </div>
                <button
                  onClick={() => setActiveVerifyRepo(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="rounded-xl border border-white/5 bg-black/40 p-4">
                  <span className="text-zinc-400 block text-[11px]">Repository Verified:</span>
                  <span className="text-sm font-bold text-white block mt-0.5">
                    {activeVerifyRepo.owner}/{activeVerifyRepo.name}
                  </span>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 text-[10px]">
                      {activeVerifyRepo.verification.level}
                    </span>
                    <span className="text-zinc-400">Score: {activeVerifyRepo.verification.score}/100</span>
                  </div>
                </div>

                <div className="space-y-2 text-zinc-300">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <span>✓ Synapse Arena Test Suite:</span>
                    <span className="text-emerald-400 font-bold">100% Passed</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <span>✓ Multi-Peer Commit Cadence:</span>
                    <span className="text-emerald-400 font-bold">Verified Organic</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                    <span>✓ Original AST Structure:</span>
                    <span className="text-emerald-400 font-bold">No Tutorial Duplicate</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Recruiter Share Link (Paste on Resume / LinkedIn):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`https://vridhi.dev/verify/${activeVerifyRepo.id}`}
                      className="flex-1 rounded-lg border border-white/10 bg-black/60 p-2 font-mono text-[11px] text-zinc-200 outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`https://vridhi.dev/verify/${activeVerifyRepo.id}`);
                        alert("Verification link copied to clipboard!");
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-500"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: ONE-CLICK TEAM MATCHER (Feature 2) */}
        {activeJoinTeamRepo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-violet-500/40 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🤝</span>
                  <h3 className="text-sm font-bold text-white">Apply to Join Repository Team</h3>
                </div>
                <button
                  onClick={() => setActiveJoinTeamRepo(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSendTeamRequest} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="text-zinc-400 font-semibold block">Select Open Role</label>
                  <select
                    value={applicantRole}
                    onChange={(e) => setApplicantRole(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/60 p-2.5 text-white outline-none"
                  >
                    {activeJoinTeamRepo.team.openRoles.map((role, idx) => (
                      <option key={idx} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-zinc-400 font-semibold block">Your Pitch & Experience</label>
                  <textarea
                    rows={3}
                    required
                    value={applicantPitch}
                    onChange={(e) => setApplicantPitch(e.target.value)}
                    placeholder="Mention relevant repos you've built, algorithms solved, or links to your work..."
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/60 p-2.5 text-white outline-none focus:border-violet-500"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveJoinTeamRepo(null)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-zinc-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-violet-600 py-2 font-bold text-white hover:bg-violet-500 transition"
                  >
                    Send Team Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL 3: IN-BROWSER INSTANT DEMO SANDBOX (Feature 3) */}
        {activeDemoRepo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-2xl border border-indigo-500/40 bg-zinc-950 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 animate-pulse">●</span>
                  <h3 className="text-sm font-bold text-white font-mono">
                    Synapse Sandbox Output: {activeDemoRepo.name}
                  </h3>
                </div>
                <button
                  onClick={() => setActiveDemoRepo(null)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/80 p-4 font-mono text-xs min-h-[220px]">
                {demoExecuting ? (
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span className="animate-spin">⚙</span>
                    <span>Compiling container & spinning isolated sandbox...</span>
                  </div>
                ) : (
                  <pre className="text-emerald-300 whitespace-pre-wrap leading-relaxed">
                    {activeDemoRepo.demoOutput}
                  </pre>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                <span>⚡ Test environment running on MRU Synapse Node #4</span>
                <Link
                  href="/arena"
                  className="text-indigo-400 hover:underline"
                >
                  Open Full Interactive Terminal ↗
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* LEFT DRAWER MODAL (MATCHING SCREENSHOT 2 EXACTLY) */}
        {showDrawer && (
          <div className="fixed inset-0 z-50 flex">
            <div
              onClick={() => setShowDrawer(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            <div className="relative w-80 bg-zinc-950 border-r border-white/10 p-5 flex flex-col shadow-2xl z-10 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">Vridhi Git Menu</span>
                </div>
                <button
                  onClick={() => setShowDrawer(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 space-y-1 text-xs font-semibold text-zinc-300">
                <Link
                  href="/"
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>🏠</span> Home
                </Link>
                <button
                  onClick={() => {
                    setCurrentView("Repositories");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>📦</span> All repositories
                </button>
                <button
                  onClick={() => {
                    setCurrentView("Challenges");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-emerald-400 transition"
                >
                  <span>🏆</span> Fork-to-Internship
                </button>
                <button
                  onClick={() => {
                    setCurrentView("AllIssues");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>🎯</span> All issues
                </button>
                <button
                  onClick={() => {
                    setCurrentView("AllPullRequests");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>⑂</span> All pull requests
                </button>
                <button
                  onClick={() => {
                    setCurrentView("Codespaces");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>💻</span> Codespaces
                </button>
                <button
                  onClick={() => {
                    setCurrentView("Copilot");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>🤖</span> Copilot
                </button>
                <div className="my-2 border-t border-white/5" />
                <button
                  onClick={() => {
                    setCurrentView("Explore");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>🔭</span> Explore
                </button>
                <button
                  onClick={() => {
                    setCurrentView("Marketplace");
                    setShowDrawer(false);
                  }}
                  className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition"
                >
                  <span>🏪</span> Marketplace
                </button>
              </div>

              <div className="mt-6 border-t border-white/10 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
                  Top repositories
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  {repos.map((r) => (
                    <Link
                      key={r.id}
                      href={`/projects/${r.id}`}
                      onClick={() => setShowDrawer(false)}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-300 transition truncate block"
                    >
                      <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      <span className="truncate">
                        {r.owner}/{r.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE REPOSITORY */}
        {showNewRepoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white">Create a New Repository</h3>
                <button
                  onClick={() => setShowNewRepoModal(false)}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateRepo} className="mt-4 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-zinc-300 block">Repository Name *</label>
                  <input
                    type="text"
                    required
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="e.g. distributed-kv-store"
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="font-semibold text-zinc-300 block">Description (optional)</label>
                  <textarea
                    rows={2}
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="Brief description of your project..."
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-zinc-300 block">Language</label>
                    <select
                      value={newRepoLang}
                      onChange={(e) => setNewRepoLang(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white outline-none"
                    >
                      <option value="TypeScript">TypeScript</option>
                      <option value="JavaScript">JavaScript</option>
                      <option value="Python">Python</option>
                      <option value="HTML">HTML</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-zinc-300 block">Visibility</label>
                    <select
                      value={newRepoVis}
                      onChange={(e) => setNewRepoVis(e.target.value as any)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white outline-none"
                    >
                      <option value="Public">Public</option>
                      <option value="Private">Private</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowNewRepoModal(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-zinc-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 rounded-xl bg-white py-2 text-black font-bold hover:bg-zinc-200 transition disabled:opacity-50"
                  >
                    {creating ? "Creating..." : "Create Repository"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}