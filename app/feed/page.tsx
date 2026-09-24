"use client";

import { useEffect, useState, ChangeEvent } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../../lib/firebase";

interface CampusEvent {
  id: string;
  title: string;
  category: "Hackathon" | "Workshop" | "Competition" | "Opportunities";
  date: string;
  venue: string;
  summary: string;
  registrationUrl: string;
  deadline?: string;
  prizePool?: string;
  tags: string[];
  calStart: string;
  calEnd: string;
  publisherName: string;
  publisherEmail: string;
  clubId?: string;
}

interface Comment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface Post {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  tag: string;
  location?: string;
  images?: string[];
  videos?: string[];
  audio?: string;
  upvotes: string[];
  downvotes: string[];
  comments?: Comment[];
  createdAt: any;
}

interface UniversityClub {
  id: string;
  name: string;
  tagline: string;
  type: "Centralized" | "Departmental";
  department?: string;
  email: string;
  membersCount: number;
  leadName: string;
}

const UNIVERSITY_CLUBS_DIRECTORY: UniversityClub[] = [
  // Centralized University Bodies & Clubs
  {
    id: "e-cell-central",
    name: "E-Cell (Centre for Entrepreneurship)",
    tagline: "Incubating student ventures, seed-funding, and startup hackathons.",
    type: "Centralized",
    email: "ecell@mru.edu.in",
    membersCount: 420,
    leadName: "Arjun Reddy (Lead)",
  },
  {
    id: "student-affairs-hub",
    name: "Dean of Student Affairs / Tech Guild",
    tagline: "University-wide festivals, official hackathons & tech sponsorships.",
    type: "Centralized",
    email: "hackathons@mru.edu.in",
    membersCount: 850,
    leadName: "Student Council Board",
  },
  {
    id: "vridhi-labs",
    name: "Vridhi Open Source & Core Guild",
    tagline: "Campus developer mesh, shared sandboxes & open-source projects.",
    type: "Centralized",
    email: "core@vridhi.dev",
    membersCount: 310,
    leadName: "Bindu Madhav (Core Lead)",
  },
  {
    id: "cultural-sports-council",
    name: "Aura Cultural & Sports Society",
    tagline: "University annual arts festivals, theatre, debates, and athletics.",
    type: "Centralized",
    email: "aura.council@mru.edu.in",
    membersCount: 650,
    leadName: "Ritika Sen (Convenor)",
  },

  // Department-Specific Clubs
  {
    id: "club-coding-guild",
    name: "Competitive Coding Guild",
    tagline: "Speed duels, DSA masterclasses, and ICPC sprints.",
    type: "Departmental",
    department: "Department of Computer Science & Engineering (CSE)",
    email: "codingguild@mru.edu.in",
    membersCount: 280,
    leadName: "Aditya Nair",
  },
  {
    id: "dept-cse-office",
    name: "CSE Research & Innovations Council",
    tagline: "Academic queries, GPU compute access, and systems research.",
    type: "Departmental",
    department: "Department of Computer Science & Engineering (CSE)",
    email: "cse.workshops@mru.edu.in",
    membersCount: 520,
    leadName: "Dr. K. Srinivas (Faculty Advisor)",
  },
  {
    id: "lab-ai-research",
    name: "Autonomous Systems & AI Lab (ASL)",
    tagline: "LLM benchmarks, robotics perception, and summer student fellowships.",
    type: "Departmental",
    department: "Department of Artificial Intelligence & Data Science (AI/DS)",
    email: "ai.research@mru.edu.in",
    membersCount: 190,
    leadName: "Neha Sharma",
  },
  {
    id: "club-iot-robotics",
    name: "Robotics & Embedded Systems Forum (RESF)",
    tagline: "PCB prototyping, drones, micro-controllers & automation.",
    type: "Departmental",
    department: "Department of Electronics & Communication (ECE)",
    email: "robotics.ece@mru.edu.in",
    membersCount: 215,
    leadName: "Varun Verma",
  },
  {
    id: "club-sae-mechanics",
    name: "SAE Collegiate Club / Aero-Design",
    tagline: "Formula student racing, aerodynamic CAD modelling & motorsports.",
    type: "Departmental",
    department: "Department of Mechanical Engineering (ME)",
    email: "sae.club@mru.edu.in",
    membersCount: 140,
    leadName: "Karthik P.",
  },
];

