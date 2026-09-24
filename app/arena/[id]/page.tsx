"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import Navbar from "@/components/Navbar";
import { auth, db } from "../../../lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

interface TestCase {
  nums: number[];
  target: number;
  expected: number[];
}

const SAMPLE_PROBLEMS: Record<
  string,
  {
    title: string;
    difficulty: string;
    prompt: string;
    starterCode: string;
    testCases: TestCase[];
  }
> = {
  "1": {
    title: "Two Sum",
    difficulty: "Easy",
    prompt: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]`,
    starterCode: `function twoSum(nums, target) {
  // Write your solution below:
  
}`,
    testCases: [
      { nums: [2, 7, 11, 15], target: 9, expected: [0, 1] },
      { nums: [3, 2, 4], target: 6, expected: [1, 2] },
      { nums: [3, 3], target: 6, expected: [0, 1] },
    ],
  },
};

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "1";

  const problem = SAMPLE_PROBLEMS[id] || SAMPLE_PROBLEMS["1"];

  const [code, setCode] = useState(problem.starterCode);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasPassed, setHasPassed] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const handleRunCode = () => {
    setIsRunning(true);
    setHasPassed(false);
    setConsoleOutput("Compiling and executing test cases...\n");

    try {
      // Evaluate user's function code
      const runUserCode = new Function(`${code}\n return twoSum;`)();

      if (typeof runUserCode !== "function") {
        setConsoleOutput("Error: 'twoSum' function is not defined or invalid.");
        setIsRunning(false);
        return;
      }

      let allPassed = true;
      let logs = "";

      for (let i = 0; i < problem.testCases.length; i++) {
        const tc = problem.testCases[i];
        const startTime = performance.now();
        const result = runUserCode(tc.nums, tc.target);
        const duration = (performance.now() - startTime).toFixed(2);

        // Normalize and compare output
        const isMatch =
          Array.isArray(result) &&
          result.length === tc.expected.length &&
          result.slice().sort().every((val, idx) => val === tc.expected.slice().sort()[idx]);

        if (isMatch) {
          logs += `✓ Test Case ${i + 1} Passed (${duration}ms)\n   Input: nums = [${tc.nums.join(", ")}], target = ${tc.target}\n   Output: [${result ? result.join(", ") : ""}]\n\n`;
        } else {
          allPassed = false;
          logs += `✗ Test Case ${i + 1} Failed\n   Input: nums = [${tc.nums.join(", ")}], target = ${tc.target}\n   Expected: [${tc.expected.join(", ")}]\n   Received: ${JSON.stringify(result)}\n\n`;
          break; // Stop at first failed test
        }
      }

      if (allPassed) {
        logs += `===============================\nSTATUS: ACCEPTED\nAll ${problem.testCases.length} test cases passed.`;
        setHasPassed(true);
      } else {
        logs += `===============================\nSTATUS: WRONG ANSWER\nFix your solution and try again.`;
        setHasPassed(false);
      }

      setConsoleOutput(logs);
    } catch (err: any) {
      setConsoleOutput(`Runtime Error:\n${err?.message || err}`);
      setHasPassed(false);
    } finally {
      setIsRunning(false);
    }
  };

  const handlePublishToFeed = async () => {
    const user = auth.currentUser;
    if (!user) {
      alert("Please log in to publish your solution.");
      return;
    }

    setPublishing(true);
    try {
      await addDoc(collection(db, "posts"), {
        content: `⚡ Solved: ${problem.title} (${problem.difficulty})\nProof of Skill Verified | Status: Accepted\n\n\`\`\`javascript\n${code}\n\`\`\``,
        authorId: user.uid,
        authorName: user.displayName || user.email?.split("@")[0] || "Anonymous Dev",
        createdAt: serverTimestamp(),
      });
      router.push("/feed");
    } catch (err) {
      console.error("Failed to broadcast solution:", err);
      alert("Error publishing to feed.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-[#09090B] text-white">
      <Navbar />

      <div className="flex flex-1 overflow-hidden border-t border-white/10">
        {/* Left Column: Problem Description & Cases */}
        <section className="w-1/2 overflow-y-auto border-r border-white/10 p-6">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{problem.title}</h1>
            <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              {problem.difficulty}
            </span>
          </div>

          <div className="mt-6 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
            {problem.prompt}
          </div>

          <div className="mt-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Sample Test Cases
            </h3>
            <div className="mt-3 space-y-3">
              {problem.testCases.map((tc, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4 font-mono text-xs"
                >
                  <div className="text-zinc-400">
                    Input: <span className="text-zinc-200">nums = [{tc.nums.join(", ")}], target = {tc.target}</span>
                  </div>
                  <div className="mt-1 text-zinc-400">
                    Expected: <span className="text-emerald-400">[{tc.expected.join(", ")}]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Monaco Editor & Output Console */}
        <section className="flex w-1/2 flex-col">
          <div className="flex items-center justify-between border-b border-white/10 bg-black/40 px-4 py-2">
            <span className="text-xs font-semibold text-zinc-400">JavaScript</span>
            <div className="flex items-center gap-2">
              {hasPassed && (
                <button
                  onClick={handlePublishToFeed}
                  disabled={publishing}
                  className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
                >
                  {publishing ? "Broadcasting..." : "🚀 Publish to Synapse Feed"}
                </button>
              )}
              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
              >
                {isRunning ? "Testing..." : "▶ Run Tests"}
              </button>
            </div>
          </div>

          <div className="flex-1">
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage="javascript"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 12 },
                scrollBeyondLastLine: false,
                lineNumbersMinChars: 3,
              }}
            />
          </div>

          <div className="h-52 overflow-y-auto border-t border-white/10 bg-black/60 p-4 font-mono text-xs">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
              Execution Console
            </div>
            <pre className="whitespace-pre-wrap text-zinc-300">
              {consoleOutput || "Write your solution above and click 'Run Tests'."}
            </pre>
          </div>
        </section>
      </div>
    </div>
  );
}