"use client";

import { useEffect, useState, useRef, ChangeEvent } from "react";
import Navbar from "@/components/Navbar";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
  orderBy,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged, User } from "firebase/auth";
import { db, auth } from "../../lib/firebase";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail?: string;
  text: string;
  file?: { name: string; url: string; size?: string };
  images?: string[];
  video?: string;
  audio?: string;
  poll?: {
    question: string;
    options: { text: string; votes: string[] }[];
  };
  eventShare?: {
    title: string;
    date: string;
    time: string;
    location: string;
  };
  createdAt: any;
}

interface ChatRoom {
  id: string;
  participants: string[]; // Stores both UIDs and emails to allow seamless discovery
  participantNames: Record<string, string>;
  participantEmails?: Record<string, string>;
  status: "pending" | "accepted" | "declined";
  requestedBy: string;
  initialMessage: string;
  lastMessage?: string;
  updatedAt?: any;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");

  // New Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [introText, setIntroText] = useState("");
  const [requestSending, setRequestSending] = useState(false);

  // Attachment Menu & Modal States
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOpt1, setPollOpt1] = useState("");
  const [pollOpt2, setPollOpt2] = useState("");

  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");

  // Media Payloads
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [attachedVideo, setAttachedVideo] = useState<string | null>(null);
  const [attachedAudio, setAttachedAudio] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  // Listen to Chat Rooms where current user is in participants (matches both UID and email)
  useEffect(() => {
    if (!user) return;

    const userEmail = user.email?.trim().toLowerCase();
    const q = query(
      collection(db, "chatRooms"),
      where("participants", "array-contains-any", [user.uid, userEmail].filter(Boolean))
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const rooms: ChatRoom[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as ChatRoom[];

      setChatRooms(rooms);

      // Keep active room in sync
      if (activeRoom) {
        const currentUpdated = rooms.find((r) => r.id === activeRoom.id);
        if (currentUpdated) setActiveRoom(currentUpdated);
      }
    });

    return () => unsub();
  }, [user, activeRoom?.id]);

  // Listen to messages for the active room
  useEffect(() => {
    if (!activeRoom) return;

    const q = query(
      collection(db, `chatRooms/${activeRoom.id}/messages`),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Message[];
      setMessages(msgs);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });

    return () => unsub();
  }, [activeRoom?.id]);

  // Initiate Chat Request (Stored with both UID and Email for bi-directional lookup)
  const handleSendChatRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !recipientEmail.trim() || !introText.trim()) return;
    setRequestSending(true);

    const normalizedRecipient = recipientEmail.trim().toLowerCase();
    const myEmail = (user.email || "").toLowerCase();

    try {
      const roomRef = await addDoc(collection(db, "chatRooms"), {
        participants: [user.uid, myEmail, normalizedRecipient],
        participantNames: {
          [user.uid]: user.displayName || myEmail.split("@")[0] || "User",
          [myEmail]: user.displayName || myEmail.split("@")[0] || "User",
          [normalizedRecipient]: normalizedRecipient.split("@")[0],
        },
        participantEmails: {
          [user.uid]: myEmail,
          [normalizedRecipient]: normalizedRecipient,
        },
        status: "pending",
        requestedBy: user.uid,
        initialMessage: introText.trim(),
        lastMessage: introText.trim(),
        updatedAt: serverTimestamp(),
      });

      // Send the initial message
      await addDoc(collection(db, `chatRooms/${roomRef.id}/messages`), {
        senderId: user.uid,
        senderName: user.displayName || myEmail.split("@")[0] || "User",
        senderEmail: myEmail,
        text: introText.trim(),
        createdAt: serverTimestamp(),
      });

      setRecipientEmail("");
      setIntroText("");
      setShowRequestModal(false);
      alert("Chat request sent successfully!");
    } catch (err) {
      console.error("Error creating chat request:", err);
      alert("Could not send chat request.");
    } finally {
      setRequestSending(false);
    }
  };

  // Accept or Decline Request
  const handleUpdateStatus = async (roomId: string, newStatus: "accepted" | "declined") => {
    try {
      await updateDoc(doc(db, "chatRooms", roomId), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      if (activeRoom && activeRoom.id === roomId) {
        setActiveRoom((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  // Send Unlocked Message
  const handleSendMessage = async () => {
    if (!user || !activeRoom) return;
    if (activeRoom.status !== "accepted") {
      alert("Cannot send messages until this connection is accepted.");
      return;
    }

    if (
      !textInput.trim() &&
      uploadedImages.length === 0 &&
      !attachedAudio &&
      !attachedVideo &&
      !attachedFile
    )
      return;

    try {
      const payload: any = {
        senderId: user.uid,
        senderName: user.displayName || user.email?.split("@")[0] || "User",
        senderEmail: user.email || "",
        text: textInput.trim(),
        createdAt: serverTimestamp(),
      };

      if (uploadedImages.length > 0) payload.images = uploadedImages;
      if (attachedAudio) payload.audio = attachedAudio;
      if (attachedVideo) payload.video = attachedVideo;
      if (attachedFile) payload.file = attachedFile;

      await addDoc(collection(db, `chatRooms/${activeRoom.id}/messages`), payload);

      let preview = textInput.trim();
      if (!preview) {
        if (uploadedImages.length > 0) preview = "📷 Photo";
        else if (attachedVideo) preview = "🎥 Video";
        else if (attachedAudio) preview = "🎙️ Voice Note";
        else if (attachedFile) preview = `📎 ${attachedFile.name}`;
      }

      await updateDoc(doc(db, "chatRooms", activeRoom.id), {
        lastMessage: preview,
        updatedAt: serverTimestamp(),
      });

      setTextInput("");
      setUploadedImages([]);
      setAttachedAudio(null);
      setAttachedVideo(null);
      setAttachedFile(null);
      setShowAttachmentMenu(false);
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  // Create Poll Action
  const handleCreatePoll = async () => {
    if (!user || !activeRoom || !pollQuestion.trim() || !pollOpt1.trim() || !pollOpt2.trim()) return;

    await addDoc(collection(db, `chatRooms/${activeRoom.id}/messages`), {
      senderId: user.uid,
      senderName: user.displayName || user.email?.split("@")[0] || "User",
      senderEmail: user.email || "",
      text: `📊 Poll: ${pollQuestion.trim()}`,
      poll: {
        question: pollQuestion.trim(),
        options: [
          { text: pollOpt1.trim(), votes: [] },
          { text: pollOpt2.trim(), votes: [] },
        ],
      },
      createdAt: serverTimestamp(),
    });

    setPollQuestion("");
    setPollOpt1("");
    setPollOpt2("");
    setShowPollModal(false);
    setShowAttachmentMenu(false);
  };

  // Vote on Poll Action
  const handleVotePoll = async (msgId: string, optIndex: number) => {
    if (!user || !activeRoom) return;

    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg || !targetMsg.poll) return;

    const updatedOptions = targetMsg.poll.options.map((opt, idx) => {
      const filteredVotes = opt.votes.filter((v) => v !== user.uid);
      if (idx === optIndex) {
        return { ...opt, votes: [...filteredVotes, user.uid] };
      }
      return { ...opt, votes: filteredVotes };
    });

    await updateDoc(doc(db, `chatRooms/${activeRoom.id}/messages`, msgId), {
      "poll.options": updatedOptions,
    });
  };

  // Create Event Action
  const handleCreateEvent = async () => {
    if (!user || !activeRoom || !eventTitle.trim() || !eventDate.trim()) return;

    await addDoc(collection(db, `chatRooms/${activeRoom.id}/messages`), {
      senderId: user.uid,
      senderName: user.displayName || user.email?.split("@")[0] || "User",
      senderEmail: user.email || "",
      text: `📅 Event Invitation: ${eventTitle.trim()}`,
      eventShare: {
        title: eventTitle.trim(),
        date: eventDate,
        time: eventTime || "10:00 AM",
        location: eventLocation || "Campus Innovation Hub",
      },
      createdAt: serverTimestamp(),
    });

    setEventTitle("");
    setEventDate("");
    setEventTime("");
    setEventLocation("");
    setShowEventModal(false);
    setShowAttachmentMenu(false);
  };

  // Media pickers with local data-URL encodings
  const handleImagePick = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setUploadedImages((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleVideoPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAttachedVideo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAudioPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAttachedAudio(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFilePick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setAttachedFile({ name: file.name, url: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  // Helper to extract the other participant's profile identity
  const getRecipientInfo = (room: ChatRoom) => {
    const myId = user?.uid;
    const myEmail = user?.email?.toLowerCase();

    // Find any key that is not my UID and not my email
    const otherKey =
      room.participants.find((p) => p !== myId && p !== myEmail) || "Teammate";

    const name = room.participantNames?.[otherKey] || otherKey.split("@")[0];
    const email =
      room.participantEmails?.[otherKey] ||
      (otherKey.includes("@") ? otherKey : `${otherKey}@vridhi.dev`);

    return { name, email, initial: (name[0] || "U").toUpperCase() };
  };

  return (
    <main className="h-screen flex flex-col bg-[#09090B] text-white overflow-hidden">
      <Navbar />

      <div className="flex-1 flex overflow-hidden border-t border-white/10">
        {/* LEFT COLUMN: Rooms & Chat Requests List */}
        <aside className="w-80 border-r border-white/10 flex flex-col bg-black/40">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">Teammate Chats</h2>
              <span className="text-[10px] text-zinc-500 font-mono">
                {chatRooms.length} Connections
              </span>
            </div>
            <button
              onClick={() => setShowRequestModal(true)}
              className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-indigo-500 shadow-sm"
            >
              + New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-white/5">
            {chatRooms.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500 leading-relaxed">
                No active conversations or pending requests. Click "+ New Chat" to start a direct connection.
              </div>
            ) : (
              chatRooms.map((room) => {
                const isSelected = activeRoom?.id === room.id;
                const { name, email, initial } = getRecipientInfo(room);

                return (
                  <div
                    key={room.id}
                    onClick={() => setActiveRoom(room)}
                    className={`p-3.5 cursor-pointer transition flex items-center gap-3 ${
                      isSelected ? "bg-white/10" : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-sm shrink-0 shadow">
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold truncate">{name}</span>
                        <span
                          className={`text-[9px] font-bold uppercase rounded px-1.5 py-0.5 ${
                            room.status === "accepted"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : room.status === "pending"
                              ? "bg-amber-500/20 text-amber-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {room.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-indigo-400 font-mono block truncate">
                        {email}
                      </span>
                      <p className="text-xs text-zinc-400 truncate mt-0.5">
                        {room.lastMessage || "No messages yet"}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: Active Chat Panel */}
        <section className="flex-1 flex flex-col bg-[#09090B]">
          {activeRoom ? (
            <>
              {/* TOP HEADER BAR: Profile Details of Who You Are Viewing */}
              {(() => {
                const recipient = getRecipientInfo(activeRoom);
                return (
                  <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-black/40">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow">
                        {recipient.initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {recipient.name}
                          </h3>
                          <span className="flex h-2 w-2 rounded-full bg-emerald-400" title="Online" />
                        </div>
                        {/* Target User's Mail Displayed Directly Underneath */}
                        <span className="text-xs text-indigo-400 font-mono block">
                          {recipient.email}
                        </span>
                      </div>
                    </div>

                    {/* Accept / Decline Action Controls if user received request */}
                    {activeRoom.status === "pending" && activeRoom.requestedBy !== user?.uid && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateStatus(activeRoom.id, "accepted")}
                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition shadow-sm"
                        >
                          Accept Chat
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(activeRoom.id, "declined")}
                          className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Status Warning Banner */}
              {activeRoom.status === "pending" && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-300 flex items-center justify-between">
                  <span>
                    🔒 <strong>Chat Request Pending:</strong> Media sharing, files, audio notes, polls, and events unlock once this connection is accepted.
                  </span>
                </div>
              )}

              {/* Messages Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((m) => {
                  const isMe = m.senderId === user?.uid;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-zinc-400">
                          {isMe ? "You" : m.senderName}
                        </span>
                        {m.senderEmail && (
                          <span className="text-[10px] text-zinc-600 font-mono">
                            ({m.senderEmail})
                          </span>
                        )}
                      </div>

                      <div
                        className={`max-w-md rounded-2xl p-3.5 text-xs leading-relaxed shadow-sm ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-br-none"
                            : "bg-white/10 text-zinc-200 rounded-bl-none"
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{m.text}</div>

                        {/* File Attachment */}
                        {m.file && (
                          <div className="mt-2.5 flex items-center gap-2.5 p-2 rounded-xl bg-black/40 border border-white/10">
                            <span className="text-base">📄</span>
                            <span className="font-mono text-[11px] truncate flex-1">
                              {m.file.name}
                            </span>
                            <a
                              href={m.file.url}
                              download={m.file.name}
                              className="text-[10px] text-indigo-400 underline font-bold"
                            >
                              Download
                            </a>
                          </div>
                        )}

                        {/* Photos */}
                        {m.images && m.images.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-1 rounded overflow-hidden">
                            {m.images.map((img, idx) => (
                              <img
                                key={idx}
                                src={img}
                                alt="Shared image"
                                className="h-28 w-full object-cover rounded"
                              />
                            ))}
                          </div>
                        )}

                        {/* Video */}
                        {m.video && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-white/10">
                            <video src={m.video} controls className="max-h-60 w-full" />
                          </div>
                        )}

                        {/* Audio Voice Note */}
                        {m.audio && (
                          <div className="mt-2">
                            <audio src={m.audio} controls className="w-full h-8" />
                          </div>
                        )}

                        {/* Interactive Poll */}
                        {m.poll && (
                          <div className="mt-2.5 rounded-xl border border-white/10 bg-black/40 p-3 space-y-2">
                            <span className="font-bold block text-white">{m.poll.question}</span>
                            <div className="space-y-1.5">
                              {m.poll.options.map((opt, idx) => {
                                const hasVoted = user && opt.votes?.includes(user.uid);
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleVotePoll(m.id, idx)}
                                    className={`w-full text-left rounded-lg p-2 text-xs flex items-center justify-between transition ${
                                      hasVoted
                                        ? "bg-indigo-600/40 border border-indigo-500 text-white font-semibold"
                                        : "bg-white/5 hover:bg-white/10 text-zinc-300"
                                    }`}
                                  >
                                    <span>{opt.text}</span>
                                    <span className="font-mono text-[11px] font-bold text-indigo-400">
                                      {opt.votes?.length || 0} votes
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Event Invitation */}
                        {m.eventShare && (
                          <div className="mt-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/40 p-3 space-y-1.5">
                            <div className="flex items-center gap-2 text-indigo-300 font-bold">
                              <span>📅</span>
                              <span>{m.eventShare.title}</span>
                            </div>
                            <div className="text-[11px] text-zinc-300 font-mono">
                              Date: {m.eventShare.date} at {m.eventShare.time}
                            </div>
                            <div className="text-[11px] text-zinc-400">
                              Location: {m.eventShare.location}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Hidden File System Pickers */}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFilePick}
              />
              <input
                type="file"
                accept="image/*"
                multiple
                ref={imageInputRef}
                className="hidden"
                onChange={handleImagePick}
              />
              <input
                type="file"
                accept="video/*"
                ref={videoInputRef}
                className="hidden"
                onChange={handleVideoPick}
              />
              <input
                type="file"
                accept="audio/*"
                ref={audioInputRef}
                className="hidden"
                onChange={handleAudioPick}
              />

              {/* ATTACHMENT DRAWER (Files, Images, Videos, Audio, Poll, Event) */}
              {showAttachmentMenu && activeRoom.status === "accepted" && (
                <div className="p-3 bg-zinc-900 border-t border-white/10 grid grid-cols-3 sm:grid-cols-6 gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1 text-xs transition"
                  >
                    <span className="text-lg">📄</span>
                    <span className="text-[10px]">Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1 text-xs transition"
                  >
                    <span className="text-lg">🖼️</span>
                    <span className="text-[10px]">Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1 text-xs transition"
                  >
                    <span className="text-lg">🎥</span>
                    <span className="text-[10px]">Video</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => audioInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1 text-xs transition"
                  >
                    <span className="text-lg">🎙️</span>
                    <span className="text-[10px]">Voice Note</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPollModal(true)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1 text-xs transition"
                  >
                    <span className="text-lg">📊</span>
                    <span className="text-[10px]">Create Poll</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEventModal(true)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 flex flex-col items-center gap-1 text-xs transition"
                  >
                    <span className="text-lg">📅</span>
                    <span className="text-[10px]">Campus Event</span>
                  </button>
                </div>
              )}

              {/* Message Composer Bar */}
              {activeRoom.status === "accepted" ? (
                <div className="border-t border-white/10 bg-black/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Attachment Tray Button */}
                    <button
                      type="button"
                      onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                      className={`rounded-xl px-3 py-2 text-xs font-semibold transition flex items-center gap-1.5 ${
                        showAttachmentMenu
                          ? "bg-indigo-600 text-white"
                          : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
                      }`}
                    >
                      <span>+</span>
                      <span>Attach Media</span>
                    </button>

                    {/* Pre-upload badge notices */}
                    {attachedFile && (
                      <span className="rounded-md bg-indigo-500/20 text-indigo-300 px-2 py-1 text-[11px] font-mono">
                        📎 {attachedFile.name}
                      </span>
                    )}
                    {uploadedImages.length > 0 && (
                      <span className="rounded-md bg-emerald-500/20 text-emerald-300 px-2 py-1 text-[11px] font-mono">
                        📷 {uploadedImages.length} photo(s) queued
                      </span>
                    )}
                    {attachedVideo && (
                      <span className="rounded-md bg-purple-500/20 text-purple-300 px-2 py-1 text-[11px] font-mono">
                        🎥 Video attached
                      </span>
                    )}
                    {attachedAudio && (
                      <span className="rounded-md bg-amber-500/20 text-amber-300 px-2 py-1 text-[11px] font-mono">
                        🎙️ Voice note queued
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                      placeholder="Type a message or paste a project link..."
                      className="flex-1 rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-xs text-white outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      className="rounded-xl bg-white px-5 py-2 text-xs font-bold text-black hover:bg-zinc-200 transition"
                    >
                      Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-white/10 bg-black/30 p-4 text-center text-xs text-zinc-500">
                  {activeRoom.requestedBy === user?.uid
                    ? "Waiting for the recipient to accept your chat request."
                    : "Accept this chat request above to enable full messaging, audio, files, and tools."}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-xl mb-3">
                💬
              </div>
              <h4 className="text-sm font-semibold text-zinc-300">Select a Conversation</h4>
              <p className="mt-1 text-xs max-w-sm text-zinc-500 leading-relaxed">
                Connect with campus peers, share code repositories, coordinate hackathon squads, or launch polls.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* MODAL 1: Send Initial Chat Request (Single Message Constraint) */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Send Teammate Chat Request</h3>
            <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
              To prevent unsolicited inbox spam, you can send <strong>one introductory message</strong>. Full messaging and media sharing unlock once accepted.
            </p>

            <form onSubmit={handleSendChatRequest} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Developer University Email *
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. classmate@gmail.com"
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  Introductory Message *
                </label>
                <textarea
                  rows={3}
                  required
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                  placeholder="Introduce yourself, your tech stack, and what project/hackathon you want to collaborate on..."
                  className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 p-3 text-xs text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={requestSending}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {requestSending ? "Sending..." : "Send Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Poll */}
      {showPollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span> Create Campus Poll
            </h4>
            <div className="mt-3 space-y-3">
              <input
                type="text"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
                placeholder="Question (e.g., Which track should we pick?)"
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={pollOpt1}
                onChange={(e) => setPollOpt1(e.target.value)}
                placeholder="Option 1 (e.g., AI/Agents Track)"
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={pollOpt2}
                onChange={(e) => setPollOpt2(e.target.value)}
                placeholder="Option 2 (e.g., Cloud Systems Track)"
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowPollModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-1.5 text-xs font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreatePoll}
                  className="flex-1 rounded-xl bg-indigo-600 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 transition"
                >
                  Post Poll
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Schedule Event */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📅</span> Schedule Event / Team Sync
            </h3>
            <div className="mt-4 space-y-3 text-xs">
              <input
                type="text"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Event Title (e.g., Hackathon Architecture Review)"
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none"
                />
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none"
                />
              </div>
              <input
                type="text"
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                placeholder="Location (e.g., Lab 4 or Google Meet link)"
                className="w-full rounded-xl border border-white/10 bg-black/40 p-2.5 text-xs text-white outline-none focus:border-indigo-500"
              />
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 font-semibold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateEvent}
                  className="flex-1 rounded-xl bg-indigo-600 py-2 font-bold text-white hover:bg-indigo-500 transition"
                >
                  Send Invitation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}