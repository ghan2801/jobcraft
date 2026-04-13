import { useState, useRef, useEffect } from "react";
import { generateResumeHTML } from "./ResumeHTML";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import History from "./History";
import Profile from "./Profile";
import DiffView from "./DiffView";
import ChangeSummary from "./ChangeSummary";
import GapReport from "./GapReport";
import ReviewMode from "./ReviewMode";
import { ThemeContext, DARK_THEME, LIGHT_THEME, useTheme } from "./ThemeContext";

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
  "Reading your resume carefully…",
  "Analyzing the job description…",
  "Identifying keyword gaps…",
  "Injecting ATS-optimized terms…",
  "Reframing your experience bullets…",
  "Scoring your match against the JD…",
  "Polishing the final resume…",
  "Almost done — running final checks…",
];

function LoadingMessages({ isRefine = false }) {
  const { theme, isDark } = useTheme();
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const startTime = useRef(Date.now());

  // Message cycling: 0-3 play through, then 4-7 loop
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex(prev => {
          if (prev < LOADER_MESSAGES.length - 1) return prev + 1;
          return 4; // loop back to message 5 (index 4)
        });
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // Progress bar: 0→85% over 20 seconds
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      const p = Math.min(85, (elapsed / 20) * 85);
      setProgress(p);
    }, 100);
    return () => clearInterval(id);
  }, []);

  const msg = isRefine ? LOADER_MESSAGES[msgIndex].replace("Tailoring", "Refining") : LOADER_MESSAGES[msgIndex];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "36px 0" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeMsg { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        .loader-msg { animation: fadeMsg 0.3s ease; }
      `}</style>
      {/* Spinner ring */}
      <div style={{
        width: 40, height: 40,
        border: `3px solid ${theme.border}`,
        borderTop: `3px solid ${theme.accent}`,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        flexShrink: 0,
      }} />
      {/* Message */}
      <p
        key={msgIndex}
        className="loader-msg"
        style={{
          color: theme.text, fontSize: 14, fontFamily: "'DM Mono', monospace",
          fontWeight: 500, textAlign: "center",
          opacity: fade ? 1 : 0, transition: "opacity 0.3s",
        }}
      >{msg}</p>
      {/* Progress bar */}
      <div style={{ width: "100%", maxWidth: 320, height: 4, background: theme.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: theme.accent,
          borderRadius: 4, transition: "width 0.15s linear",
        }} />
      </div>
      {/* Subtext */}
      <p style={{ color: theme.textFaint, fontSize: 11, fontFamily: "'DM Mono', monospace", textAlign: "center" }}>
        This usually takes 15–20 seconds
      </p>
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

function JobCraft({ session, onLogout, onShowHistory, onShowProfile }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState("");
  const [jd, setJD] = useState("");
  const [tailored, setTailored] = useState("");
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
  const fileRef = useRef();

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
      await supabase.from("applications").insert({
        user_id:            session.user.id,
        company_name:       company,
        job_title:          title,
        original_ats_score: origAtsScore,
        tailored_ats_score: newAtsScore,
        tailored_resume:    tailoredResume,
        original_resume:    resume,
        job_description:    jd,
        status:             "Applied",
      });
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

  async function tailorResume() {
   
    
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
          max_tokens: 8000,
          messages: [{
            role: "user",
            content: `You are an expert resume coach and ATS optimization specialist.

TASK: Tailor the resume below to match the job description. Return ONLY a JSON object with no markdown, no backticks, nothing else.

JSON format:
{
  "original_ats_score": <number 0-100>,
  "tailored_resume": "the full tailored resume text",
  "ats_score": <number 0-100>,
  "key_changes": ["change 1", "change 2", "change 3"],
  "job_title": "exact job title from the JD",
  "company_name": "company name from the JD",
  "change_summary": {
    "title_change": {
      "from": "original job title in resume",
      "to": "new job title in tailored resume",
      "reason": "why this was changed"
    },
    "keywords_added": [
      {
        "keyword": "keyword name",
        "added_where": "e.g. Skills section",
        "reason": "e.g. appears 3 times in JD"
      }
    ],
    "sections_reframed": [
      {
        "section": "section name",
        "change": "what changed",
        "reason": "why"
      }
    ],
    "removed_or_deemphasized": [
      {
        "item": "what was removed or toned down",
        "reason": "why it was de-emphasized"
      }
    ],
    "overall_strategy": "one sentence explaining the overall tailoring approach"
  },
  "gap_report": {
    "original_score_reason": "one sentence explaining why the original resume scored low",
    "strong_matches": ["skill or keyword that already matched well"],
    "keywords_added": [
      {
        "keyword": "keyword name",
        "frequency_in_jd": <number>,
        "added_to_resume": true,
        "added_where": "e.g. Skills and Summary sections"
      }
    ],
    "skills_still_missing": [
      {
        "skill": "skill name",
        "frequency_in_jd": <number>,
        "importance": "critical/moderate/minor",
        "reason": "why this matters for the role"
      }
    ],
    "job_fit_score": "high/moderate/low",
    "job_fit_reason": "one sentence explaining the fit assessment",
    "recommended_action": "apply_confidently/apply_with_preparation/consider_skipping"
  },
  "reviewable_changes": [
    {
      "id": "change_1",
      "type": "title_change/keyword_added/section_reframed/skill_added",
      "description": "short description of this specific change",
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
- change_summary = detailed breakdown of every meaningful change made
- gap_report = keyword gap analysis comparing resume against JD requirements
- reviewable_changes = list of 5-12 individual changes the user can accept/reject, each with ats_impact (how many ATS points that change contributes)

Rules:
- Keep the same structure and format as the original resume
- Inject relevant keywords from the JD naturally
- Do not fabricate experience
- Improve bullet points to match JD language

ORIGINAL RESUME:
${resume}

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
      setOriginalAtsScore(parsed.original_ats_score);
      setJobTitle(parsed.job_title || "");
      setCompanyName(parsed.company_name || "");
      setChangeSummary(parsed.change_summary || null);
      setGapReport(parsed.gap_report || null);
      const rc = parsed.reviewable_changes || [];
      setReviewableChanges(rc);
      setAcceptedChanges(new Set(rc.map(c => c.id)));
      setStep(2);
      // Save immediately using parsed values — state setters above are async
      saveApplication({
        tailoredResume: parsed.tailored_resume,
        origAtsScore:   parsed.original_ats_score,
        newAtsScore:    parsed.ats_score,
        title:          parsed.job_title   || "",
        company:        parsed.company_name || "",
      });
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
      setAtsScore(parsed.ats_score);
      setActiveTab("tailored");
    } catch {
      setError("Regeneration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setResume(ev.target.result);
    reader.readAsText(file);
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
      `}</style>

      <div style={{ borderBottom: `1px solid ${theme.border}`, padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: theme.headerBg, position: "sticky", top: 0, zIndex: 100, boxShadow: isDark ? "none" : "0 1px 4px #0000000A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                <div style={{ textAlign: "center", padding: "36px 0" }}>
                  <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFile} style={{ display: "none" }} />
                  <button
                    className="btn-ghost"
                    onClick={() => fileRef.current.click()}
                    style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "10px 22px", fontSize: 13, cursor: "pointer" }}
                  >📁 Choose .txt / .md file</button>
                  {resume && (
                    <p style={{ color: theme.accent, fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 12 }}>
                      ✓ File loaded ({resume.length.toLocaleString()} chars)
                    </p>
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
            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 24, marginBottom: 20, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
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
              <button
                className="btn-primary"
                onClick={() => {
                  const html = generateResumeHTML(tailored, profileLocation);
                  const tab = window.open("", "_blank");
                  tab.document.write(html);
                  tab.document.close();
                }}
                style={{ marginLeft: "auto", background: theme.accent, color: theme.background, border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}
              >
                ⬇ Preview &amp; Download PDF
              </button>
            </div>

            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ borderBottom: `1px solid ${theme.border}`, display: "flex" }}>
                {["diff", "gap", "review", "tailored", "feedback"].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", padding: "14px 18px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: activeTab === tab ? theme.accent : theme.textFaint, borderBottom: activeTab === tab ? `2px solid ${theme.accent}` : "2px solid transparent", fontFamily: "'Syne', sans-serif" }}>
                    {tab === "diff" ? "📊 Changes" : tab === "gap" ? "🔍 Gap Report" : tab === "review" ? "✏️ Review" : tab === "tailored" ? "📄 New Resume" : "💬 Refine"}
                  </button>
                ))}
              </div>
              <div style={{ padding: 24 }}>
                {activeTab === "diff" && <ChangeSummary changeSummary={changeSummary} original={resume} tailored={tailored} />}
                {activeTab === "gap" && <GapReport gapReport={gapReport} originalAtsScore={originalAtsScore} atsScore={atsScore} />}
                {activeTab === "review" && (
                  <ReviewMode
                    reviewableChanges={reviewableChanges}
                    acceptedChanges={acceptedChanges}
                    setAcceptedChanges={setAcceptedChanges}
                    originalAtsScore={originalAtsScore}
                    atsScore={atsScore}
                    onApplyChoices={regenerateWithChoices}
                    loading={loading}
                  />
                )}
                {activeTab === "tailored" && <pre style={{ color: theme.text, fontSize: 12.5, fontFamily: "'DM Mono', monospace", lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{tailored}</pre>}
                {activeTab === "feedback" && (
                  <div>
                    <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>Tell the AI what to fix and it'll refine the resume.</p>
                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder='e.g. "Add more emphasis on leadership experience"' style={{ width: "100%", minHeight: 100, background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 10, padding: 14, color: theme.text, fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
                    {loading && <LoadingMessages isRefine />}
                    {error && <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 8 }}>{error}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <button className="btn-primary" onClick={refineWithFeedback} disabled={!feedback.trim() || loading} style={{ background: feedback.trim() && !loading ? theme.accent : theme.border, color: feedback.trim() && !loading ? theme.background : theme.textFaint, border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: feedback.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>✨ Refine</button>
                      <button className="btn-ghost" onClick={() => { setStep(0); setTailored(""); setAtsScore(null); setOriginalAtsScore(null); setJobTitle(""); setCompanyName(""); setResume(""); setJD(""); setChangeSummary(null); setGapReport(null); setReviewableChanges([]); setAcceptedChanges(new Set()); setIsReviewMode(false); }} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 10, padding: "11px 22px", fontSize: 14, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>Start Over</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textFaint, marginTop: 48, fontFamily: "'DM Mono', monospace" }}>Mission HIRED 🔥 · Built by Ghanshyam · Powered by Claude</p>
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