const FEATURED_CAMPUS_FEED_ITEMS: CampusEvent[] = [
  {
    id: "hack-mru-2026",
    title: "MRU Innovate 36-Hour National Hackathon",
    category: "Hackathon",
    date: "October 14–16, 2026",
    venue: "Main Campus Auditorium & Labs",
    summary:
      "Join the flagship university hackathon to build Web3, AI, and Cloud solutions. Mentorship from industry engineers, rapid prototyping, and live prototype pitching.",
    registrationUrl: "https://unstop.com",
    deadline: "Oct 10, 2026",
    prizePool: "₹1,50,000",
    tags: ["Open Innovation", "AI/ML", "Web3"],
    calStart: "20261014T033000Z",
    calEnd: "20261016T123000Z",
    publisherName: "Dean of Student Affairs / Tech Guild",
    publisherEmail: "hackathons@mru.edu.in",
    clubId: "student-affairs-hub",
  },
  {
    id: "opp-ai-fellow-2026",
    title: "AI Research Fellow (Summer '26)",
    category: "Opportunities",
    date: "Starts May 2026",
    venue: "Autonomous Systems Lab / Hybrid",
    summary:
      "Work directly with faculty and senior researchers on LLM fine-tuning, benchmark evaluation pipelines, and robotics perception systems. Includes monthly stipend.",
    registrationUrl: "https://forms.google.com",
    deadline: "Nov 15, 2026",
    prizePool: "₹35,000 / mo",
    tags: ["Research", "LLMs", "Funded"],
    calStart: "20261115T182900Z",
    calEnd: "20261115T182900Z",
    publisherName: "Autonomous Systems & AI Lab (ASL)",
    publisherEmail: "ai.research@mru.edu.in",
    clubId: "lab-ai-research",
  },
  {
    id: "ml-workshop-2026",
    title: "Applied Generative AI & Autonomous Agent Architectures",
    category: "Workshop",
    date: "November 4, 2026",
    venue: "CSE Seminar Hall 2",
    summary:
      "Hands-on workshop covering vector embeddings, LangChain orchestration, and deploying local open-weight models on hardware accelerators.",
    registrationUrl: "https://forms.google.com",
    deadline: "Nov 2, 2026",
    tags: ["Generative AI", "LLMs", "Hands-on"],
    calStart: "20261104T043000Z",
    calEnd: "20261104T113000Z",
    publisherName: "CSE Research & Innovations Council",
    publisherEmail: "cse.workshops@mru.edu.in",
    clubId: "dept-cse-office",
  },
  {
    id: "opp-fullstack-intern",
    title: "Software Engineering Intern (Frontend / Fullstack)",
    category: "Opportunities",
    date: "Immediate Opening",
    venue: "Vridhi Core Labs / Hyderabad",
    summary:
      "Looking for student builders proficient with Next.js, TypeScript, and Firebase. Build real-world platform features used across campus.",
    registrationUrl: "https://linkedin.com",
    deadline: "Dec 01, 2026",
    prizePool: "₹25,000 / mo",
    tags: ["Internship", "Next.js", "Fullstack"],
    calStart: "20261201T182900Z",
    calEnd: "20261201T182900Z",
    publisherName: "Vridhi Open Source & Core Guild",
    publisherEmail: "core@vridhi.dev",
    clubId: "vridhi-labs",
  },
  {
    id: "speed-duel-2026",
    title: "Algorithmic Code Sprint: Speed Duel 2026",
    category: "Competition",
    date: "November 20, 2026",
    venue: "Vridhi Arena Online Portal",
    summary:
      "A 3-hour competitive programming sprint testing algorithmic efficiency, dynamic programming, and data structures.",
    registrationUrl: "https://vridhi.dev/arena",
    deadline: "Nov 19, 2026",
    prizePool: "₹25,000",
    tags: ["Data Structures", "Speed", "Algorithms"],
    calStart: "20261120T093000Z",
    calEnd: "20261120T123000Z",
    publisherName: "Competitive Coding Guild",
    publisherEmail: "codingguild@mru.edu.in",
    clubId: "club-coding-guild",
  },
];

