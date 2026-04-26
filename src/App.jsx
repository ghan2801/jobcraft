import { useState, useRef, useEffect } from "react";
import { generateResumeHTML } from "./ResumeHTML";
import { generateCoverLetterHTML } from "./CoverLetterHTML";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import History from "./History";
import Profile from "./Profile";
import DiffView from "./DiffView";
import ChangeSummary from "./ChangeSummary";
import GapReport from "./GapReport";
import ReviewMode from "./ReviewMode";
import PrepCoach from "./PrepCoach";
import { ThemeContext, DARK_THEME, LIGHT_THEME, useTheme } from "./ThemeContext";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

function Tag({ children, color }) {
  const { theme } = useTheme();
  const c = color || theme.accent;
  return (
    <span style={{
      background: c + "18",
      color: c,
      border: `1px solid ${c}40`,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontFamily: "'DM Mono', monospace",
      fontWeight: 500,
      letterSpacing: "0.05em",
    }}>{children}</span>
  );
}



const LOADER_MESSAGES = [
  { emoji: "📄", action: "Reading",     rest: " your resume…" },
  { emoji: "🔍", action: "Analysing",   rest: " the job description…" },
  { emoji: "🎯", action: "Identifying", rest: " key requirements…" },
  { emoji: "✨", action: "Matching",    rest: " your experience…" },
  { emoji: "🔑", action: "Injecting",   rest: " high-impact keywords…" },
  { emoji: "📊", action: "Calculating", rest: " your ATS score…" },
  { emoji: "🔄", action: "Reframing",   rest: " your experience…" },
  { emoji: "✅", action: "Finalising",  rest: " your tailored resume…" },
];

const KEYWORD_PILLS = ["ATS Optimized", "Keywords Added", "Score Boosted", "Gaps Filled", "Impact Enhanced"];

const COVER_MESSAGES = [
  { emoji: "✍️", action: "Crafting",     rest: " your opening…" },
  { emoji: "🎯", action: "Connecting",   rest: " your experience…" },
  { emoji: "💼", action: "Highlighting", rest: " key achievements…" },
  { emoji: "✨", action: "Polishing",    rest: " your close…" },
];

const COVER_PILLS = ["Opening Crafted", "Tone Polished", "Keywords Woven", "Flow Refined", "Impact Added"];

const LEFT_LINES  = [55, 82, 63, 90, 38];
const RIGHT_LINES = [55, 82, 63, 90, 38];

function LoadingMessages({ isRefine = false, customMessages, customPills, rightLabel, showAts = true }) {
  const { theme, isDark } = useTheme();
  const [msgIndex,  setMsgIndex]  = useState(0);
  const [fade,      setFade]      = useState(true);
  const [progress,  setProgress]  = useState(0);
  const [atsPhase,  setAtsPhase]  = useState(0); // 0 = "calculating…", 1 = "boosting…"
  const [pillIndex, setPillIndex] = useState(0);
  const startTime = useRef(Date.now());
  const ac = theme.accent;
  const msgs  = customMessages || LOADER_MESSAGES;
  const pills = customPills    || KEYWORD_PILLS;

  // Message cycling: play through all messages, then loop from midpoint
  useEffect(() => {
    const loopFrom = Math.max(0, Math.floor(msgs.length / 2));
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex(prev => (prev < msgs.length - 1 ? prev + 1 : loopFrom));
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, [msgs]);

  // Progress bar: 0 → 85 % over 25 s
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      setProgress(Math.min(85, (elapsed / 25) * 85));
    }, 100);
    return () => clearInterval(id);
  }, []);

  // ATS display switches after 15 s
  useEffect(() => {
    const id = setTimeout(() => setAtsPhase(1), 15000);
    return () => clearTimeout(id);
  }, []);

  // Keyword pill cycling — new pill every 2 s
  useEffect(() => {
    const id = setInterval(() => {
      setPillIndex(prev => (prev + 1) % pills.length);
    }, 2000);
    return () => clearInterval(id);
  }, [pills]);

  const msg = msgs[msgIndex] || msgs[0];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 18, padding: "28px 20px", minHeight: 380,
    }}>
      <style>{`
        @keyframes ldr-pulse-glow {
          0%, 100% { box-shadow: 0 0 14px ${ac}45, 0 0 30px ${ac}20; border-color: ${ac}; }
          50%       { box-shadow: 0 0 28px ${ac}80, 0 0 56px ${ac}38; border-color: ${ac}; }
        }
        @keyframes ldr-shimmer {
          0%, 100% { opacity: 0.5; transform: scaleX(0.94); }
          50%       { opacity: 1;   transform: scaleX(1); }
        }
        @keyframes ldr-dots {
          0%        { transform: translateX(-50px); opacity: 0; }
          20%, 80%  { opacity: 1; }
          100%      { transform: translateX(50px);  opacity: 0; }
        }
        @keyframes ldr-pill {
          0%   { transform: translate(-50%, 0);   opacity: 0; }
          18%  { opacity: 1; }
          72%  { opacity: 1; transform: translate(-50%, -44px); }
          100% { transform: translate(-50%, -56px); opacity: 0; }
        }
        @keyframes ldr-msg {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ldr-ats-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>

      {/* ── DOCUMENT TRANSFORM SCENE ─────────────────────────── */}
      <div style={{
        position: "relative",
        display: "flex", alignItems: "center",
        backgroundImage: `radial-gradient(circle, ${theme.border} 1px, transparent 1px)`,
        backgroundSize: "18px 18px",
        borderRadius: 16,
        padding: "22px 28px 18px",
      }}>

        {/* LEFT — original (dull) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 120, height: 160,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: "14px 13px 10px",
            display: "flex", flexDirection: "column", gap: 9,
            opacity: 0.6,
          }}>
            <div style={{ width: "68%", height: 8, background: theme.textFaint, borderRadius: 3 }} />
            {LEFT_LINES.map((w, i) => (
              <div key={i} style={{
                width: `${w}%`, height: 5,
                background: theme.border,
                borderRadius: 2,
              }} />
            ))}
          </div>
          <span style={{
            fontSize: 10, color: theme.textMuted,
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
          }}>Your Resume</span>
        </div>

        {/* ANIMATED ARROW */}
        <div style={{ width: 72, position: "relative", display: "flex", alignItems: "center", marginBottom: 18 }}>
          {/* track */}
          <div style={{
            position: "absolute", left: 0, right: 10,
            height: 2, background: `${ac}35`, top: "50%", transform: "translateY(-50%)",
          }} />
          {/* moving dots */}
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: "absolute", left: "50%", top: "50%",
              width: 7, height: 7, borderRadius: "50%",
              background: ac,
              transform: "translate(-50%, -50%)",
              animation: `ldr-dots 1.5s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}
          {/* arrowhead */}
          <div style={{
            position: "absolute", right: 0, top: "50%",
            transform: "translateY(-50%)",
            width: 0, height: 0,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderLeft: `9px solid ${ac}`,
          }} />
        </div>

        {/* RIGHT — tailored (glowing) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          {/* Keyword pill — floats up on remount via key */}
          <div style={{ position: "relative", width: 120, height: 36 }}>
            <div
              key={pillIndex}
              style={{
                position: "absolute", bottom: 0, left: "50%",
                background: `${ac}18`,
                color: ac,
                border: `1px solid ${ac}45`,
                borderRadius: 20,
                padding: "3px 9px",
                fontSize: 9,
                fontFamily: "'DM Mono', monospace",
                fontWeight: 600,
                whiteSpace: "nowrap",
                animation: "ldr-pill 1.85s ease-out forwards",
              }}
            >
              {pills[pillIndex]}
            </div>
          </div>

          <div style={{
            width: 120, height: 160,
            background: theme.card,
            border: `2px solid ${ac}`,
            borderRadius: 8,
            padding: "14px 13px 10px",
            display: "flex", flexDirection: "column", gap: 9,
            animation: "ldr-pulse-glow 2.4s ease-in-out infinite",
          }}>
            <div style={{
              width: "68%", height: 8,
              background: ac, borderRadius: 3,
              animation: "ldr-shimmer 1.8s ease-in-out infinite",
            }} />
            {RIGHT_LINES.map((w, i) => (
              <div key={i} style={{
                width: `${w}%`, height: 5,
                background: i % 2 === 0 ? `${ac}95` : `${ac}55`,
                borderRadius: 2,
                animation: `ldr-shimmer 1.8s ease-in-out infinite`,
                animationDelay: `${i * 0.28}s`,
              }} />
            ))}
          </div>
          <span style={{
            fontSize: 10, color: ac,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.06em", fontWeight: 600,
          }}>{rightLabel ?? (isRefine ? "Refined Resume" : "Tailored Resume")}</span>
        </div>
      </div>

      {/* ── CYCLING MESSAGE ───────────────────────────────────── */}
      <p
        key={msgIndex}
        style={{
          color: theme.text, fontSize: 15,
          fontFamily: "'DM Mono', monospace",
          textAlign: "center", margin: 0,
          opacity: fade ? 1 : 0, transition: "opacity 0.3s",
          animation: "ldr-msg 0.35s ease",
        }}
      >
        <span style={{ marginRight: 6 }}>{msg.emoji}</span>
        <strong style={{ color: theme.textStrong }}>{msg.action}</strong>
        {msg.rest}
      </p>

      {/* ── PROGRESS BAR ─────────────────────────────────────── */}
      <div style={{
        width: "100%", maxWidth: 340, height: 3,
        background: theme.border, borderRadius: 4, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: ac, borderRadius: 4,
          transition: "width 0.15s linear",
        }} />
      </div>

      {/* ── ATS COUNTER ──────────────────────────────────────── */}
      {showAts && (
        <p style={{
          color: theme.textMuted, fontSize: 12,
          fontFamily: "'DM Mono', monospace",
          textAlign: "center", margin: 0,
          animation: atsPhase === 1 ? "ldr-ats-blink 1.3s ease-in-out infinite" : "none",
        }}>
          {atsPhase === 0 ? "ATS Score: calculating…" : "ATS Score: ██░░ boosting…"}
        </p>
      )}
    </div>
  );
}



