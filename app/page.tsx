import Navbar from "@/components/Navbar";
import FeatureCard from "@/components/FeatureCard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#09090B] text-white">

      <Navbar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-1/2 top-20 h-96 w-96 -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-24 text-center md:pb-32 md:pt-32">

          <div className="mx-auto mb-8 inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 backdrop-blur">
            🚀 The developer ecosystem built for growth
          </div>

          <h1 className="mx-auto max-w-5xl text-5xl font-bold tracking-tight sm:text-6xl md:text-7xl">
            Learn.
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              {" "}
              Build.
            </span>
            <br />
            Grow.
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-zinc-400 md:text-xl">
            Vridhi brings coding, learning, projects, collaboration,
            community, AI and career opportunities together in one
            powerful platform for developers.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <button className="rounded-xl bg-white px-7 py-3.5 font-semibold text-black transition hover:-translate-y-0.5 hover:bg-zinc-200">
              Start Building →
            </button>

            <button className="rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 font-semibold text-white transition hover:bg-white/10">
              Explore Vridhi
            </button>
          </div>

        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-24">

          <p className="text-sm font-semibold uppercase tracking-widest text-indigo-400">
            Everything in one place
          </p>

          <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
            One ecosystem.
            <br />
            Endless possibilities.
          </h2>

          <p className="mt-5 max-w-2xl text-zinc-400">
            Build your skills, projects, network and career without
            constantly switching between different platforms.
          </p>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">

            <FeatureCard
              icon="⚡"
              title="Code & Practice"
              description="Solve coding challenges, participate in contests and improve your programming skills."
            />

            <FeatureCard
              icon="📚"
              title="Learn & Grow"
              description="Follow learning paths, complete courses, take quizzes and track your progress."
            />

            <FeatureCard
              icon="🚀"
              title="Build Projects"
              description="Create repositories, manage projects and collaborate with developers."
            />

            <FeatureCard
              icon="🤖"
              title="AI Mentor"
              description="Get help understanding code, finding bugs and reviewing projects."
            />

            <FeatureCard
              icon="🌎"
              title="Developer Community"
              description="Share ideas, ask questions, write blogs and connect with developers."
            />

            <FeatureCard
              icon="💼"
              title="Career"
              description="Discover opportunities, build your profile and connect with companies."
            />

          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="community" className="border-t border-white/10">
        <div className="mx-auto max-w-5xl px-6 py-28 text-center">

          <h2 className="text-4xl font-bold sm:text-5xl">
            Your growth starts here.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Learn new skills, build meaningful projects and become
            part of a growing developer ecosystem.
          </p>

          <button className="mt-10 rounded-xl bg-white px-8 py-4 font-semibold text-black hover:bg-zinc-200">
            Join Vridhi →
          </button>

        </div>
      </section>

      {/* Footer */}
      <footer
        id="about"
        className="border-t border-white/10 px-6 py-10"
      >
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-5 text-sm text-zinc-500 md:flex-row">

          <p>
            © 2026 Vridhi. Learn. Build. Grow.
          </p>

          <div className="flex gap-6">
            <span>About</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>

        </div>
      </footer>

    </main>
  );
}