export default function UniversityFeedPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Left Flyout Drawer State for Clubs & Departments
  const [showClubsDrawer, setShowClubsDrawer] = useState(false);
  const [clubsTab, setClubsTab] = useState<"All" | "Centralized" | "Departmental">("All");

  // Selected filter pills
  const [activeCategory, setActiveCategory] = useState("All");
  const [activeStudentFilter, setActiveStudentFilter] = useState("All");

  // Registration / Details Modal State
  const [activeModalEvent, setActiveModalEvent] = useState<CampusEvent | null>(null);

  // Event interaction states
  const [eventLikes, setEventLikes] = useState<Record<string, number>>({
    "hack-mru-2026": 42,
    "opp-ai-fellow-2026": 35,
    "ml-workshop-2026": 28,
    "opp-fullstack-intern": 51,
    "speed-duel-2026": 19,
  });
  const [likedEvents, setLikedEvents] = useState<Record<string, boolean>>({});
  const [savedEvents, setSavedEvents] = useState<Record<string, boolean>>({});
  const [notifiedEvents, setNotifiedEvents] = useState<Record<string, boolean>>({});
  const [eventCommentsOpen, setEventCommentsOpen] = useState<Record<string, boolean>>({});
  const [eventComments, setEventComments] = useState<Record<string, Comment[]>>({
    "hack-mru-2026": [
      {
        id: "c1",
        authorName: "Ananya R.",
        content: "Looking for 1 frontend dev to team up for the Web3 track!",
        createdAt: "2h ago",
      },
    ],
  });
  const [eventCommentInputs, setEventCommentInputs] = useState<Record<string, string>>({});

  // Share Update Modal State with Multi-Media & Location
  const [showPostModal, setShowPostModal] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [selectedTag, setSelectedTag] = useState("#FindTeammates");
  const [locationTag, setLocationTag] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [audio, setAudio] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  // Threaded Comments State
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsub();
  }, []);

  const fetchPosts = async () => {
    try {
      const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const list: Post[] = querySnapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          content: data.content || "",
          authorId: data.authorId || "",
          authorName: data.authorName || "Campus Builder",
          authorRole: data.authorRole || "Student Developer",
          tag: data.tag || "#Showcase",
          location: data.location || "",
          images: Array.isArray(data.images) ? data.images : [],
          videos: Array.isArray(data.videos) ? data.videos : [],
          audio: data.audio || null,
          upvotes: Array.isArray(data.upvotes) ? data.upvotes : [],
          downvotes: Array.isArray(data.downvotes) ? data.downvotes : [],
          comments: Array.isArray(data.comments) ? data.comments : [],
          createdAt: data.createdAt,
        };
      });
      setPosts(list);
    } catch (err) {
      console.error("Error loading feed:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setVideos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAudioUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAudio(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newContent.trim() && images.length === 0 && videos.length === 0)) return;
    setPosting(true);

    try {
      await addDoc(collection(db, "posts"), {
        content: newContent.trim(),
        tag: selectedTag,
        location: locationTag.trim(),
        images,
        videos,
        audio,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split("@")[0] || "Student",
        authorRole: "Campus Developer",
        upvotes: [],
        downvotes: [],
        comments: [],
        createdAt: serverTimestamp(),
      });

      setNewContent("");
      setLocationTag("");
      setImages([]);
      setVideos([]);
      setAudio(null);
      setShowPostModal(false);
      fetchPosts();
    } catch (err) {
      console.error("Failed to post update:", err);
    } finally {
      setPosting(false);
    }
  };

  const handleVote = async (postId: string, type: "up" | "down") => {
    if (!user) {
      alert("Please log in to vote on posts.");
      return;
    }
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const hasUpvoted = post.upvotes.includes(user.uid);
    const hasDownvoted = post.downvotes.includes(user.uid);
    const postRef = doc(db, "posts", postId);

    try {
      if (type === "up") {
        if (hasUpvoted) {
          await updateDoc(postRef, { upvotes: arrayRemove(user.uid) });
        } else {
          await updateDoc(postRef, {
            upvotes: arrayUnion(user.uid),
            downvotes: arrayRemove(user.uid),
          });
        }
      } else {
        if (hasDownvoted) {
          await updateDoc(postRef, { downvotes: arrayRemove(user.uid) });
        } else {
          await updateDoc(postRef, {
            downvotes: arrayUnion(user.uid),
            upvotes: arrayRemove(user.uid),
          });
        }
      }
      fetchPosts();
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user) {
      alert("Please log in to comment.");
      return;
    }
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      authorName: user.displayName || user.email?.split("@")[0] || "Student",
      content: text,
      createdAt: "Just now",
    };

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, { comments: arrayUnion(newComment) });
      setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
      fetchPosts();
    } catch (err) {
      console.error("Comment failed:", err);
    }
  };

  const toggleEventLike = (eventId: string) => {
    const isLiked = likedEvents[eventId];
    setLikedEvents((prev) => ({ ...prev, [eventId]: !isLiked }));
    setEventLikes((prev) => ({
      ...prev,
      [eventId]: (prev[eventId] || 0) + (isLiked ? -1 : 1),
    }));
  };

  const toggleEventSave = (eventId: string) => {
    const next = !savedEvents[eventId];
    setSavedEvents((prev) => ({ ...prev, [eventId]: next }));
    alert(next ? "Item bookmarked!" : "Removed from saved.");
  };

  const toggleEventNotify = (eventId: string) => {
    const next = !notifiedEvents[eventId];
    setNotifiedEvents((prev) => ({ ...prev, [eventId]: next }));
    alert(next ? "🔔 Alert enabled! You will receive reminders before the deadline." : "Notifications muted.");
  };

  const handleShareEvent = (ev: CampusEvent) => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/feed#${ev.id}`);
      alert(`Direct link copied for: ${ev.title}`);
    }
  };

  const handleAddEventComment = (eventId: string) => {
    const text = eventCommentInputs[eventId]?.trim();
    if (!text) return;

    const newComm: Comment = {
      id: Date.now().toString(),
      authorName: user?.displayName || user?.email?.split("@")[0] || "Student",
      content: text,
      createdAt: "Just now",
    };

    setEventComments((prev) => ({
      ...prev,
      [eventId]: [...(prev[eventId] || []), newComm],
    }));
    setEventCommentInputs((prev) => ({ ...prev, [eventId]: "" }));
  };

  const getGoogleCalendarUrl = (ev: CampusEvent) => {
    const base = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    const text = `&text=${encodeURIComponent(ev.title)}`;
    const dates = `&dates=${ev.calStart}/${ev.calEnd}`;
    const details = `&details=${encodeURIComponent(
      `Published by: ${ev.publisherName} (${ev.publisherEmail})\n\n${ev.summary}\n\nOfficial Link: ${ev.registrationUrl}`
    )}`;
    const location = `&location=${encodeURIComponent(ev.venue)}`;
    return `${base}${text}${dates}${details}${location}`;
  };

  const getMailToUrl = (email: string, title?: string, eventId?: string) => {
    const subject = title ? `[Campus Query] Regarding: ${title}` : `[Campus Query] General Student Enquiry`;
    const body = `Hi Coordinators,\n\nI am contacting you regarding ${title ? `"${title}" (ID: ${eventId})` : "your club/department activity"}.\n\nMy Query:\n`;
    return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const filteredItems =
    activeCategory === "All"
      ? FEATURED_CAMPUS_FEED_ITEMS
      : FEATURED_CAMPUS_FEED_ITEMS.filter((e) => e.category === activeCategory);

  const filteredPosts =
    activeStudentFilter === "All"
      ? posts
      : posts.filter((p) => p.tag === activeStudentFilter);

  const filteredClubs = UNIVERSITY_CLUBS_DIRECTORY.filter((c) => {
    if (clubsTab === "Centralized") return c.type === "Centralized";
    if (clubsTab === "Departmental") return c.type === "Departmental";
    return true;
  });

  return (
    <main className="min-h-screen bg-[#09090B] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Official Campus Radar
              </span>
            </div>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">University Feed & Hub</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Track hackathons, workshops, research opportunities, club broadcasts, and live student builds.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Left Drawer Trigger for Clubs & Departments */}
            <button
              onClick={() => setShowClubsDrawer(true)}
              className="flex items-center gap-2 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2.5 text-xs font-bold text-indigo-300 transition hover:bg-indigo-500/20 shadow-sm"
            >
              <span>🏛️</span>
              <span>Clubs & Departments</span>
            </button>

            {user ? (
              <button
                onClick={() => setShowPostModal(true)}
                className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-zinc-200 shadow-md"
              >
                + Post Student Update
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:bg-white/10"
              >
                Log in to Participate
              </Link>
            )}
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* 1. LEFT SIDE: Student Activity (4 Columns) */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="border-b border-white/10 pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
                    Student Activity
                  </h3>
                  <p className="text-[11px] text-zinc-500">Live builds, media & teammates</p>
                </div>
                <button
                  onClick={() => (user ? setShowPostModal(true) : alert("Please log in first"))}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                >
                  + Post
                </button>
              </div>

              {/* Student Filter Pills */}
              <div className="mt-3 flex flex-wrap gap-1">
                {["All", "#FindTeammates", "#Showcase", "#Algorithms"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setActiveStudentFilter(tag)}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold transition ${
                      activeStudentFilter === tag
                        ? tag === "#FindTeammates"
                          ? "bg-violet-600 text-white"
                          : "bg-white text-black"
                        : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
              {loadingPosts ? (
                <div className="py-12 text-center text-xs text-zinc-500">Loading student posts...</div>
              ) : filteredPosts.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 text-center text-xs text-zinc-400">
                  No activity found for {activeStudentFilter}. Post an update!
                </div>
              ) : (
                filteredPosts.map((post) => {
                  const score = (post.upvotes?.length || 0) - (post.downvotes?.length || 0);
                  const userUpvoted = user && post.upvotes?.includes(user.uid);
                  const userDownvoted = user && post.downvotes?.includes(user.uid);
                  const commentsOpen = expandedComments[post.id];
                  const isTeammatePost = post.tag === "#FindTeammates";

                  return (
                    <article
                      key={post.id}
                      className={`rounded-xl border p-4 transition ${
                        isTeammatePost
                          ? "border-violet-500/40 bg-violet-500/[0.03] hover:border-violet-500/60"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      {/* Author Header Clickable to LinkedIn-Style Profile */}
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/profile/${post.authorId}`}
                          className="flex items-center gap-2 group cursor-pointer"
                        >
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white group-hover:bg-indigo-600 transition">
                            {post.authorName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-white block leading-tight group-hover:text-indigo-400 transition">
                              {post.authorName}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                              <span>{post.authorRole}</span>
                              {post.location && (
                                <span className="text-indigo-400">📍 {post.location}</span>
                              )}
                            </div>
                          </div>
                        </Link>

                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-mono font-semibold ${
                            isTeammatePost
                              ? "bg-violet-500/20 text-violet-300 border border-violet-500/30"
                              : "border border-white/5 bg-white/5 text-zinc-400"
                          }`}
                        >
                          {post.tag}
                        </span>
                      </div>

                      {post.content && (
                        <div className="mt-2.5 whitespace-pre-wrap font-sans text-xs leading-relaxed text-zinc-300">
                          {post.content}
                        </div>
                      )}

                      {/* Multi-Photo Grid */}
                      {post.images && post.images.length > 0 && (
                        <div
                          className={`mt-3 grid gap-1.5 rounded-lg overflow-hidden ${
                            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
                          }`}
                        >
                          {post.images.map((img, i) => (
                            <img
                              key={i}
                              src={img}
                              alt="Post media"
                              className="h-44 w-full object-cover rounded-md"
                            />
                          ))}
                        </div>
                      )}

                      {/* Multi-Video Section */}
                      {post.videos && post.videos.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {post.videos.map((vid, i) => (
                            <video
                              key={i}
                              src={vid}
                              controls
                              className="w-full rounded-md border border-white/10 bg-black/60 max-h-56"
                            />
                          ))}
                        </div>
                      )}

                      {/* Audio Player */}
                      {post.audio && (
                        <div className="mt-3 rounded-lg border border-white/10 bg-black/40 p-2">
                          <span className="text-[10px] font-semibold text-zinc-400 block mb-1">
                            🎵 Attached Audio Note:
                          </span>
                          <audio src={post.audio} controls className="w-full h-8" />
                        </div>
                      )}

                      {/* Actions Row */}
                      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVote(post.id, "up")}
                            className={`rounded px-1.5 py-0.5 transition ${
                              userUpvoted ? "bg-indigo-500/20 text-indigo-400" : "text-zinc-500 hover:text-white"
                            }`}
                          >
                            ▲
                          </button>
                          <span
                            className={`font-mono text-xs font-bold ${
                              score > 0 ? "text-indigo-400" : score < 0 ? "text-red-400" : "text-zinc-400"
                            }`}
                          >
                            {score}
                          </span>
                          <button
                            onClick={() => handleVote(post.id, "down")}
                            className={`rounded px-1.5 py-0.5 transition ${
                              userDownvoted ? "bg-red-500/20 text-red-400" : "text-zinc-500 hover:text-white"
                            }`}
                          >
                            ▼
                          </button>
                        </div>

                        <button
                          onClick={() =>
                            setExpandedComments((prev) => ({
                              ...prev,
                              [post.id]: !prev[post.id],
                            }))
                          }
                          className="text-[11px] text-zinc-400 hover:text-white"
                        >
                          💬 {post.comments?.length || 0}
                        </button>
                      </div>

                      {/* Comments Drawer */}
                      {commentsOpen && (
                        <div className="mt-2.5 rounded-lg border border-white/10 bg-black/40 p-2.5">
                          <div className="space-y-2 max-h-36 overflow-y-auto">
                            {post.comments && post.comments.length > 0 ? (
                              post.comments.map((comm) => (
                                <div key={comm.id} className="border-l-2 border-indigo-500/40 pl-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[11px] font-bold text-zinc-300">{comm.authorName}</span>
                                    <span className="text-[9px] text-zinc-500">{comm.createdAt}</span>
                                  </div>
                                  <p className="mt-0.5 text-[11px] text-zinc-300">{comm.content}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-zinc-500">No replies yet.</p>
                            )}
                          </div>

                          <div className="mt-2 flex gap-1.5">
                            <input
                              type="text"
                              value={commentInputs[post.id] || ""}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({
                                  ...prev,
                                  [post.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleAddComment(post.id);
                              }}
                              placeholder="Reply..."
                              className="flex-1 rounded-md border border-white/10 bg-black/60 px-2 py-1 text-[11px] text-white outline-none focus:border-indigo-500"
                            />
                            <button
                              onClick={() => handleAddComment(post.id)}
                              className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/20"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })
              )}
            </div>
          </aside>

          {/* 2. CENTER: Main Campus Radar & Events Stream (8 Columns) */}
          <section className="lg:col-span-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Active Campus Radar
                </h2>
                <p className="text-xs text-zinc-400">
                  Participate, discuss, enquire directly with publishers, or sync deadlines straight to your calendar.
                </p>
              </div>

              {/* Tag Filter Pills */}
              <div className="flex flex-wrap gap-1.5">
                {["All", "Hackathon", "Workshop", "Competition", "Opportunities"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      activeCategory === cat
                        ? "bg-white text-black"
                        : "border border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Stream Cards */}
            <div className="space-y-5">
              {filteredItems.map((ev) => {
                const isLiked = likedEvents[ev.id];
                const isSaved = savedEvents[ev.id];
                const isNotified = notifiedEvents[ev.id];
                const comments = eventComments[ev.id] || [];
                const commentsOpen = eventCommentsOpen[ev.id];
                const isOpp = ev.category === "Opportunities";

                return (
                  <div
                    key={ev.id}
                    id={ev.id}
                    className={`group rounded-2xl border p-5 transition duration-200 ${
                      isOpp
                        ? "border-emerald-500/20 bg-emerald-500/[0.02] hover:border-emerald-500/50"
                        : "border-white/10 bg-white/[0.02] hover:border-indigo-500/40 hover:bg-white/[0.03]"
                    }`}
                  >
                    {/* Top Publisher Info Bar */}
                    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-[10px] font-bold text-white">
                          🏛️
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          {ev.clubId ? (
                            <Link
                              href={`/clubs/${ev.clubId}`}
                              className="font-semibold text-zinc-200 hover:text-indigo-400 transition underline decoration-transparent hover:decoration-indigo-400"
                            >
                              {ev.publisherName} ↗
                            </Link>
                          ) : (
                            <span className="font-semibold text-zinc-300">{ev.publisherName}</span>
                          )}
                          <span className="text-zinc-500">•</span>
                          <a
                            href={getMailToUrl(ev.publisherEmail, ev.title, ev.id)}
                            className="font-mono text-[11px] text-indigo-400 underline decoration-indigo-400/40 hover:text-indigo-300 hover:decoration-indigo-300 transition"
                            title="Click to write enquiry email"
                          >
                            {ev.publisherEmail}
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {ev.clubId && (
                          <Link
                            href={`/clubs/${ev.clubId}`}
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition"
                          >
                            View Club Page
                          </Link>
                        )}
                        <a
                          href={getMailToUrl(ev.publisherEmail, ev.title, ev.id)}
                          className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[11px] font-medium text-indigo-300 hover:bg-indigo-500/20 transition"
                        >
                          ✉ Enquire via Email
                        </a>
                      </div>
                    </div>

                    {/* Top Meta Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                            isOpp
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                          }`}
                        >
                          {ev.category}
                        </span>
                        <span className="font-mono text-xs text-zinc-400">📅 {ev.date}</span>
                      </div>

                      {/* Save, Notify & Calendar Actions */}
                      <div className="flex items-center gap-2">
                        <a
                          href={getGoogleCalendarUrl(ev)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-emerald-500/40 hover:text-emerald-300"
                          title="Add event directly to Google Calendar"
                        >
                          📅 Add to Cal
                        </a>

                        <button
                          onClick={() => toggleEventNotify(ev.id)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                            isNotified
                              ? "border-amber-500/40 bg-amber-500/20 text-amber-300"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                          title="Notify Me / Reminder"
                        >
                          {isNotified ? "🔔 Notified" : "🔔 Notify"}
                        </button>

                        <button
                          onClick={() => toggleEventSave(ev.id)}
                          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                            isSaved
                              ? "border-indigo-500/40 bg-indigo-500/20 text-indigo-300"
                              : "border-white/10 bg-white/5 text-zinc-400 hover:text-white"
                          }`}
                          title="Bookmark / Save"
                        >
                          {isSaved ? "★ Saved" : "☆ Save"}
                        </button>
                      </div>
                    </div>

                    <h3
                      className={`mt-3 text-xl font-bold text-white transition ${
                        isOpp ? "group-hover:text-emerald-300" : "group-hover:text-indigo-300"
                      }`}
                    >
                      {ev.title}
                    </h3>

                    <p className="mt-2 text-xs leading-relaxed text-zinc-300">
                      {ev.summary}
                    </p>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {ev.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="rounded-md border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>

                    {/* Venue & Action Button */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-xs">
                      <div className="flex items-center gap-3 text-zinc-400">
                        <span>📍 {ev.venue}</span>
                        {ev.prizePool && (
                          <span className="font-semibold text-emerald-400">
                            {isOpp ? "💰 Stipend: " : "🏆 Prize: "}
                            {ev.prizePool}
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => setActiveModalEvent(ev)}
                        className={`rounded-xl px-4 py-2 font-semibold text-white transition shadow-sm ${
                          isOpp
                            ? "bg-emerald-600 hover:bg-emerald-500"
                            : "bg-indigo-600 hover:bg-indigo-500"
                        }`}
                      >
                        {isOpp ? "View Details & Apply ↗" : "View Details & Register ↗"}
                      </button>
                    </div>

                    {/* Interactive Social Actions: Like, Comment, Share */}
                    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2.5 text-xs text-zinc-400">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => toggleEventLike(ev.id)}
                          className={`flex items-center gap-1.5 font-medium transition ${
                            isLiked ? "text-pink-400" : "hover:text-white"
                          }`}
                        >
                          <span>{isLiked ? "❤️" : "🤍"}</span>
                          <span>{eventLikes[ev.id] || 0} Likes</span>
                        </button>

                        <button
                          onClick={() =>
                            setEventCommentsOpen((prev) => ({
                              ...prev,
                              [ev.id]: !prev[ev.id],
                            }))
                          }
                          className="flex items-center gap-1.5 font-medium hover:text-white transition"
                        >
                          <span>💬</span>
                          <span>{comments.length} Comments</span>
                        </button>
                      </div>

                      <button
                        onClick={() => handleShareEvent(ev)}
                        className="flex items-center gap-1 hover:text-white transition"
                      >
                        <span>↗</span> Share
                      </button>
                    </div>

                    {/* Comments Drawer */}
                    {commentsOpen && (
                      <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3">
                        <div className="space-y-2.5 max-h-44 overflow-y-auto">
                          {comments.length > 0 ? (
                            comments.map((comm) => (
                              <div key={comm.id} className="border-l-2 border-indigo-500/40 pl-2.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-semibold text-zinc-200">{comm.authorName}</span>
                                  <span className="text-[10px] text-zinc-500">{comm.createdAt}</span>
                                </div>
                                <p className="mt-0.5 text-xs text-zinc-300">{comm.content}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-zinc-500">
                              No discussion yet. Ask questions or connect with peers!
                            </p>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <input
                            type="text"
                            value={eventCommentInputs[ev.id] || ""}
                            onChange={(e) =>
                              setEventCommentInputs((prev) => ({
                                ...prev,
                                [ev.id]: e.target.value,
                              }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleAddEventComment(ev.id);
                            }}
                            placeholder="Join the discussion or find teammates..."
                            className="flex-1 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                          />
                          <button
                            onClick={() => handleAddEventComment(ev.id)}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                          >
                            Comment
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* LEFT FLYOUT DRAWER: UNIVERSITY CLUBS & DEPARTMENT DIRECTORY */}
        {showClubsDrawer && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              onClick={() => setShowClubsDrawer(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            />

            {/* Left Sliding Panel */}
            <div className="relative w-full max-w-md bg-zinc-950 border-r border-white/10 p-6 flex flex-col shadow-2xl overflow-hidden z-10">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏛️</span>
                  <div>
                    <h2 className="text-base font-bold text-white">Campus Guilds & Depts</h2>
                    <p className="text-[11px] text-zinc-400">Official university clubs & departments</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClubsDrawer(false)}
                  className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-zinc-400 hover:text-white"
                >
                  ✕ Close
                </button>
              </div>

              {/* Tab Selector */}
              <div className="mt-4 flex gap-1 border-b border-white/10 pb-3">
                {(["All", "Centralized", "Departmental"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setClubsTab(t)}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                      clubsTab === t
                        ? "bg-white text-black"
                        : "bg-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Clubs List with Clickable Headers and Direct Navigation */}
              <div className="mt-4 flex-1 overflow-y-auto space-y-3 pr-1">
                {filteredClubs.map((club) => (
                  <div
                    key={club.id}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:border-indigo-500/50 hover:bg-white/[0.04] transition group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Entire title is a clickable link to the club page */}
                      <Link
                        href={`/clubs/${club.id}`}
                        onClick={() => setShowClubsDrawer(false)}
                        className="text-sm font-bold text-white group-hover:text-indigo-300 transition hover:underline"
                      >
                        {club.name} ↗
                      </Link>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${
                          club.type === "Centralized"
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        }`}
                      >
                        {club.type}
                      </span>
                    </div>

                    {club.department && (
                      <div className="mt-1 text-[11px] font-medium text-indigo-400">
                        📁 {club.department}
                      </div>
                    )}

                    <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                      {club.tagline}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-500 border-t border-white/5 pt-2.5">
                      <span>👥 {club.membersCount} Members</span>
                      <span>Lead: {club.leadName}</span>
                    </div>

                    {/* Actions: View Club Page or Email */}
                    <div className="mt-3 flex items-center gap-2">
                      <Link
                        href={`/clubs/${club.id}`}
                        onClick={() => setShowClubsDrawer(false)}
                        className="flex-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 py-1.5 text-center text-xs font-bold text-indigo-300 hover:bg-indigo-600 hover:text-white transition"
                      >
                        View Club Page ↗
                      </Link>
                      <a
                        href={getMailToUrl(club.email, club.name)}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white"
                        title="Click to write enquiry email"
                      >
                        ✉ Mail
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal: Full Item Details & Direct Link Popup */}
        {activeModalEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span
                  className={`rounded-full border px-3 py-0.5 text-xs font-bold ${
                    activeModalEvent.category === "Opportunities"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                  }`}
                >
                  {activeModalEvent.category}
                </span>
                <button
                  onClick={() => setActiveModalEvent(null)}
                  className="text-sm font-bold text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {/* Publisher in Modal with Clickable Email and Club Link */}
              <div className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] text-zinc-400">Published by:</div>
                  <div className="text-xs font-bold text-white">{activeModalEvent.publisherName}</div>
                  <a
                    href={getMailToUrl(activeModalEvent.publisherEmail, activeModalEvent.title, activeModalEvent.id)}
                    className="text-[11px] font-mono text-indigo-400 underline decoration-indigo-400/40 hover:text-indigo-300"
                    title="Click to write enquiry email"
                  >
                    ✉ {activeModalEvent.publisherEmail}
                  </a>
                </div>
                
                <div className="flex gap-2">
                  {activeModalEvent.clubId && (
                    <Link
                      href={`/clubs/${activeModalEvent.clubId}`}
                      className="rounded bg-indigo-600/30 border border-indigo-500/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-600/50"
                    >
                      Club Page ↗
                    </Link>
                  )}
                  <a
                    href={getMailToUrl(activeModalEvent.publisherEmail, activeModalEvent.title, activeModalEvent.id)}
                    className="rounded bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-white/20"
                  >
                    ✉ Email
                  </a>
                </div>
              </div>

              <h2 className="mt-4 text-xl font-bold text-white">{activeModalEvent.title}</h2>

              <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold">Date / Timeline</span>
                  <div className="mt-1 font-medium text-zinc-200">{activeModalEvent.date}</div>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                  <span className="text-zinc-500 uppercase tracking-wider font-semibold">Location / Lab</span>
                  <div className="mt-1 font-medium text-zinc-200">{activeModalEvent.venue}</div>
                </div>
                {activeModalEvent.deadline && (
                  <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                    <span className="text-zinc-500 uppercase tracking-wider font-semibold">Deadline</span>
                    <div className="mt-1 font-medium text-amber-400">{activeModalEvent.deadline}</div>
                  </div>
                )}
                {activeModalEvent.prizePool && (
                  <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                    <span className="text-zinc-500 uppercase tracking-wider font-semibold">
                      {activeModalEvent.category === "Opportunities" ? "Stipend" : "Prize Pool"}
                    </span>
                    <div className="mt-1 font-medium text-emerald-400">{activeModalEvent.prizePool}</div>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Description</h4>
                <p className="mt-1 text-xs leading-relaxed text-zinc-300">{activeModalEvent.summary}</p>
              </div>

              <div className="mt-6 flex gap-3">
                <a
                  href={getGoogleCalendarUrl(activeModalEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-semibold text-zinc-300 hover:bg-white/10"
                >
                  📅 Sync Calendar
                </a>
                <button
                  onClick={() => setActiveModalEvent(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10"
                >
                  Close
                </button>
                <a
                  href={activeModalEvent.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex-1 rounded-xl py-2.5 text-center text-xs font-bold text-white transition ${
                    activeModalEvent.category === "Opportunities"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-indigo-600 hover:bg-indigo-500"
                  }`}
                >
                  {activeModalEvent.category === "Opportunities"
                    ? "Open Application ↗"
                    : "Official Registration ↗"}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Publish Student Update */}
        {showPostModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <h3 className="text-base font-bold">Post Campus Update (Rich Media)</h3>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="text-sm font-bold text-zinc-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Category Tag
                    </label>
                    <select
                      value={selectedTag}
                      onChange={(e) => setSelectedTag(e.target.value)}
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none"
                    >
                      <option value="#FindTeammates">#FindTeammates (Looking for partners)</option>
                      <option value="#Showcase">#Showcase (Demo your project)</option>
                      <option value="#Algorithms">#Algorithms (Code challenge)</option>
                      <option value="#Opportunities">#Opportunities (Referrals/Grants)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Tag Location
                    </label>
                    <input
                      type="text"
                      value={locationTag}
                      onChange={(e) => setLocationTag(e.target.value)}
                      placeholder="e.g. MRU CSE Lab 4, Aud 1"
                      className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Message
                  </label>
                  <textarea
                    rows={3}
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="Share what skills you need for your hackathon team, or showcase what you just built..."
                    className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Multi-Media Upload Controls */}
                <div className="rounded-xl border border-white/10 bg-black/30 p-3.5 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Attach Media & Audio
                  </span>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      📷 Add Photos ({images.length} selected)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="mt-1 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      🎥 Add Videos ({videos.length} selected)
                    </label>
                    <input
                      type="file"
                      accept="video/*"
                      multiple
                      onChange={handleVideoUpload}
                      className="mt-1 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-300">
                      🎙️ Attach Audio Note {audio ? "(Attached)" : ""}
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      className="mt-1 block w-full text-xs text-zinc-400 file:mr-2 file:rounded-lg file:border-0 file:bg-white/10 file:px-2.5 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-white/20"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPostModal(false)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={posting}
                    className="flex-1 rounded-xl bg-white py-2.5 text-xs font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                  >
                    {posting ? "Publishing..." : "Publish Post"}
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