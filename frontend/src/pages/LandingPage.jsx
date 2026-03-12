import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import lecturericon from "../assets/lecturericon.jpg"

/* ── Intersection-observer hook for scroll-triggered fade-ins ── */
function useFadeIn(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

/* ── Animated counter ── */
function Counter({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useFadeIn(0.4);
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.ceil(target / 50);
    const id = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(id);
      } else setCount(start);
    }, 30);
    return () => clearInterval(id);
  }, [visible, target]);
  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ── Typing headline ── */
const WORDS = ["Meaning", "Context", "Concepts", "Understanding"];
function TypingWord() {
  const [wordIdx, setWordIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = WORDS[wordIdx];
    if (!deleting && displayed.length < word.length) {
      const t = setTimeout(
        () => setDisplayed(word.slice(0, displayed.length + 1)),
        80,
      );
      return () => clearTimeout(t);
    }
    if (!deleting && displayed.length === word.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length > 0) {
      const t = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 45);
      return () => clearTimeout(t);
    }
    if (deleting && displayed.length === 0) {
      setDeleting(false);
      setWordIdx((i) => (i + 1) % WORDS.length);
    }
  }, [displayed, deleting, wordIdx]);

  return (
    <span className="relative">
      <span className="text-gray-900">{displayed}</span>
      <span className="inline-block w-[2px] h-[0.85em] bg-gray-900 ml-0.5 align-middle animate-[blink_0.8s_step-end_infinite]" />
    </span>
  );
}

const FEATURES = [
  {
    icon: "🧠",
    title: "Semantic Analysis",
    desc: "SBERT understands meaning and context — not just matching words in answers.",
  },
  {
    icon: "⚡",
    title: "Instant Grading",
    desc: "Grade a full class of submissions in seconds, with no queue.",
  },
  {
    icon: "📋",
    title: "Rubric-based Scoring",
    desc: "Evaluates accuracy, completeness, and clarity for consistent, fair results.",
  },
  {
    icon: "📈",
    title: "Class Analytics",
    desc: "Dashboards for score distribution, progress trends, and at-risk students.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Create an assessment",
    desc: "Add questions, set marks, and write sample answers for the AI grader.",
  },
  {
    n: "02",
    title: "Share the access code",
    desc: "Students join with a unique code — no email invites needed.",
  },
  {
    n: "03",
    title: "AI grades instantly",
    desc: "SBERT scores each answer semantically. You review, override if needed.",
  },
  {
    n: "04",
    title: "Analyse results",
    desc: "See score distributions, individual breakdowns, and class trends.",
  },
];

