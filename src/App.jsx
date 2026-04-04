import { useState, useRef } from "react";

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

function DiffView({ original, tailored }) {
  const origLines = original.split("\n");
  const tailLines = tailored.split("\n");
  const maxLen = Math.max(origLines.length, tailLines.length);
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i] ?? "";
    const t = tailLines[i] ?? "";
    const changed = o.trim() !== t.trim();
    rows.push({ o, t, changed });
  }
  const changes = rows.filter(r => r.changed).length;
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>Resume Diff</span>
        <Tag color="#FF6B6B">{changes} lines changed</Tag>
        <Tag color={ACCENT}>ATS Optimized</Tag>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
        <div style={{ background: "#0D1117", padding: "10px 14px", borderBottom: `2px solid #FF6B6B40` }}>
          <span style={{ fontSize: 11, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>ORIGINAL</span>
        </div>
        <div style={{ background: "#0D1117", padding: "10px 14px", borderBottom: `2px solid ${ACCENT}40` }}>
          <span style={{ fontSize: 11, color: ACCENT, fontFamily: "'DM Mono', monospace" }}>TAILORED</span>
        </div>
        {rows.map((row, i) => (
          <>
            <div key={`o-${i}`} style={{
              background: row.changed ? "#FF6B6B0A" : "#0A0F1E",
              padding: "4px 14px",
              borderRight: `1px solid ${BORDER}`,
              borderLeft: row.changed ? "3px solid #FF6B6B" : "3px solid transparent",
            }}>
              <span style={{ fontSize: 12, color: row.changed ? "#FF9999" : "#4B5A70", fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{row.o || " "}</span>
            </div>
            <div key={`t-${i}`} style={{
              background: row.changed ? `${ACCENT}08` : "#0A0F1E",
              padding: "4px 14px",
              borderLeft: row.changed ? `3px solid ${ACCENT}` : "3px solid transparent",
            }}>
              <span style={{ fontSize: 12, color: row.changed ? ACCENT : "#4B5A70", fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{row.t || " "}</span>
            </div>
          </>
        ))}
      </div>
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

export default function JobCraft() {
  const [step, setStep] = useState(0);
  const [resume, setResume] = useState("");
  const [jd, setJD] = useState("");
  const [tailored, setTailored] = useState("");
  const [atsScore, setAtsScore] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [activeTab, setActiveTab] = useState("diff");
  const fileRef = useRef();

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
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-allow-browser": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `You are an expert resume coach and ATS optimization specialist.

TASK: Tailor the resume below to match the job description. Return ONLY a JSON object with no markdown, no backticks, nothing else.

JSON format:
{
  "tailored_resume": "the full tailored resume text",
  "ats_score": <number 0-100>,
  "key_changes": ["change 1", "change 2", "change 3"]
}

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
      setStep(2);
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
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-allow-browser": "true"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
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
        <Tag color={ACCENT}>Mission HIRED 🔥</Tag>
      </div>

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
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ width: 28, height: 28, background: `${ACCENT}20`, border: `1px solid ${ACCENT}50`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>📄</div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>Your Current Resume</h2>
            </div>
            <textarea value={resume} onChange={e => setResume(e.target.value)} placeholder="Paste your resume text here…" style={{ width: "100%", minHeight: 220, background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 16, color: "#CBD5E1", fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFile} style={{ display: "none" }} />
              <button className="btn-ghost" onClick={() => fileRef.current.click()} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>📁 Upload .txt</button>
              <button className="btn-ghost" onClick={() => setResume(sampleResume)} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "8px 16px", fontSize: 13, cursor: "pointer" }}>✨ Load sample</button>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button className="btn-primary" onClick={() => setStep(1)} disabled={!resume.trim()} style={{ background: resume.trim() ? ACCENT : BORDER, color: resume.trim() ? DARK : "#4B5A70", border: "none", borderRadius: 10, padding: "12px 28px", fontSize: 14, fontWeight: 700, cursor: resume.trim() ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>Continue →</button>
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
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 70, height: 70, borderRadius: "50%", background: `conic-gradient(${ACCENT} ${(atsScore || 0) * 3.6}deg, ${BORDER} 0deg)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 54, height: 54, borderRadius: "50%", background: CARD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: ACCENT }}>{atsScore}%</span>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: 12, color: "#6B7FA3", fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>ATS MATCH SCORE</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: "#fff" }}>{atsScore >= 80 ? "🔥 Excellent!" : atsScore >= 60 ? "✅ Good match" : "⚠️ Needs work"}</p>
                </div>
              </div>
              <button className="btn-primary" onClick={() => {
                const blob = new Blob([tailored], { type: "text/plain" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "tailored_resume.txt";
                a.click();
              }} style={{ background: ACCENT, color: DARK, border: "none", borderRadius: 10, padding: "12px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif", marginLeft: "auto" }}>⬇ Download Resume</button>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ borderBottom: `1px solid ${BORDER}`, display: "flex" }}>
                {["diff", "tailored", "feedback"].map(tab => (
                  <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: "none", border: "none", padding: "14px 22px", fontSize: 13, fontWeight: 600, cursor: "pointer", color: activeTab === tab ? ACCENT : "#4B5A70", borderBottom: activeTab === tab ? `2px solid ${ACCENT}` : "2px solid transparent", fontFamily: "'Syne', sans-serif" }}>
                    {tab === "diff" ? "📊 Changes" : tab === "tailored" ? "📄 New Resume" : "💬 Refine"}
                  </button>
                ))}
              </div>
              <div style={{ padding: 24 }}>
                {activeTab === "diff" && <DiffView original={resume} tailored={tailored} />}
                {activeTab === "tailored" && <pre style={{ color: "#CBD5E1", fontSize: 12.5, fontFamily: "'DM Mono', monospace", lineHeight: 1.9, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{tailored}</pre>}
                {activeTab === "feedback" && (
                  <div>
                    <p style={{ color: "#6B7FA3", fontSize: 13, marginBottom: 16 }}>Tell the AI what to fix and it'll refine the resume.</p>
                    <textarea value={feedback} onChange={e => setFeedback(e.target.value)} placeholder='e.g. "Add more emphasis on leadership experience"' style={{ width: "100%", minHeight: 100, background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, color: "#CBD5E1", fontSize: 13, fontFamily: "'DM Mono', monospace", lineHeight: 1.8 }} />
                    {loading && <Spinner />}
                    {error && <p style={{ color: "#FF6B6B", fontSize: 13, marginTop: 8 }}>{error}</p>}
                    <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                      <button className="btn-primary" onClick={refineWithFeedback} disabled={!feedback.trim() || loading} style={{ background: feedback.trim() && !loading ? ACCENT : BORDER, color: feedback.trim() && !loading ? DARK : "#4B5A70", border: "none", borderRadius: 10, padding: "11px 24px", fontSize: 14, fontWeight: 700, cursor: feedback.trim() && !loading ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif" }}>✨ Refine</button>
                      <button className="btn-ghost" onClick={() => { setStep(0); setTailored(""); setAtsScore(null); setResume(""); setJD(""); }} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 10, padding: "11px 22px", fontSize: 14, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}>Start Over</button>
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