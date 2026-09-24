"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import ReactMarkdown from "react-markdown";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

interface FileNode {
  name: string;
  type: "file" | "folder";
  content?: string;
  children?: FileNode[];
}

interface VerificationBadge {
  level: "Arena Verified" | "Multi-Contributor" | "Original Build";
  score: number;
  testPassed: boolean;
}

interface TeamRecruitment {
  isRecruiting: boolean;
  openRoles: string[];
}

const DEFAULT_FILE_TREE: FileNode[] = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "index.ts",
        type: "file",
        content: `import express from "express";\n\nconst app = express();\nconst PORT = process.env.PORT || 8080;\n\napp.use(express.json());\n\napp.get("/health", (req, res) => {\n  res.json({ status: "healthy", timestamp: Date.now() });\n});\n\napp.listen(PORT, () => {\n  console.log(\`Vridhi service live on port \${PORT}\`);\n});`,
      },
      {
        name: "engine.ts",
        type: "file",
        content: `export function computeProofOfSkill(userId: string, solutions: number[]) {\n  const score = solutions.reduce((acc, curr) => acc + curr, 0);\n  return { userId, rank: score > 1000 ? "Grandmaster" : "Specialist" };\n}`,
      },
    ],
  },
  {
    name: "package.json",
    type: "file",
    content: `{\n  "name": "vridhi-core-engine",\n  "version": "1.0.0",\n  "main": "src/index.ts",\n  "dependencies": {\n    "express": "^4.19.2"\n  }\n}`,
  },
  {
    name: "README.md",
    type: "file",
    content: `# Vridhi Core Engine 🚀\n\nA high-performance microservice suite built for campus developers.\n\n### Key Features\n- **Zero-Latency Execution**: Run algorithmic test cases in sandboxed environments.\n- **Decentralized Verification**: Cryptographic proof-of-skill records.\n- **Campus Social Mesh**: Real-time project collaboration & hackathon recruitment.\n\n### Getting Started\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n\n*Built for university innovators.*`,
  },
];

