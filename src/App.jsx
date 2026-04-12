import { useState, useRef, useEffect } from "react";
import { generateResumeHTML } from "./ResumeHTML";
import { supabase } from "./supabaseClient";
import Login from "./Login";
import History from "./History";
import Profile from "./Profile";
import DiffView from "./DiffView";
import ChangeSummary from "./ChangeSummary";
import GapReport from "./GapReport";

const ACCENT = "#00E5A0";
const DARK = "#0A0F1E";
const CARD = "#111827";
const BORDER = "#1E2D40";

function Tag({ children, color = ACCENT }) {
  return (
    <span style={{
      background: color + "18",
      color: color,
      border: `1px solid ${color}40`,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontFamily: "'DM Mono', monospace",
      fontWeight: 500,
      letterSpacing: "0.05em",
    }}>{children}</span>
  );
}



function Spinner() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "40px 0" }}>
      <div style={{
        width: 44, height: 44,
        border: `3px solid ${BORDER}`,
        borderTop: `3px solid ${ACCENT}`,
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "#6B7FA3", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>Tailoring your resume…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}



function StepIndicator({ current }) {
  const steps = ["Upload Resume", "Paste JD", "Review & Apply"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 36 }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: i < current ? ACCENT : i === current ? ACCENT : BORDER,
              color: i <= current ? DARK : "#4B5A70",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 700, fontFamily: "'DM Mono', monospace",
              boxShadow: i === current ? `0 0 0 4px ${ACCENT}25` : "none",
              transition: "all 0.3s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i <= current ? "#CBD5E1" : "#4B5A70", fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap", letterSpacing: "0.05em" }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: 1, background: i < current ? ACCENT : BORDER, margin: "0 8px", marginBottom: 20, transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

function JobCraft({ session, onLogout, onShowHistory, onShowProfile }) {
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
  const [resumeSource, setResumeSource] = useState("paste");
  const [showWelcome, setShowWelcome] = useState(false);
  const [changeSummary, setChangeSummary] = useState(null);
  const [gapReport, setGapReport] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("base_resume")
        .eq("id", session.user.id)
        .single();
      if (data?.base_resume) {
        setProfileResume(data.base_resume);
        setResume(data.base_resume);
        setResumeSource("profile");
      } else {
        setShowWelcome(true);
      }
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
          max_tokens: 6000,
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
  }
}

Where:
- original_ats_score = how well the ORIGINAL resume matches the JD (before any changes)
- ats_score = how well the TAILORED resume matches the JD (after optimization)
- job_title = the job title as stated in the JD (e.g. "Senior Software Engineer")
- company_name = the hiring company name as stated in the JD (e.g. "Acme Corp")
- change_summary = detailed breakdown of every meaningful change made
- gap_report = keyword gap analysis comparing resume against JD requirements

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

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setResume(ev.target.result);
    reader.readAsText(file);
  };

  return (
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Syne', sans-serif", color: "#CBD5E1", padding: "0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0F1E; }
        ::-webkit-scrollbar-thumb { background: #1E2D40; border-radius: 3px; }
        textarea { resize: vertical; }
        .btn-primary:hover { background: #00FFB3 !important; transform: translateY(-1px); }
        .btn-ghost:hover { border-color: ${ACCENT} !important; color: ${ACCENT} !important; }
      `}</style>

      <div style={{ borderBottom: `1px solid ${BORDER}`, padding: "18px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#090E1C", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: ACCENT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Job<span style={{ color: ACCENT }}>Craft</span></span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Tag color={ACCENT}>Mission HIRED 🔥</Tag>
          <button onClick={onShowProfile} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>👤 My Profile</button>
          <button onClick={onShowHistory} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>📋 History</button>
          <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>Sign Out</button>
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 999,
          background: "#052e16", border: "1px solid #00E5A060",
          color: "#00E5A0", borderRadius: 10, padding: "12px 20px",
          fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600,
          boxShadow: "0 4px 24px #00000060",
          animation: "fadeInUp 0.25s ease",
        }}>
          ✓ {toast}
        </div>
      )}
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 52 }}>
          <div style={{ display: "inline-block", background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, borderRadius: 20, padding: "6px 16px", fontSize: 12, color: ACCENT, marginBottom: 20, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>STOP SPENDING 25 MIN PER APPLICATION</div>
          <h1 style={{ fontSize: 42, fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.03em", marginBottom: 14 }}>
            Tailor your resume to<br />
            <span style={{ color: ACCENT }}>any job in seconds.</span>
          </h1>
          <p style={{ color: "#6B7FA3", fontSize: 15, maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>Paste your resume + job description. AI rewrites it with the right keywords to beat ATS filters.</p>
        </div>

        <StepIndicator current={step} />

        {step === 0 && (
          <div>
            {/* Welcome banner for new users */}
            {showWelcome && (
              <div style={{ background: "#0D1F14", border: `1px solid ${ACCENT}35`, borderRadius: 12, padding: "18px 24px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ color: "#fff", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Welcome to JobCraft! 👋</p>
                  <p style={{ color: "#6B7FA3", fontSize: 13, lineHeight: 1.6 }}>Save your base resume in your profile so it auto-loads every session.</p>
                </div>
                <button
                  onClick={onShowProfile}
                  style={{ background: ACCENT, color: DARK, border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", whiteSpace: "nowrap" }}
                >Set Up Profile →</button>
              </div>
            )}

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 28, height: 28, background: `${ACCENT}20`, border: `1px solid ${ACCENT}50`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📄</div>
                <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Your Current Resume</h2>
              </div>

              {/* Source tabs */}
              <div style={{ display: "flex", marginBottom: 20, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
                {[
                  { key: "profile", label: "👤 My Profile Resume" },
                  { key: "paste",   label: "✏️ Paste Text" },
                  { key: "upload",  label: "📁 Upload File" },
                ].map(({ key, label }, i, arr) => (
                  <button
                    key={key}
                    onClick={() => handleSourceChange(key)}
                    style={{
                      flex: 1, background: resumeSource === key ? `${ACCENT}18` : "transparent",
                      color: resumeSource === key ? ACCENT : "#6B7FA3",
                      border: "none", borderRight: i < arr.length - 1 ? `1px solid ${BORDER}` : "none",
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
                      <div style={{ background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, minHeight: 120, maxHeight: 220, overflow: "auto" }}>
                        <pre style={{ color: "#6B7FA3", fontSize: 12, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {profileResume.slice(0, 600)}{profileResume.length > 600 ? "\n…" : ""}
                        </pre>
                      </div>
                      <p style={{ color: "#4B5A70", fontSize: 11, fontFamily: "'DM Mono', monospace", marginTop: 8 }}>
                        {profileResume.length.toLocaleString()} chars ·{" "}
                        <button onClick={onShowProfile} style={{ background: "none", border: "none", color: ACCENT, fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace", padding: 0 }}>
                          Edit in Profile →
                        </button>
                      </p>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "32px 0" }}>
                      <p style={{ color: "#6B7FA3", fontSize: 13, marginBottom: 16 }}>No profile resume saved yet.</p>
                      <button onClick={onShowProfile} style={{ background: ACCENT, color: DARK, border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>Set Up Profile →</button>
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
                  style={{ width: "100%", minHeight: 220, background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, color: "#CBD5E1", fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }}
                />
              )}

              {/* Tab C: Upload */}
              {resumeSource === "upload" && (
                <div style={{ textAlign: "center", padding: "36px 0" }}>
                  <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFile} style={{ display: "none" }} />
                  <button
                    className="btn-ghost"
                    onClick={() => fileRef.current.click()}
                    style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "10px 22px", fontSize: 13, cursor: "pointer" }}
                  >📁 Choose .txt / .md file</button>
                  {resume && (
                    <p style={{ color: ACCENT, fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 12 }}>
                      ✓ File loaded ({resume.length.toLocaleString()} chars)
                    </p>
                  )}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20 }}>
                <button className="btn-ghost" onClick={() => { setResume(sampleResume); setResumeSource("paste"); }} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>✨ Load sample</button>
                <button className="btn-primary" onClick={() => setStep(1)} disabled={!resume.trim()} style={{ background: resume.trim() ? ACCENT : BORDER, color: resume.trim() ? DARK : "#4B5A70", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: resume.trim() ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>Continue →</button>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, background: `${ACCENT}20`, border: `1px solid ${ACCENT}50`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🎯</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Job Description</h2>
            </div>
            <textarea value={jd} onChange={e => setJD(e.target.value)} placeholder="Paste the full job description here…" style={{ width: "100%", minHeight: 260, background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, color: "#CBD5E1", fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button className="btn-ghost" onClick={() => setJD(sampleJD)} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>✨ Load sample JD</button>
            </div>
            {loading && <Spinner />}
            {error && <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 12 }}>{error}</p>}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              <button className="btn-ghost" onClick={() => setStep(0)} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 10, padding: "12px 24px", fontSize: 14, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>← Back</button>
              <button className="btn-primary" onClick={tailorResume} disabled={!jd.trim() || loading} style={{ background: jd.trim() && !loading ? ACCENT : BORDER, color: jd.trim() && !loading ? DARK : "#4B5A70", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: jd.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>⚡ Tailor My Resume</button>
            </div>
          </div>
        )}

        {step === 2 && tailored && (
          <div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 24, marginBottom: 20, display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div>
                  <p style={{ fontSize: 11, color: "#6B7FA3", fontFamily: "'DM Mono', monospace", marginBottom: 6, letterSpacing: "0.08em" }}>ATS MATCH SCORE</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>{originalAtsScore ?? "—"}%</span>
                    <span style={{ fontSize: 18, color: "#4B5A70" }}>→</span>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT, fontFamily: "'DM Mono', monospace" }}>{atsScore}%</span>
                    {originalAtsScore != null && atsScore != null && (
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#FFD166", fontFamily: "'DM Mono', monospace", background: "#FFD16618", border: "1px solid #FFD16640", borderRadius: 6, padding: "2px 8px" }}>
                        📈 +{atsScore - originalAtsScore} pts
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>BEFORE</span>
                    <span style={{ fontSize: 10, color: ACCENT, fontFamily: "'DM Mono', monospace" }}>AFTER</span>
                  </div>
                </div>
                <div style={{ borderLeft: `1px solid ${BORDER}`, paddingLeft: 20 }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{atsScore >= 80 ? "🔥 Excellent!" : atsScore >= 60 ? "✅ Good match" : "⚠️ Needs work"}</p>
                </div>
              </div>
              <button
                className="btn-primary"
                onClick={() => {
                  const html = generateResumeHTML(tailored);
                  const tab = window.open("", "_blank");
                  tab.document.write(html);
                  tab.document.close();
                }}
                style={{ marginLeft: "auto", background: ACCENT, color: DARK, border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}
              >
                ⬇ Preview &amp; Download PDF
              </button>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ borderBottom: `1px solid ${BORDER}`, display: "flex" }}>
                {["diff", "gap", "tailored", "feedback"].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", padding: "14px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: activeTab === tab ? ACCENT : "#4B5A70", borderBottom: activeTab === tab ? `2px solid ${ACCENT}` : "2px solid transparent", fontFamily: "'Syne', sans-serif" }}>
                    {tab === "diff" ? "📊 Changes" : tab === "gap" ? "🔍 Gap Report" : tab === "tailored" ? "📄 New Resume" : "💬 Refine"}
                  </button>
                ))}
              </div>
              <div style={{ padding: 24 }}>
                {activeTab === "diff" && <ChangeSummary changeSummary={changeSummary} original={resume} tailored={tailored} />}
                {activeTab === "gap" && <GapReport gapReport={gapReport} originalAtsScore={originalAtsScore} atsScore={atsScore} />}
                {activeTab === "tailored" && <pre style={{ color: "#CBD5E1", fontSize: 12.5, fontFamily: "'DM Mono', monospace", lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{tailored}</pre>}
                {activeTab === "feedback" && (
                  <div>
                    <p style={{ color: "#6B7FA3", fontSize: 13, marginBottom: 16 }}>Tell the AI what to fix and it'll refine the resume.</p>
                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder='e.g. "Add more emphasis on leadership experience"' style={{ width: "100%", minHeight: 100, background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, color: "#CBD5E1", fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
                    {loading && <Spinner />}
                    {error && <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 8 }}>{error}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <button className="btn-primary" onClick={refineWithFeedback} disabled={!feedback.trim() || loading} style={{ background: feedback.trim() && !loading ? ACCENT : BORDER, color: feedback.trim() && !loading ? DARK : "#4B5A70", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: feedback.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>✨ Refine</button>
                      <button className="btn-ghost" onClick={() => { setStep(0); setTailored(""); setAtsScore(null); setOriginalAtsScore(null); setJobTitle(""); setCompanyName(""); setResume(""); setJD(""); setChangeSummary(null); setGapReport(null); }} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 10, padding: "11px 22px", fontSize: 14, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>Start Over</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#2D3D52", marginTop: 48, fontFamily: "'DM Mono', monospace" }}>Mission HIRED 🔥 · Built by Ghanshyam · Powered by Claude</p>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession]           = useState(undefined);
  const [showHistory, setShowHistory]   = useState(false);
  const [showProfile, setShowProfile]   = useState(false);

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

  if (showHistory) {
    return (
      <History
        session={session}
        onBack={() => setShowHistory(false)}
        onLogout={handleLogout}
      />
    );
  }

  if (showProfile) {
    return (
      <Profile
        session={session}
        onBack={() => setShowProfile(false)}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <JobCraft
      session={session}
      onLogout={handleLogout}
      onShowHistory={() => setShowHistory(true)}
      onShowProfile={() => setShowProfile(true)}
    />
  );
}