function FadeSection({ children, className = "", delay = 0 }) {
  const [ref, visible] = useFadeIn();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen bg-white text-gray-900"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes heroFade { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        .hero-1 { animation: heroFade 0.7s ease 0.1s both }
        .hero-2 { animation: heroFade 0.7s ease 0.25s both }
        .hero-3 { animation: heroFade 0.7s ease 0.4s both }
        .hero-4 { animation: heroFade 0.7s ease 0.55s both }
        .marquee-track { animation: marquee 22s linear infinite }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 bg-white transition-shadow duration-300 ${scrolled ? "shadow-sm border-b border-gray-100" : ""}`}
      >
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gray-950 rounded-lg flex items-center justify-center">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-base">EvalAI</span>
          </Link>

          <ul className="hidden md:flex items-center gap-7">
            {[
              ["Features", "#features"],
              ["How it works", "#how"],
              ["About", "#about"],
            ].map(([l, h]) => (
              <li key={l}>
                <a
                  href={h}
                  className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
                >
                  {l}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="px-4 py-2 bg-gray-950 text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────── */}
      <section className="pt-20 pb-16 px-6 text-center overflow-hidden">
        <div className="max-w-3xl mx-auto">
          <div className="hero-1 inline-flex items-center gap-2 bg-gray-100 text-gray-500 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            SBERT-Powered · Semantic Understanding
          </div>

          <h1 className="hero-2 text-[52px] font-bold text-gray-950 leading-[1.12] mb-6 tracking-tight">
            Grading that understands
            <br />
            <TypingWord />
          </h1>

          <p className="hero-3 text-base text-gray-500 leading-relaxed mb-10 max-w-xl mx-auto">
            EvalAI uses Sentence-BERT to evaluate theory answers semantically —
            not just keyword matching. Instant, consistent, and fair at any
            scale.
          </p>

          <div className="hero-4 flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate("/signup")}
              className="px-7 py-3 bg-gray-950 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all duration-200 active:scale-[0.98] shadow-lg shadow-gray-900/15"
            >
              Start for free →
            </button>
            <button
              onClick={() => navigate("/login")}
              className="px-7 py-3 border border-gray-200 text-gray-700 text-sm font-semibold rounded-xl hover:border-gray-400 hover:text-gray-900 transition-all duration-200"
            >
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Features
            </p>
            <h2 className="text-3xl font-bold text-gray-950 mb-3">
              Everything you need to grade fairly
            </h2>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Built for accuracy, transparency, and academic integrity — at any
              scale.
            </p>
          </FadeSection>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f, i) => (
              <FadeSection
                key={f.title}
                delay={i * 0.08}
                className="border border-gray-100 rounded-2xl p-6 hover:border-gray-300 hover:shadow-sm transition-all duration-300 cursor-default group"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl mb-4 group-hover:bg-gray-950 group-hover:scale-105 transition-all duration-300">
                  <span className="group-hover:grayscale-0">{f.icon}</span>
                </div>
                <h3 className="text-sm font-bold text-gray-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {f.desc}
                </p>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────── */}
      <section id="how" className="py-24 px-6 bg-gray-950">
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-14">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              How it works
            </p>
            <h2 className="text-3xl font-bold text-white mb-3">
              Up and grading in four steps
            </h2>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              No complicated setup. Create an assessment and you're ready to go.
            </p>
          </FadeSection>

          <div className="grid sm:grid-cols-2 gap-5">
            {STEPS.map((s, i) => (
              <FadeSection
                key={s.n}
                delay={i * 0.1}
                className="border border-white/10 rounded-2xl p-6 hover:border-white/20 hover:bg-white/[0.03] transition-all duration-300"
              >
                <div className="text-[11px] font-bold text-gray-600 uppercase tracking-widest mb-3">
                  {s.n}
                </div>
                <h3 className="text-base font-bold text-white mb-2">
                  {s.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {s.desc}
                </p>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role cards ─────────────────────────────────────────── */}
      <section className="py-24 px-6" id="about">
        <div className="max-w-4xl mx-auto">
          <FadeSection className="text-center mb-12">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Who it's for
            </p>
            <h2 className="text-3xl font-bold text-gray-950">
              Built for both sides of the classroom
            </h2>
          </FadeSection>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                img: "lecturericon",
                role: "Lecturer",
                headline: "Grade smarter. Teach better.",
                body: "Create question banks, publish assessments with unique access codes, and let AI handle the grading. Then drill into cohort analytics.",
                cta: "Start grading",
                path: "/signup",
              },
              {
                icon: "🎓",
                img: "student-icon.svg",
                role: "Student",
                headline: "Submit. Learn. Improve.",
                body: "Join assessments with a code, submit answers, and get detailed feedback. Track how your scores evolve over time.",
                cta: "Join an assessment",
                path: "/signup",
              },
            ].map((c, i) => (
              <FadeSection
                key={c.role}
                delay={i * 0.12}
                className="border border-gray-200 rounded-2xl p-8 flex flex-col hover:border-gray-400 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl mb-5 group-hover:bg-gray-950 group-hover:scale-105 transition-all duration-300">
                  <span>{c.icon}</span>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                  {c.role}
                </p>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {c.headline}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed flex-1 mb-6">
                  {c.body}
                </p>
                <button
                  onClick={() => navigate(c.path)}
                  className="w-full py-3 border-2 border-gray-950 text-gray-950 text-sm font-bold rounded-xl hover:bg-gray-950 hover:text-white transition-all duration-200"
                >
                  {c.cta} →
                </button>
              </FadeSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────── */}
      <FadeSection className="py-20 px-6 bg-gray-950 text-center">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
          Ready?
        </p>
        <h2 className="text-3xl font-bold text-white mb-4">
          Start grading with intelligence
        </h2>
        <p className="text-sm text-gray-400 mb-8 max-w-sm mx-auto">
          Join lecturers and students already using EvalAI. Free to get started.
        </p>
        <button
          onClick={() => navigate("/signup")}
          className="px-8 py-3.5 bg-white text-gray-950 text-sm font-bold rounded-xl hover:bg-gray-100 transition-all duration-200 active:scale-[0.98]"
        >
          Create your account →
        </button>
      </FadeSection>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-gray-100 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gray-950 rounded-md flex items-center justify-center">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-gray-900">EvalAI</span>
          </div>
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} EvalAI. All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Terms", "Privacy", "Support"].map((l) => (
              <a
                key={l}
                href={`#${l.toLowerCase()}`}
                className="text-xs text-gray-400 hover:text-gray-700 transition"
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