export default function RepositoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const repoId = typeof params?.id === "string" ? params.id : "vridhi-core-engine";

  const [user, setUser] = useState<User | null>(null);
  const [repoData, setRepoData] = useState<any>({
    title: "vridhi-core-engine",
    description:
      "High performance microservice suite with Monaco editor integration, algorithmic sandboxing & verification pipelines.",
    visibility: "Public",
    stars: ["user1", "user2"],
    forks: 4,
    branch: "main",
    authorName: "Bindu Madhav",
    authorEmail: "bindu.madhav@mru.edu.in",
    authorRole: "Lead Architect • 3rd Year CSE",
    ownerId: "",
    verification: {
      level: "Arena Verified",
      score: 98,
      testPassed: true,
    },
    team: {
      isRecruiting: true,
      openRoles: ["Frontend (Tailwind/Next.js)", "DevOps / Docker"],
    },
  });

  const [fileTree, setFileTree] = useState<FileNode[]>(DEFAULT_FILE_TREE);
  const [selectedFile, setSelectedFile] = useState<FileNode>({
    name: "README.md",
    type: "file",
    content: DEFAULT_FILE_TREE.find((f) => f.name === "README.md")?.content || "",
  });

  // Folder collapse tracking
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // In-Browser Code Editing & Commit State
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [commitMsg, setCommitMsg] = useState("");
  const [showCommitModal, setShowCommitModal] = useState(false);
  const [committing, setCommitting] = useState(false);

  // Verification & Team Modals
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamRole, setTeamRole] = useState("");
  const [teamPitch, setTeamPitch] = useState("");

  // Branch selector state
  const [selectedBranch, setSelectedBranch] = useState("main");
  const [showCloneModal, setShowCloneModal] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const docRef = doc(db, "repositories", repoId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const d = snap.data();
          setRepoData((prev: any) => ({
            ...prev,
            title: d.name || d.title || prev.title,
            description: d.description || prev.description,
            authorName: d.ownerName || prev.authorName,
            authorEmail: d.ownerEmail || prev.authorEmail,
            authorRole: d.ownerRole || prev.authorRole,
            ownerId: d.ownerId || "",
            stars: d.stars || [],
            forks: d.forks || 0,
            verification: d.verification || prev.verification,
            team: d.team || prev.team,
          }));

          if (d.files && Array.isArray(d.files)) {
            setFileTree(d.files);
            const foundReadme = d.files.find((f: FileNode) => f.name === "README.md");
            if (foundReadme) {
              setSelectedFile(foundReadme);
              setEditedCode(foundReadme.content || "");
            }
          }
        }
      } catch (err) {
        console.error("Repository load error:", err);
      }
    };
    if (repoId !== "demo" && repoId !== "vridhi-core-engine") fetchRepo();
  }, [repoId]);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders((prev) => ({
      ...prev,
      [folderName]: !prev[folderName],
    }));
  };

  const handleSelectFile = (file: FileNode) => {
    setSelectedFile(file);
    setEditedCode(file.content || "");
    setIsEditing(false);
  };

  const toggleStar = async () => {
    if (!user) {
      alert("Please log in to star this repository.");
      return;
    }
    const hasStarred = repoData.stars?.includes(user.uid);
    const newStars = hasStarred
      ? repoData.stars.filter((id: string) => id !== user.uid)
      : [...(repoData.stars || []), user.uid];

    setRepoData((prev: any) => ({ ...prev, stars: newStars }));

    try {
      if (repoId !== "demo") {
        const docRef = doc(db, "repositories", repoId);
        await updateDoc(docRef, {
          stars: hasStarred ? arrayRemove(user.uid) : arrayUnion(user.uid),
        });
      }
    } catch (err) {
      console.error("Failed to star:", err);
    }
  };

  const handleFork = () => {
    setRepoData((prev: any) => ({ ...prev, forks: (prev.forks || 0) + 1 }));
    alert("Repository successfully forked to your Vridhi profile!");
  };

  const handleCommitFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitMsg.trim()) return;
    setCommitting(true);

    const updateRecursive = (nodes: FileNode[]): FileNode[] => {
      return nodes.map((node) => {
        if (node.name === selectedFile.name && node.type === "file") {
          return { ...node, content: editedCode };
        }
        if (node.children) {
          return { ...node, children: updateRecursive(node.children) };
        }
        return node;
      });
    };

    const updatedTree = updateRecursive(fileTree);
    setFileTree(updatedTree);
    setSelectedFile((prev) => ({ ...prev, content: editedCode }));
    setIsEditing(false);
    setShowCommitModal(false);

    try {
      if (repoId !== "demo" && repoId !== "vridhi-core-engine") {
        const docRef = doc(db, "repositories", repoId);
        await updateDoc(docRef, { files: updatedTree });
      }
      alert(`Changes committed: "${commitMsg.trim()}"`);
      setCommitMsg("");
    } catch (err) {
      console.error("Commit failed:", err);
      alert("Failed to commit changes to cloud.");
    } finally {
      setCommitting(false);
    }
  };

  const handleSendTeamPitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamPitch.trim()) return;
    alert(`Application for "${teamRole || repoData.team?.openRoles?.[0]}" submitted directly to ${repoData.authorName}!`);
    setShowTeamModal(false);
    setTeamPitch("");
  };

  const isOwner = user && repoData.ownerId === user.uid;

  const readmeContent =
    fileTree.find((f) => f.name === "README.md")?.content ||
    (selectedFile.name === "README.md" ? selectedFile.content : "") ||
    DEFAULT_FILE_TREE.find((f) => f.name === "README.md")?.content ||
    "";

  return (
    <main className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Author / Publisher Banner */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 mb-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-xl font-bold text-white shadow-lg">
                {repoData.authorName?.[0]?.toUpperCase() || "B"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white">{repoData.authorName}</span>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                    Lead Maintainer
                  </span>
                </div>
                <div className="text-xs text-indigo-400 font-mono mt-0.5">{repoData.authorEmail}</div>
                <div className="text-xs text-zinc-400 mt-1">{repoData.authorRole}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Recruiter Proof of Build Trigger */}
              <button
                onClick={() => setShowVerifyModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 transition shadow-sm"
              >
                <span>🛡️</span>
                <span>Proof of Build</span>
                <span className="text-emerald-300 font-mono">({repoData.verification?.score || 98}%)</span>
              </button>

              <Link
                href={`/chat?recipient=${encodeURIComponent(repoData.authorEmail)}&name=${encodeURIComponent(repoData.authorName)}`}
                className="rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-300 hover:bg-violet-500/20 transition"
              >
                💬 Chat with Maintainer
              </Link>

              <a
                href={`mailto:${repoData.authorEmail}?subject=Query regarding ${repoData.title}`}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition"
              >
                ✉ Email
              </a>
            </div>
          </div>

          {/* Team Roster Bar if Recruiting */}
          {repoData.team?.isRecruiting && (
            <div className="mt-5 rounded-xl border border-violet-500/30 bg-violet-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base">🤝</span>
                <div>
                  <span className="text-xs font-bold text-white block">
                    This project is actively recruiting teammates:
                  </span>
                  <span className="text-xs text-violet-300">
                    Open Roles: {repoData.team.openRoles.join(" • ")}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setTeamRole(repoData.team.openRoles[0] || "Contributor");
                  setShowTeamModal(true);
                }}
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-violet-500 transition shadow-md shrink-0"
              >
                Apply to Join Team
              </button>
            </div>
          )}
        </div>

        {/* Repository Header: Breadcrumbs & Action Toolbar */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link href="/projects" className="text-zinc-500 hover:text-zinc-300 transition">
                projects /
              </Link>
              <h1 className="text-2xl font-bold tracking-tight text-white">{repoData.title}</h1>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-zinc-400">
                {repoData.visibility || "Public"}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400 max-w-2xl leading-relaxed">
              {repoData.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={toggleStar}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition ${
                repoData.stars?.includes(user?.uid)
                  ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                  : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              ★ Star ({repoData.stars?.length || 0})
            </button>

            <button
              onClick={handleFork}
              className="rounded-lg border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 transition"
            >
              ⑂ Fork ({repoData.forks || 0})
            </button>

            <button
              onClick={() => setShowCloneModal(true)}
              className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-sm"
            >
              &lt;&gt; Code
            </button>
          </div>
        </div>

        {/* Branch Selector + Sandbox Runner Link */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium font-mono text-zinc-300">
              <span>🌿</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="bg-transparent text-white outline-none cursor-pointer"
              >
                <option value="main" className="bg-zinc-900">main</option>
                <option value="dev" className="bg-zinc-900">dev</option>
                <option value="v1.0-release" className="bg-zinc-900">v1.0-release</option>
              </select>
            </div>

            <span className="text-xs text-zinc-500 font-mono">
              / {selectedFile.name}
            </span>
          </div>

          <Link
            href={`/arena?repo=${encodeURIComponent(repoData.title)}&file=${encodeURIComponent(selectedFile.name)}`}
            className="flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition"
          >
            <span>⚡</span>
            <span>Execute in Synapse Sandbox ↗</span>
          </Link>
        </div>

        {/* Dual-Pane Code Explorer: Collapsible File Tree (Left) & Editor (Right) */}
        <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
          {/* File Tree (3 cols) */}
          <div className="lg:col-span-3 border-b lg:border-b-0 lg:border-r border-white/10 p-4 bg-black/40">
            <div className="flex items-center justify-between mb-3 text-xs font-bold uppercase tracking-wider text-zinc-400">
              <span>Repository Files</span>
              <span className="text-[10px] text-zinc-500 font-mono">{selectedBranch}</span>
            </div>

            <div className="space-y-1 text-xs font-mono">
              {fileTree.map((node, i) => (
                <div key={i}>
                  {node.type === "folder" ? (
                    <div>
                      <button
                        onClick={() => toggleFolder(node.name)}
                        className="w-full text-left py-1 px-1 rounded flex items-center gap-1.5 text-zinc-300 hover:text-white transition font-semibold"
                      >
                        <span>{collapsedFolders[node.name] ? "▶" : "▼"}</span>
                        <span>📁 {node.name}</span>
                      </button>

                      {!collapsedFolders[node.name] && (
                        <div className="pl-4 space-y-1 mt-0.5 border-l border-white/10 ml-2">
                          {node.children?.map((child, ci) => (
                            <button
                              key={ci}
                              onClick={() => handleSelectFile(child)}
                              className={`w-full text-left py-1 px-2 rounded block transition ${
                                selectedFile.name === child.name
                                  ? "bg-indigo-600/30 text-indigo-300 font-bold"
                                  : "text-zinc-400 hover:text-white hover:bg-white/5"
                              }`}
                            >
                              📄 {child.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSelectFile(node)}
                      className={`w-full text-left py-1 px-2 rounded block transition ${
                        selectedFile.name === node.name
                          ? "bg-indigo-600/30 text-indigo-300 font-bold"
                          : "text-zinc-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      📄 {node.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Active Code Viewer / Live Editor (9 cols) */}
          <div className="lg:col-span-9 flex flex-col min-h-[420px] bg-black/60">
            <div className="border-b border-white/10 px-4 py-2.5 bg-black/40 flex items-center justify-between text-xs">
              <span className="font-mono text-zinc-300 flex items-center gap-2">
                <span>📄</span>
                <span>{selectedFile.name}</span>
                {isEditing && (
                  <span className="rounded bg-amber-500/20 text-amber-300 px-1.5 py-0.2 text-[10px]">
                    Editing
                  </span>
                )}
              </span>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (isEditing) {
                      setShowCommitModal(true);
                    } else {
                      setEditedCode(selectedFile.content || "");
                      setIsEditing(true);
                    }
                  }}
                  className={`font-semibold transition rounded-lg px-2.5 py-1 ${
                    isEditing
                      ? "bg-indigo-600 text-white hover:bg-indigo-500"
                      : "border border-white/10 bg-white/5 text-zinc-300 hover:text-white"
                  }`}
                >
                  {isEditing ? "Commit Changes..." : "✎ Edit File"}
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedFile.content || "");
                    alert("File contents copied to clipboard!");
                  }}
                  className="text-zinc-400 hover:text-white transition"
                >
                  Copy Raw
                </button>
              </div>
            </div>

            {isEditing ? (
              <textarea
                value={editedCode}
                onChange={(e) => setEditedCode(e.target.value)}
                rows={18}
                className="w-full flex-1 bg-black/90 p-4 font-mono text-xs text-zinc-200 outline-none resize-none leading-relaxed"
                placeholder="Write code here..."
              />
            ) : (
              <pre className="p-4 font-mono text-xs text-zinc-200 overflow-x-auto whitespace-pre leading-relaxed">
                {selectedFile.content || "// Empty file"}
              </pre>
            )}
          </div>
        </div>

        {/* README Preview Section */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-sm">
          <div className="border-b border-white/10 pb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400">
            <span>📖 README.md</span>
          </div>
          <div className="mt-4 prose prose-invert max-w-none text-sm leading-relaxed text-zinc-300">
            <ReactMarkdown>{readmeContent}</ReactMarkdown>
          </div>
        </div>
      </div>

      {/* COMMIT MODAL */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Commit Changes to {selectedFile.name}</h3>
              <button
                onClick={() => setShowCommitModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCommitFile} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold block">Commit Message *</label>
                <input
                  type="text"
                  required
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="e.g. fix: update token verify payload structure"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="rounded-lg bg-black/40 border border-white/5 p-3 text-zinc-400 text-[11px]">
                Target branch: <strong className="text-white">{selectedBranch}</strong>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCommitModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={committing}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 font-bold text-white hover:bg-indigo-500 transition disabled:opacity-50"
                >
                  {committing ? "Committing..." : "Commit Directly"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROOF OF BUILD CERTIFICATE */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-emerald-500/40 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🛡️</span>
                <h3 className="text-base font-bold text-white">Proof-of-Build Certificate</h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="rounded-xl border border-white/5 bg-black/40 p-4">
                <span className="text-zinc-400 block text-[11px]">Verified Entity:</span>
                <span className="text-base font-bold text-white block mt-0.5">
                  {repoData.authorName} / {repoData.title}
                </span>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 text-[10px]">
                    {repoData.verification?.level || "Arena Verified"}
                  </span>
                  <span className="text-zinc-400">Score: {repoData.verification?.score || 98}/100</span>
                </div>
              </div>

              <div className="space-y-2 text-zinc-300">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span>✓ Synapse Sandboxed Test Suite:</span>
                  <span className="text-emerald-400 font-bold">100% Passed</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span>✓ AST Originality Rating:</span>
                  <span className="text-emerald-400 font-bold">98.4% Clean</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                  <span>✓ Multi-Peer Commit Log:</span>
                  <span className="text-emerald-400 font-bold">Cryptographically Verified</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">
                  Shareable Recruiter Verification Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://vridhi.dev/verify/${repoId}`}
                    className="flex-1 rounded-lg border border-white/10 bg-black/60 p-2 font-mono text-[11px] text-zinc-200 outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`https://vridhi.dev/verify/${repoId}`);
                      alert("Proof-of-build link copied to clipboard!");
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

      {/* MODAL: TEAM APPLICATION */}
      {showTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-violet-500/40 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤝</span>
                <h3 className="text-sm font-bold text-white">Join Repository Team</h3>
              </div>
              <button
                onClick={() => setShowTeamModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendTeamPitch} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="text-zinc-400 font-semibold block">Select Desired Role</label>
                <select
                  value={teamRole}
                  onChange={(e) => setTeamRole(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/60 p-2.5 text-white outline-none"
                >
                  {repoData.team?.openRoles?.map((r: string, idx: number) => (
                    <option key={idx} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-zinc-400 font-semibold block">Brief Pitch / Portfolio Highlights</label>
                <textarea
                  rows={3}
                  required
                  value={teamPitch}
                  onChange={(e) => setTeamPitch(e.target.value)}
                  placeholder="Mention algorithms you've solved or relevant repos on Vridhi..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/60 p-2.5 text-white outline-none focus:border-violet-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowTeamModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-zinc-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-violet-600 py-2 font-bold text-white hover:bg-violet-500 transition"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLONE MODAL */}
      {showCloneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Clone this Repository</h3>
              <button
                onClick={() => setShowCloneModal(false)}
                className="text-xs text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-3">
              <label className="text-xs text-zinc-400">HTTPS Clone Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`https://vridhi.dev/git/${repoData.title}.git`}
                  className="flex-1 rounded-lg border border-white/10 bg-black/60 p-2 text-xs font-mono text-white outline-none"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://vridhi.dev/git/${repoData.title}.git`);
                    alert("Clone URL copied!");
                  }}
                  className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-500"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}