function StepIndicator({ current }) {
  const { theme } = useTheme();
  const steps = ["Upload Resume", "Paste JD", "Review & Apply"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: i <= current ? theme.accent : theme.border,
              color: i <= current ? theme.background : theme.textFaint,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace",
              boxShadow: i === current ? `0 0 0 4px ${theme.accent}25` : "none",
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i <= current ? theme.text : theme.textFaint, fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap", letterSpacing: "0.05em" }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i < current ? theme.accent : theme.border, margin: "0 8px", marginBottom: 20, transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

const RESUME_TEMPLATES = [
  {
    key: "classic",
    label: "Classic",
    preview: (
      <div style={{ background: "#fff", width: "100%", height: "100%", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
        <div style={{ width: "65%", height: 6, background: "#222", borderRadius: 2 }} />
        <div style={{ width: "48%", height: 4, background: "#777", borderRadius: 2 }} />
        <div style={{ width: "100%", height: 1, background: "#ccc", margin: "3px 0" }} />
        {[90, 80, 85, 70, 88, 75].map((w, i) => (
          <div key={i} style={{ width: `${w}%`, height: 3, background: "#bbb", borderRadius: 1 }} />
        ))}
      </div>
    ),
  },
  {
    key: "modern",
    label: "Modern",
    preview: (
      <div style={{ background: "#fff", width: "100%", height: "100%", display: "flex" }}>
        <div style={{ width: 22, background: "#1a1a2e", flexShrink: 0, padding: "8px 4px", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ width: "90%", height: 5, background: "#00E5A0", borderRadius: 1 }} />
          <div style={{ width: "80%", height: 3, background: "#444", borderRadius: 1 }} />
          <div style={{ width: "80%", height: 3, background: "#444", borderRadius: 1 }} />
          <div style={{ marginTop: 4, width: "70%", height: 2, background: "#00E5A0", borderRadius: 1 }} />
          {[1, 2, 3].map(i => <div key={i} style={{ width: "80%", height: 2, background: "#333", borderRadius: 1 }} />)}
        </div>
        <div style={{ flex: 1, padding: "8px 5px", display: "flex", flexDirection: "column", gap: 3 }}>
          {[90, 80, 70, 85, 75, 80].map((w, i) => (
            <div key={i} style={{ width: `${w}%`, height: 3, background: "#ddd", borderRadius: 1 }} />
          ))}
        </div>
      </div>
    ),
  },
  {
    key: "executive",
    label: "Executive",
    preview: (
      <div style={{ background: "#fff", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
        <div style={{ background: "#1E293B", padding: "8px 6px", flexShrink: 0 }}>
          <div style={{ width: "70%", height: 5, background: "#fff", borderRadius: 1, marginBottom: 3 }} />
          <div style={{ width: "50%", height: 3, background: "#00E5A0", borderRadius: 1 }} />
        </div>
        <div style={{ flex: 1, padding: "5px 6px", display: "flex", flexDirection: "column", gap: 3 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2, marginBottom: 1 }}>
            <div style={{ width: 2, height: 8, background: "#00E5A0", borderRadius: 1, flexShrink: 0 }} />
            <div style={{ width: "45%", height: 3, background: "#1E293B", borderRadius: 1 }} />
          </div>
          {[90, 80, 85, 70].map((w, i) => (
            <div key={i} style={{ width: `${w}%`, height: 3, background: "#ddd", borderRadius: 1 }} />
          ))}
        </div>
      </div>
    ),
  },
];

function JobCraft({ session, onLogout, onShowHistory, onShowProfile }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState("");
  const [jd, setJD] = useState("");
  const [tailored, setTailored] = useState("");
  const [originalTailored, setOriginalTailored] = useState("");
  const [resumeSaved, setResumeSaved] = useState(false);
  const [atsScore, setAtsScore] = useState(null);
  const [originalAtsScore, setOriginalAtsScore] = useState(null);
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [activeTab, setActiveTab] = useState("diff");
  const [toast, setToast] = useState("");
  const [profileResume, setProfileResume] = useState("");
  const [profileLocation, setProfileLocation] = useState("");
  const [resumeSource, setResumeSource] = useState("paste");
  const [showWelcome, setShowWelcome] = useState(false);
  const [changeSummary, setChangeSummary] = useState(null);
  const [gapReport, setGapReport] = useState(null);
  const [reviewableChanges, setReviewableChanges] = useState([]);
  const [acceptedChanges, setAcceptedChanges] = useState(new Set());
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [boldPhrases, setBoldPhrases] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [coverLetter,        setCoverLetter]        = useState("");
  const [coverLetterLoading, setCoverLetterLoading] = useState(false);
  const [coverLetterError,   setCoverLetterError]   = useState("");
  const [coverLetterCopied,  setCoverLetterCopied]  = useState(false);
  const [applicationId,      setApplicationId]      = useState(null);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  const [prepPlan,           setPrepPlan]           = useState(null);
  const [prepLoading,        setPrepLoading]        = useState(false);
  const [prepError,          setPrepError]          = useState("");
  const [daysUntilInterview, setDaysUntilInterview] = useState(null);
  const [hoursPerDay,        setHoursPerDay]        = useState(2);
  const [prepSearchResults,  setPrepSearchResults]  = useState([]);
  const [fileProcessing,     setFileProcessing]     = useState(false);
  const [fileError,          setFileError]          = useState("");
  const [jdFileProcessing,   setJdFileProcessing]   = useState(false);
  const [jdFileError,        setJdFileError]        = useState("");
  const fileRef = useRef();
  const jdFileRef = useRef();

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("base_resume, location")
        .eq("id", session.user.id)
        .single();
      if (data?.base_resume) {
        setProfileResume(data.base_resume);
        setResume(data.base_resume);
        setResumeSource("profile");
      } else {
        setShowWelcome(true);
      }
      if (data?.location) setProfileLocation(data.location);
    }
    loadProfile();
  }, []);

  function handleSourceChange(src) {
    setResumeSource(src);
    if (src === "profile") setResume(profileResume);
    else if (src === "paste" || src === "upload") setResume("");
  }

  async function saveApplication({ tailoredResume, origAtsScore, newAtsScore, title, company }) {
    try {
      const { data } = await supabase.from("applications").insert({
        user_id:            session.user.id,
        company_name:       company,
        job_title:          title,
        original_ats_score: origAtsScore,
        tailored_ats_score: newAtsScore,
        tailored_resume:    tailoredResume,
        original_resume:    resume,
        job_description:    jd,
        status:             "Applied",
      }).select("id").single();
      if (data?.id) setApplicationId(data.id);
      setToast("Application saved ✓");
      setTimeout(() => setToast(""), 3000);
    } catch {
      // save failure is silent — don't interrupt the user's workflow
    }
  }

  const sampleResume = `John Doe | john@email.com | LinkedIn: /in/johndoe
Software Engineer | 5 years experience

EXPERIENCE
Senior Developer – TechCorp (2021–Present)
- Built REST APIs serving 1M+ users
- Worked on backend systems using Python and Node.js
- Collaborated with cross-functional teams

Developer – StartupXYZ (2019–2021)
- Developed web applications using React
- Maintained SQL databases

SKILLS
Python, JavaScript, React, SQL, Git

EDUCATION
B.S. Computer Science – State University, 2019`;

  const sampleJD = `Senior Software Engineer – FinTech Startup

We're looking for a Senior Software Engineer to join our growing team.

Requirements:
- 4+ years of experience in backend development
- Strong proficiency in Python and RESTful API design
- Experience with cloud platforms (AWS/GCP preferred)
- Knowledge of microservices architecture
- Experience with CI/CD pipelines and Docker
- Strong problem-solving and communication skills

Nice to have:
- Experience in financial technology
- Knowledge of Kafka or similar message queues
- Familiarity with Kubernetes

We offer competitive salary, equity, and remote-first culture.`;

  const truncateJD = (text, maxChars = 3000) => {
    if (!text || text.length <= maxChars) return text;
    const truncated = text.slice(0, maxChars);
    const lastParagraph = truncated.lastIndexOf('\n\n');
    if (lastParagraph > 2000) {
      return truncated.slice(0, lastParagraph) + '\n\n[JD truncated for processing...]';
    }
    return truncated + '\n\n[JD truncated...]';
  };

  async function tailorResume() {
    const processedJD = truncateJD(jd);
    setLoading(true);
    setError("");
    setChangeSummary(null);
    setGapReport(null);
    setReviewableChanges([]);
    setAcceptedChanges(new Set());

    // ── CALL 1: Core tailoring (fast) ────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);
    let tailoredResume = "";
    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 6000,
          messages: [{
            role: "user",
            content: `You are a world-class resume writer and ATS optimization specialist with deep expertise in matching resumes to job descriptions.

TASK: Tailor the resume below to match the job description with surgical precision. Return ONLY a JSON object with no markdown, no backticks, nothing else.

CRITICAL RULES:

1. KEYWORD EXTRACTION:
   Before writing anything, extract ALL specific terms from the JD:
   - Exact job title words
   - Specific domain terms (e.g. NBO, DORA, GMV, Lead Scoring)
   - Specific tools mentioned
   - Specific frameworks mentioned
   - KPI names mentioned
   - Methodology names
   Use these EXACT terms in the resume. Do not paraphrase them.

2. PROFESSIONAL SUMMARY:
   - First sentence must mirror JD title exactly
   - Include 2-3 most critical JD requirements
   - Mention specific domain/industry from JD
   - Include one specific metric or achievement
   - Maximum 4 sentences

3. CORE COMPETENCIES:
   - Group into 4-6 categories
   - Category names should mirror JD sections
   - Each category has 4-6 specific skills
   - Include ALL specific tools from JD
   - Include ALL specific frameworks from JD
   - Include ALL specific KPIs from JD

4. EXPERIENCE BULLETS:
   - Start each bullet with a bold category label that mirrors a JD Key Result Area (e.g. "Strategy to Execution:" or "Program Management:")
   - Include specific JD terms naturally
   - Lead with impact and outcomes
   - Include numbers where possible
   - Each bullet 1-2 lines max

5. DO NOT:
   - Use generic phrases like "results-driven" or "proven track record" alone
   - Fabricate specific numbers not in the resume
   - Add skills the candidate clearly does not have
   - Make bullets longer than 2 lines
   - IMPORTANT: Copy company names EXACTLY as they appear in the original resume. Never modify, duplicate, or alter company names. If the original says "Avalara" — write exactly "Avalara", never "AvalaraAvalaraAnalytics" or any other variation.

6. FORMAT:
   Keep exact same section order as original. Do not add or remove sections.

7. RELOCATION DETECTION:
   Before writing the resume, check if the job location in the JD is different from the candidate's location in their resume.

   If the job is in a DIFFERENT country from the candidate:
   - Add a relocation line in the header BELOW the contact line:
     "Open to Relocate to [City, Country] | Available Immediately | [Language] Speaker"
     Example: "Open to Relocate to Amsterdam, Netherlands | Available Immediately | Fluent English Speaker"
   - Extract the target city/country from the JD
   - Always add "Available Immediately" unless the resume says otherwise
   - Add language only if the JD mentions a language requirement

   If the job is in the SAME country as the candidate:
   - Do not add a relocation line
   - Keep the header as normal

8. TONE MATCHING:
   Before writing, analyze the JD tone and mirror it throughout the entire resume:
   - Formal/corporate JD → use professional corporate language
   - Consultancy/strategy JD → use strategic, impact-driven language; mention consultancy background if relevant
   - Startup/tech JD → use dynamic, growth-oriented language
   - Creative/agency JD → use personality-driven language

   Mirror the JD's exact vocabulary. If the JD says "groundbreaking insights" — use that phrase. If it says "relentless focus on tangible impact" — use that framing. The resume should feel like it was written by someone who deeply understands this company's culture.

JSON format:
{
  "original_ats_score": <number 0-100>,
  "tailored_resume": "the full tailored resume text",
  "ats_score": <number 0-100>,
  "job_title": "exact job title from the JD",
  "company_name": "company name from the JD",
  "bold_phrases": ["exact phrase from resume to bold"],
  "key_changes": ["change 1", "change 2", "change 3"],
  "reviewable_changes": [
    {
      "id": "change_1",
      "type": "title_change/keyword_added/section_reframed/skill_added",
      "description": "short description under 100 characters",
      "original_text": "original text if applicable, else empty string",
      "new_text": "the new text added or changed",
      "location": "where in the resume this appears",
      "ats_impact": <number 1-15>,
      "risk_level": "safe/moderate/risky",
      "risk_reason": "explanation only if moderate or risky, else empty string"
    }
  ]
}

Where:
- original_ats_score = how well the ORIGINAL resume matches the JD (before any changes)
- ats_score = how well the TAILORED resume matches the JD (after optimization)
- job_title = the job title as stated in the JD (e.g. "Senior Software Engineer")
- company_name = the hiring company name as stated in the JD (e.g. "Acme Corp")
- bold_phrases = maximum 6 phrases from the tailored resume that are the most impressive and impactful moments; each phrase must appear EXACTLY ONCE in the resume (no repeated bolding); pick specific numbers/achievements (e.g. "reduced manual effort by 40%"), scale indicators (e.g. "150+ dashboards"), unique high-value skills specific to this JD (e.g. "DORA metrics framework"), or exact tools that match the JD (e.g. "AWS Redshift"); do NOT pick generic phrases like "data-driven" or "stakeholder management"; return the exact text as it appears in the tailored resume
- reviewable_changes = identify maximum 8 most impactful changes made; keep all descriptions under 100 characters each

ORIGINAL RESUME:
${resume}

JOB DESCRIPTION:
${processedJD}`
          }]
        })
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      const text = data.content.map(b => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      tailoredResume = parsed.tailored_resume;
      setTailored(tailoredResume);
      setOriginalTailored(tailoredResume);
      setAtsScore(parsed.ats_score);
      setOriginalAtsScore(parsed.original_ats_score);
      setJobTitle(parsed.job_title || "");
      setCompanyName(parsed.company_name || "");
      setBoldPhrases(parsed.bold_phrases || []);
      if (parsed.reviewable_changes) {
        setReviewableChanges(parsed.reviewable_changes);
        setAcceptedChanges(new Set(parsed.reviewable_changes.map(c => c.id)));
      }
      setStep(2);
      saveApplication({
        tailoredResume,
        origAtsScore: parsed.original_ats_score,
        newAtsScore:  parsed.ats_score,
        title:        parsed.job_title   || "",
        company:      parsed.company_name || "",
      });
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setError('This is taking longer than usual. Please try again — large JDs sometimes need a second attempt.');
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    } finally {
      setLoading(false);
    }

    // ── CALL 2: Intelligence layer (runs after results are shown) ──
    setIntelligenceLoading(true);
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 60000);
    try {
      const response2 = await fetch("/api/proxy", {
        method: "POST",
        signal: controller2.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `Based on this original resume and tailored resume, provide analysis. Return ONLY a JSON object with no markdown, no backticks, nothing else.

IMPORTANT: Your entire response must be valid, complete JSON. Do not truncate. Keep each string value under 200 characters. Use short concise descriptions.

ORIGINAL RESUME:
${resume.slice(0, 1500)}

TAILORED RESUME:
${tailoredResume.slice(0, 1500)}

JOB DESCRIPTION:
${processedJD.slice(0, 800)}

Return exactly this JSON structure:
{
  "change_summary": {
    "overall_strategy": "one sentence on the tailoring approach",
    "title_change": {
      "from": "original title",
      "to": "new title",
      "reason": "why changed (max 100 chars)"
    },
    "keywords_added": [
      { "keyword": "keyword", "added_where": "section name", "reason": "why added (max 80 chars)" }
    ],
    "sections_reframed": [
      { "section": "section name", "change": "what changed (max 100 chars)", "reason": "why (max 80 chars)" }
    ]
  },
  "gap_report": {
    "original_score_reason": "one sentence why original scored lower",
    "strong_matches": ["skill1", "skill2", "skill3"],
    "skills_still_missing": [
      { "skill": "skill name", "frequency_in_jd": 2, "importance": "critical", "reason": "why it matters (max 80 chars)" }
    ],
    "job_fit_score": "high",
    "job_fit_reason": "one sentence on fit",
    "recommended_action": "apply_confidently"
  }
}`
          }]
        })
      });
      clearTimeout(timeoutId2);
      const intel = await response2.json();
      console.log("Call 2 raw response:", intel);
      const text2 = intel.content.map(b => b.text || "").join("");
      const clean2 = text2.replace(/```json|```/g, "").trim();
      const parsed2 = JSON.parse(clean2);
      console.log("Setting changeSummary:", parsed2.change_summary);
      setChangeSummary(parsed2.change_summary || null);
      console.log("Setting gapReport:", parsed2.gap_report);
      setGapReport(parsed2.gap_report || null);
    } catch (e) {
      clearTimeout(timeoutId2);
      console.error("Call 2 failed:", e);
      // Intelligence layer failure is silent — core results already visible
    } finally {
      setIntelligenceLoading(false);
    }
  }

  async function refineWithFeedback() {
    if (!feedback.trim()) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 6000,
          messages: [{
            role: "user",
            content: `Update the tailored resume based on user feedback. Return ONLY JSON.

JSON format:
{
  "tailored_resume": "updated resume text",
  "ats_score": <number 0-100>
}

CURRENT RESUME:
${tailored}

USER FEEDBACK:
${feedback}

JOB DESCRIPTION:
${jd}`
          }]
        })
      });
      const data = await response.json();
      const text = data.content.map(b => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setTailored(parsed.tailored_resume);
      setAtsScore(parsed.ats_score);
      setFeedback("");
    } catch (e) {
      setError("Refinement failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function regenerateWithChoices(acceptedIds) {
    const accepted = reviewableChanges.filter(c => acceptedIds.has(c.id));
    if (accepted.length === 0) return;
    setLoading(true);
    setError("");
    try {
      const changesList = accepted.map((c, i) =>
        `${i + 1}. [${c.type}] ${c.description}${c.new_text ? ` — use: "${c.new_text}"` : ""}${c.location ? ` (${c.location})` : ""}`
      ).join("\n");
      const response = await fetch("/api/proxy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `You are an expert resume coach. Regenerate the resume applying ONLY the listed accepted changes. Return ONLY a JSON object with no markdown, no backticks.

JSON format:
{
  "tailored_resume": "full updated resume text",
  "ats_score": <number 0-100>
}

ORIGINAL RESUME:
${resume}

JOB DESCRIPTION:
${jd}

ACCEPTED CHANGES TO APPLY (apply these and nothing else):
${changesList}`,
          }],
        }),
      });
      const data  = await response.json();
      const text  = data.content.map(b => b.text || "").join("");
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);
      setTailored(parsed.tailored_resume);
      setOriginalTailored(parsed.tailored_resume);
      setAtsScore(parsed.ats_score);
      setActiveTab("tailored");
    } catch {
      setError("Regeneration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function generateCoverLetter() {
    setCoverLetterLoading(true);
    setCoverLetterError("");
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const processedJDCL = truncateJD(jd);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);
    try {
      const response = await fetch("/api/proxy", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: `You are an expert cover letter writer.
Write a professional, compelling cover letter based on the information below.

Rules:
- Maximum 3 paragraphs
- Paragraph 1: Strong opening, mention role and company, hook the reader immediately
- Paragraph 2: Connect 2-3 specific achievements from resume to JD requirements
- Paragraph 3: Forward-looking close, express genuine interest, call to action
- Tone: confident but not arrogant
- Do NOT use generic phrases like 'I am writing to apply' or 'I would be a great fit'
- Do NOT use 'I am passionate about'
- Make it sound human, specific, intelligent
- Include: ${today} as the date, Hiring Manager greeting, proper sign-off with candidate name
- Length: 250-320 words maximum

TAILORED RESUME:
${tailored}

JOB DESCRIPTION:
${processedJDCL}

COMPANY: ${companyName}
ROLE: ${jobTitle}

Return ONLY the cover letter text. No JSON. No explanation. Just the letter.`,
          }],
        }),
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      const letter = data.content.map(b => b.text || "").join("").trim();
      setCoverLetter(letter);
      if (applicationId) {
        await supabase.from("applications").update({ cover_letter: letter }).eq("id", applicationId);
      }
    } catch (e) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        setCoverLetterError('This is taking longer than usual. Please try again — large JDs sometimes need a second attempt.');
      } else {
        setCoverLetterError('Failed to generate cover letter. Please try again.');
      }
    } finally {
      setCoverLetterLoading(false);
    }
  }

  async function generatePrepPlan() {
    if (!daysUntilInterview) return;
    setPrepLoading(true);
    setPrepError("");
    // Declared outside try so catch block can access them
    const prepController = new AbortController();
    const prepTimeoutId = setTimeout(() => prepController.abort(), 55000);
    try {
      // Step 1: 3 parallel web searches for company/role context (best-effort)
      let snippets = "";
      try {
        const searchQueries = [
          `${companyName || jobTitle} interview process rounds questions`,
          `${jobTitle} interview questions technical behavioral`,
          `${companyName || jobTitle} company culture values hiring`,
        ];
        const searchResults = await Promise.allSettled(
          searchQueries.map(q =>
            fetch("/api/search", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: q }),
            }).then(r => {
              if (!r.ok) throw new Error(`Search returned ${r.status}`);
              return r.json();
            }).catch(() => ({ results: [] }))
          )
        );
        snippets = searchResults
          .map(r => r.status === "fulfilled" ? r.value : { results: [] })
          .flatMap(r => (r.results || []).slice(0, 3).map(s => s.snippet || s.description || ""))
          .filter(Boolean)
          .slice(0, 12)
          .join("\n");
      } catch (e) {
        console.log("Search failed, continuing without web context:", e);
        snippets = "";
      }
      setPrepSearchResults(snippets);

      // Step 2: Claude generates the full prep plan
      const response = await fetch("/api/proxy", {
        method: "POST",
        signal: prepController.signal,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 6000,
          messages: [{
            role: "user",
            content: `You are an expert interview coach. Create a concise, personalised interview preparation plan.

CRITICAL: Your entire response must be valid, complete JSON under 5000 tokens.
Be extremely concise:
- Each task description: max 80 characters
- Each round description: max 80 characters
- Each question: max 100 characters
- Each answer_guide: max 100 characters
- Each tip: max 80 characters
- Each readiness note: max 80 characters
- Max 3 tasks per day
- Max 6 interview questions total
- Max 6 readiness items total
- Max 4 emergency tips

CONTEXT:
- Role: ${jobTitle || "the role"}
- Company: ${companyName || "the company"}
- Days until interview: ${daysUntilInterview}
- Study hours per day: ${hoursPerDay}
- Tailored resume: ${tailored.slice(0, 1200)}
- Job description: ${jd.slice(0, 800)}
- Research snippets: ${snippets ? snippets.slice(0, 600) : "No web search results available. Base analysis on JD and resume only."}

Return ONLY a JSON object. No markdown. No backticks.

{
  "interview_structure": {
    "overview": "1-2 sentence overview (max 120 chars)",
    "rounds": [
      { "name": "round name", "description": "max 80 chars", "duration": "e.g. 45 min" }
    ]
  },
  "readiness_assessment": {
    "overall_verdict": "1-2 sentence honest assessment",
    "items": [
      { "label": "skill from JD (max 60 chars)", "level": "strong|neutral|gap", "note": "for neutral/gap: what is missing (max 80 chars)" }
    ]
  },
  "daily_plan": [
    {
      "day": 1,
      "theme": "short theme (max 40 chars)",
      "tasks": ["actionable task (max 80 chars)", "actionable task (max 80 chars)", "actionable task (max 80 chars)"]
    }
  ],
  "top_questions": [
    {
      "question": "interview question (max 100 chars)",
      "category": "Behavioral|Technical|Situational|Culture",
      "answer_guide": "how to answer (max 100 chars)"
    }
  ],
  "emergency_tips": ["concise tip (max 80 chars)"]
}

Rules:
- daily_plan must have exactly ${daysUntilInterview} day entries, max 3 tasks each
- top_questions: exactly 6 questions most likely for this role and company
- readiness_assessment.items: exactly 6 items drawn from the JD requirements
- emergency_tips: exactly 4 tips
- Tasks must be specific and actionable

STRICT SKILL MATCHING RULES for readiness_assessment:

For each skill/technology in the JD:
- Mark as STRONG only if the exact tool or very close equivalent is explicitly mentioned in the candidate's resume
- Mark as NEUTRAL if candidate has transferable experience but NOT the exact tool
  Example: AWS experience does NOT mean Azure experience. They are different.
  SQL Server does NOT mean Azure Synapse.
- Mark as GAP if the tool/skill is not mentioned at all in the resume

SPECIFIC TECHNOLOGY RULES:
- Azure (Azure SQL, Databricks, ADF, Synapse) is DIFFERENT from AWS (Redshift, Glue, S3). Having AWS = NEUTRAL for Azure, not Strong.
- QlikView/QlikSense is different from Tableau/Power BI
- Investment/Asset Management domain knowledge (NAV, AUM, portfolio analytics, MiFID II) is different from general financial services (banking, wealth management)
- Never mark a skill as Strong just because candidate has general cloud or BI experience. Match the SPECIFIC tool/domain mentioned in the JD.

Be honest and slightly conservative. It is better to flag a gap that does not exist than to miss a real gap that will hurt in the interview.

For each gap or neutral item in readiness_assessment, add a note field with:
- What exactly is missing compared to what they have
- How different it is from their existing experience
- Realistic prep time given the difference`,
          }],
        }),
      });
      clearTimeout(prepTimeoutId);
      const data = await response.json();
      const rawText = data.content.map(b => b.text || "").join("");
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      let plan;
      try {
        plan = JSON.parse(cleaned);
      } catch (e) {
        const lastBrace = cleaned.lastIndexOf('"}');
        console.warn("PrepCoach JSON parse failed. Length:", cleaned.length, "Last brace at:", lastBrace, "Error:", e.message);
        throw e;
      }
      setPrepPlan(plan);

      // Step 3: Persist to Supabase
      if (applicationId) {
        await supabase.from("applications").update({
          prep_plan: plan,
          days_until_interview: daysUntilInterview,
        }).eq("id", applicationId);
      }
    }  catch (e) {
      console.error('PrepCoach full error:', e)
      console.error('PrepCoach error message:', e.message)
      setPrepError('Failed: ' + e.message)
    } finally {
      setPrepLoading(false);
    }
  }

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset so re-uploading the same filename triggers onChange again
    e.target.value = "";
    setFileProcessing(true);
    setFileError("");
    setResume("");
    try {
      const name = file.name.toLowerCase();
      let text = "";
      if (name.endsWith(".pdf")) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(
            content.items.map(item => item.str + (item.hasEOL ? "\n" : "")).join("")
          );
        }
        text = pages.join("\n\n");
      } else if (name.endsWith(".doc") || name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        // .txt or any plain-text file
        text = await file.text();
      }
      if (!text.trim()) throw new Error("No text extracted");
      setResume(text);
    } catch {
      setFileError("❌ Could not read this file. Please try copy-pasting your resume text.");
    } finally {
      setFileProcessing(false);
    }
  };

  const handleJDFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setJdFileProcessing(true);
    setJdFileError("");
    setJD("");
    try {
      const name = file.name.toLowerCase();
      let text = "";
      if (name.endsWith(".pdf")) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(
            content.items.map(item => item.str + (item.hasEOL ? "\n" : "")).join("")
          );
        }
        text = pages.join("\n\n");
      } else if (name.endsWith(".doc") || name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }
      if (!text.trim()) throw new Error("No text extracted");
      setJD(text);
    } catch {
      setJdFileError("❌ Could not read this file. Please try copy-pasting the job description.");
    } finally {
      setJdFileProcessing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: "'Syne', sans-serif", color: theme.text, padding: "0", transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.background}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        textarea { resize: vertical; }
        .btn-primary:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .btn-ghost:hover { border-color: ${theme.accent} !important; color: ${theme.accent} !important; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ borderBottom: `1px solid ${theme.border}`, padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: theme.headerBg, position: "sticky", top: 0, zIndex: 100, boxShadow: isDark ? "none" : "0 1px 4px #0000000A" }}>
        <div
          style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
          onClick={() => {
            setStep(0);
            setTailored("");
            setAtsScore(null);
            setOriginalAtsScore(null);
            setChangeSummary(null);
            setGapReport(null);
            setReviewableChanges([]);
            setAcceptedChanges(new Set());
            setIsReviewMode(false);
            setBoldPhrases([]);
            setError("");
            setCoverLetter("");
            setCoverLetterLoading(false);
            setCoverLetterError("");
            setApplicationId(null);
            setIntelligenceLoading(false);
            setPrepPlan(null);
            setPrepLoading(false);
            setPrepError("");
            setDaysUntilInterview(null);
            setHoursPerDay(2);
            setPrepSearchResults([]);
          }}
        >
          <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em" }}>Job<span style={{ color: theme.accent }}>Craft</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tag>Mission HIRED 🔥</Tag>
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}
          >{isDark ? "☀️" : "🌙"}</button>
          <button onClick={onShowProfile} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>👤 My Profile</button>
          <button onClick={onShowHistory} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>📋 History</button>
          <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Sign Out</button>
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: isDark ? "#052e16" : "#ECFDF5",
          border: `1px solid ${theme.accent}60`,
          color: theme.accent, borderRadius: 10, padding: "12px 20px",
          fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600,
          boxShadow: "0 4px 24px #00000030",
          animation: "fadeInUp 0.25s ease",
        }}>
          ✓ {toast}
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "inline-block", background: theme.accent + "12", border: `1px solid ${theme.accent}30`, borderRadius: 20, padding: "6px 16px", fontSize: 12, color: theme.accent, marginBottom: 20, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>STOP SPENDING 25 MIN PER APPLICATION</div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: theme.textStrong, lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 14 }}>
            Tailor your resume to<br />
            <span style={{ color: theme.accent }}>any job in seconds.</span>
          </h1>
          <p style={{ color: theme.textMuted, fontSize: 15, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Paste your resume + job description. AI rewrites it with the right keywords to beat ATS filters.</p>
        </div>

        <StepIndicator current={step} />

        {step === 0 && (
          <div>
            {/* Welcome banner for new users */}
            {showWelcome && (
              <div style={{ background: isDark ? "#0D1F14" : "#F0FDF4", border: `1px solid ${theme.accent}35`, borderRadius: 12, padding: "18px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ color: theme.textStrong, fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Welcome to JobCraft! 👋</p>
                  <p style={{ color: theme.textMuted, fontSize: 13, lineHeight: 1.6 }}>Save your base resume in your profile so it auto-loads every session.</p>
                </div>
                <button
                  onClick={onShowProfile}
                  style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}
                >Set Up Profile →</button>
              </div>
            )}

            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 28, height: 28, background: theme.accent + "20", border: `1px solid ${theme.accent}50`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📄</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.textStrong }}>Your Current Resume</h2>
              </div>

              {/* Source tabs */}
              <div style={{ display: "flex", marginBottom: 20, borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}` }}>
                {[
                  { key: "profile", label: "👤 My Profile Resume" },
                  { key: "paste",   label: "✏️ Paste Text" },
                  { key: "upload",  label: "📁 Upload File" },
                ].map(({ key, label }, i, arr) => (
                  <button
                    key={key}
                    onClick={() => handleSourceChange(key)}
                    style={{
                      flex: 1, background: resumeSource === key ? theme.accent + "18" : "transparent",
                      color: resumeSource === key ? theme.accent : theme.textMuted,
                      border: "none", borderRight: i < arr.length - 1 ? `1px solid ${theme.border}` : "none",
                      padding: "10px 0", fontSize: 12, fontWeight: 600,
                      cursor: "pointer", fontFamily: "'DM Mono', monospace",
                      transition: "all 0.15s",
                    }}
                  >{label}</button>
                ))}
              </div>

              {/* Tab A: Profile Resume */}
              {resumeSource === "profile" && (
                <div>
                  {profileResume ? (
                    <div>
                      <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, minHeight: 120, maxHeight: 220, overflow: "auto" }}>
                        <pre style={{ color: theme.textMuted, fontSize: 12, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {profileResume.slice(0, 600)}{profileResume.length > 600 ? "\n…" : ""}
                        </pre>
                      </div>
                      <p style={{ color: theme.textFaint, fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>
                        {profileResume.length.toLocaleString()} chars ·{" "}
                        <button onClick={onShowProfile} style={{ background: "none", border: "none", color: theme.accent, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace", padding: 0 }}>
                          Edit in Profile →
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "32px 0" }}>
                      <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>No profile resume saved yet.</p>
                      <button onClick={onShowProfile} style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>Set Up Profile →</button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab B: Paste */}
              {resumeSource === "paste" && (
                <textarea
                  value={resume}
                  onChange={e => setResume(e.target.value)}
                  placeholder="Paste your resume text here…"
                  style={{ width: "100%", minHeight: 220, background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, color: theme.text, fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}
                />
              )}

              {/* Tab C: Upload */}
              {resumeSource === "upload" && (
                <div style={{ padding: "28px 0" }}>
                  <div style={{ textAlign: "center" }}>
                    <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFile} style={{ display: "none" }} />
                    <button
                      className="btn-ghost"
                      onClick={() => fileRef.current.click()}
                      disabled={fileProcessing}
                      style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "10px 22px", fontSize: 13, cursor: fileProcessing ? "not-allowed" : "pointer", opacity: fileProcessing ? 0.6 : 1 }}
                    >📁 Upload PDF, DOC or TXT</button>
                    {fileProcessing && (
                      <p style={{ color: theme.textMuted, fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 10 }}>
                        📄 Reading your file…
                      </p>
                    )}
                    {fileError && !fileProcessing && (
                      <p style={{ color: "#FF6B6B", fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 10 }}>
                        {fileError}
                      </p>
                    )}
                  </div>
                  {resume && !fileProcessing && !fileError && (
                    <div style={{ marginTop: 18 }}>
                      <p style={{ color: theme.accent, fontSize: 12, fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
                        ✅ Resume extracted — {resume.length.toLocaleString()} characters
                      </p>
                      <div style={{ background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, minHeight: 100, maxHeight: 200, overflow: "auto" }}>
                        <pre style={{ color: theme.textMuted, fontSize: 12, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {resume.slice(0, 600)}{resume.length > 600 ? "\n…" : ""}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <button className="btn-ghost" onClick={() => { setResume(sampleResume); setResumeSource("paste"); }} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>✨ Load sample</button>
                <button className="btn-primary" onClick={() => setStep(1)} disabled={!resume.trim()} style={{ background: resume.trim() ? theme.accent : theme.border, color: resume.trim() ? theme.background : theme.textFaint, border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: resume.trim() ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>Continue →</button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, background: theme.accent + "20", border: `1px solid ${theme.accent}50`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎯</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: theme.textStrong }}>Job Description</h2>
            </div>
            <textarea value={jd} onChange={e => setJD(e.target.value)} placeholder="Paste the full job description here…" style={{ width: "100%", minHeight: 260, background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, color: theme.text, fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
            <div style={{ marginTop: 12 }}>
              <input ref={jdFileRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleJDFile} style={{ display: "none" }} />
              <button
                className="btn-ghost"
                onClick={() => jdFileRef.current.click()}
                disabled={jdFileProcessing}
                style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "10px 22px", fontSize: 13, cursor: jdFileProcessing ? "not-allowed" : "pointer", opacity: jdFileProcessing ? 0.6 : 1 }}
              >📁 Upload JD (PDF, DOC or TXT)</button>
              {jdFileProcessing && (
                <p style={{ color: theme.textMuted, fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>📄 Reading your file…</p>
              )}
              {jdFileError && !jdFileProcessing && (
                <p style={{ color: "#FF6B6B", fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>{jdFileError}</p>
              )}
              {jd && !jdFileProcessing && !jdFileError && (
                <p style={{ color: theme.accent, fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>
                  ✅ JD extracted — {jd.length.toLocaleString()} characters
                </p>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn-ghost" onClick={() => setJD(sampleJD)} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>✨ Load sample JD</button>
            </div>
            {loading && <LoadingMessages />}
            {error && <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 12 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setStep(0)} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 10, padding: "12px 24px", fontSize: 14, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>← Back</button>
              <button className="btn-primary" onClick={tailorResume} disabled={!jd.trim() || loading} style={{ background: jd.trim() && !loading ? theme.accent : theme.border, color: jd.trim() && !loading ? theme.background : theme.textFaint, border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: jd.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>⚡ Tailor My Resume</button>
            </div>
          </div>
        )}

        {step === 2 && tailored && (
          <div>
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24, marginBottom: 20, display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Row 1: ATS scores */}
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: 6, letterSpacing: "0.08em" }}>ATS MATCH SCORE</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>{originalAtsScore ?? "—"}%</span>
                    <span style={{ fontSize: 18, color: theme.textFaint }}>→</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: theme.accent, fontFamily: "'DM Mono', monospace" }}>{atsScore}%</span>
                    {originalAtsScore != null && atsScore != null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#FFD166", fontFamily: "'DM Mono', monospace", background: "#FFD16618", border: "1px solid #FFD16640", borderRadius: 6, padding: "2px 8px" }}>
                        📈 +{atsScore - originalAtsScore} pts
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>BEFORE</span>
                    <span style={{ fontSize: 10, color: theme.accent, fontFamily: "'DM Mono', monospace" }}>AFTER</span>
                  </div>
                </div>
                <div style={{ borderLeft: `1px solid ${theme.border}`, paddingLeft: 20 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: theme.textStrong }}>{atsScore >= 80 ? "🔥 Excellent!" : atsScore >= 60 ? "✅ Good match" : "⚠️ Needs work"}</p>
                </div>
              </div>

              {/* Row 2: Template selector + Download button */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>Choose Resume Template</p>
                  <div style={{ display: "flex", gap: 10 }}>
                    {RESUME_TEMPLATES.map(({ key, label, preview }) => (
                      <div
                        key={key}
                        onClick={() => setSelectedTemplate(key)}
                        style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}
                      >
                        <div style={{ width: 80, height: 100, border: `2px solid ${selectedTemplate === key ? theme.accent : theme.border}`, borderRadius: 8, overflow: "hidden", transition: "border-color 0.15s" }}>
                          {preview}
                        </div>
                        <span style={{ fontSize: 10, color: selectedTemplate === key ? theme.accent : theme.textMuted, fontFamily: "'DM Mono', monospace", fontWeight: selectedTemplate === key ? 700 : 400, letterSpacing: "0.04em" }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const html = generateResumeHTML(tailored, profileLocation, boldPhrases, selectedTemplate, jobTitle);
                    const tab = window.open("", "_blank");
                    tab.document.write(html);
                    tab.document.close();
                  }}
                  style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}
                >
                  ⬇ Preview &amp; Download PDF
                </button>
              </div>
            </div>

            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ borderBottom: `1px solid ${theme.border}`, display: "flex" }}>
                {["diff", "gap", "review", "tailored", "cover", "prep", "feedback"].map(tab => {
                  const spin = intelligenceLoading && (tab === "diff" || tab === "gap" || tab === "review");
                  const label = tab === "diff" ? "📊 Changes" : tab === "gap" ? "🔍 Gap Report" : tab === "review" ? "✏️ Review" : tab === "tailored" ? "📄 New Resume" : tab === "cover" ? "✉️ Cover Letter" : tab === "prep" ? "🎯 PrepCoach" : "💬 Refine";
                  return (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", padding: "14px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: activeTab === tab ? theme.accent : theme.textFaint, borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : "2px solid transparent", fontFamily: "'Syne', sans-serif", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                      {label}{spin && <span style={{ fontSize: 11, opacity: 0.7, animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>}
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: 24 }}>
                {activeTab === "diff" && (
                  intelligenceLoading
                    ? <div style={{ textAlign: "center", padding: "40px 0", color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>⟳ Generating analysis… (~15 seconds)</div>
                    : <ChangeSummary changeSummary={changeSummary} original={resume} tailored={tailored} />
                )}
                {activeTab === "gap" && (
                  intelligenceLoading
                    ? <div style={{ textAlign: "center", padding: "40px 0", color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>⟳ Generating analysis… (~15 seconds)</div>
                    : <GapReport gapReport={gapReport} originalAtsScore={originalAtsScore} atsScore={atsScore} />
                )}
                {activeTab === "review" && (
                  intelligenceLoading
                    ? <div style={{ textAlign: "center", padding: "40px 0", color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>⟳ Generating analysis… (~15 seconds)</div>
                    : <ReviewMode
                        reviewableChanges={reviewableChanges}
                        acceptedChanges={acceptedChanges}
                        setAcceptedChanges={setAcceptedChanges}
                        originalAtsScore={originalAtsScore}
                        atsScore={atsScore}
                        onApplyChoices={regenerateWithChoices}
                        loading={loading}
                      />
                )}
                {activeTab === "tailored" && (
                  <div>
                    <p style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8, fontFamily: "'DM Mono', monospace" }}>
                      ✏️ You can edit your resume directly here. Changes will reflect in your PDF download.
                    </p>
                    <textarea
                      value={tailored}
                      onChange={e => setTailored(e.target.value)}
                      style={{ width: "100%", minHeight: 500, background: theme.background, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 16, color: theme.text, fontSize: 12.5, fontFamily: "'DM Mono', monospace", lineHeight: 1.9, resize: "vertical" }}
                    />
                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button
                        onClick={async () => {
                          if (applicationId) {
                            await supabase.from("applications").update({ tailored_resume: tailored }).eq("id", applicationId);
                          }
                          setResumeSaved(true);
                          setTimeout(() => setResumeSaved(false), 2000);
                        }}
                        style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", transition: "all 0.2s" }}
                      >
                        {resumeSaved ? "Saved ✓" : "💾 Save Changes"}
                      </button>
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          if (window.confirm("Reset to original AI version? Your edits will be lost.")) {
                            setTailored(originalTailored);
                          }
                        }}
                        style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
                      >
                        🔄 Reset to AI version
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === "cover" && (
                  <div>
                    {!coverLetter && !coverLetterLoading && (
                      <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 24, lineHeight: 1.7 }}>
                          Generate a tailored cover letter for <strong style={{ color: theme.textStrong }}>{jobTitle || "this role"}</strong>
                          {companyName ? <> at <strong style={{ color: theme.textStrong }}>{companyName}</strong></> : ""}.
                        </p>
                        <button
                          onClick={generateCoverLetter}
                          style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 10, padding: "13px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}
                        >
                          ✨ Generate Cover Letter
                        </button>
                        {coverLetterError && (
                          <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 16 }}>{coverLetterError}</p>
                        )}
                      </div>
                    )}

                    {coverLetterLoading && (
                      <LoadingMessages
                        customMessages={COVER_MESSAGES}
                        customPills={COVER_PILLS}
                        rightLabel="Cover Letter"
                        showAts={false}
                      />
                    )}

                    {coverLetter && !coverLetterLoading && (
                      <div>
                        <div style={{
                          background: theme.cardAlt,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 12,
                          padding: 32,
                          fontFamily: "Georgia, serif",
                          fontSize: 14,
                          lineHeight: 1.8,
                          color: theme.text,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}>
                          {coverLetter}
                        </div>
                        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(coverLetter);
                              setCoverLetterCopied(true);
                              setTimeout(() => setCoverLetterCopied(false), 2000);
                            }}
                            style={{
                              background: coverLetterCopied ? theme.accent : "transparent",
                              color: coverLetterCopied ? theme.background : theme.textMuted,
                              border: `1px solid ${coverLetterCopied ? theme.accent : theme.border}`,
                              borderRadius: 8, padding: "9px 18px", fontSize: 13,
                              cursor: "pointer", fontFamily: "'DM Mono', monospace",
                              transition: "all 0.2s",
                            }}
                          >
                            {coverLetterCopied ? "✓ Copied!" : "📋 Copy to Clipboard"}
                          </button>
                          <button
                            onClick={() => {
                              const candidateName = tailored.split("\n")[0].split("|")[0].trim();
                              const html = generateCoverLetterHTML(coverLetter, candidateName);
                              const tab = window.open("", "_blank");
                              if (tab) { tab.document.write(html); tab.document.close(); }
                            }}
                            style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
                          >
                            🖨️ Print / Save as PDF
                          </button>
                          <button
                            onClick={() => { setCoverLetter(""); setCoverLetterError(""); }}
                            style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "9px 18px", fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
                          >
                            🔄 Regenerate
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "prep" && (
                  <PrepCoach
                    prepPlan={prepPlan}
                    prepLoading={prepLoading}
                    prepError={prepError}
                    daysUntilInterview={daysUntilInterview}
                    hoursPerDay={hoursPerDay}
                    onDaysChange={setDaysUntilInterview}
                    onHoursChange={setHoursPerDay}
                    onGenerate={generatePrepPlan}
                    jobTitle={jobTitle}
                    companyName={companyName}
                  />
                )}

                {activeTab === "feedback" && (
                  <div>
                    <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>Tell the AI what to fix and it'll refine the resume.</p>
                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder='e.g. "Add more emphasis on leadership experience"' style={{ width: "100%", minHeight: 100, background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14, color: theme.text, fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
                    {loading && <LoadingMessages isRefine />}
                    {error && <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 8 }}>{error}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <button className="btn-primary" onClick={refineWithFeedback} disabled={!feedback.trim() || loading} style={{ background: feedback.trim() && !loading ? theme.accent : theme.border, color: feedback.trim() && !loading ? theme.background : theme.textFaint, border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: feedback.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>✨ Refine</button>
                      <button className="btn-ghost" onClick={() => { setStep(0); setTailored(""); setAtsScore(null); setOriginalAtsScore(null); setJobTitle(""); setCompanyName(""); setResume(""); setJD(""); setChangeSummary(null); setGapReport(null); setReviewableChanges([]); setAcceptedChanges(new Set()); setIsReviewMode(false); setIntelligenceLoading(false); }} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 10, padding: "11px 22px", fontSize: 14, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>Start Over</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textFaint, marginTop: 48, fontFamily: "'DM Mono', monospace" }}>© 2026 JobCraft AI · All rights reserved</p>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession]           = useState(undefined);
  const [showHistory, setShowHistory]   = useState(false);
  const [showProfile, setShowProfile]   = useState(false);
  const [isDark, setIsDark]             = useState(() => {
    const saved = localStorage.getItem("jobcraft-theme");
    return saved ? saved === "dark" : true;
  });

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  function toggleTheme() {
    setIsDark(prev => {
      const next = !prev;
      localStorage.setItem("jobcraft-theme", next ? "dark" : "light");
      return next;
    });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
  }

  if (session === undefined) return null;
  if (!session) return <Login />;

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {showHistory ? (
        <History
          session={session}
          onBack={() => setShowHistory(false)}
          onLogout={handleLogout}
        />
      ) : showProfile ? (
        <Profile
          session={session}
          onBack={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      ) : (
        <JobCraft
          session={session}
          onLogout={handleLogout}
          onShowHistory={() => setShowHistory(true)}
          onShowProfile={() => setShowProfile(true)}
        />
      )}
    </ThemeContext.Provider>
  );
}