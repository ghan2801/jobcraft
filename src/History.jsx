// -- ALTER TABLE applications ADD COLUMN IF NOT EXISTS is_deleted boolean default false;

import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabaseClient";
import { generateResumeHTML } from "./ResumeHTML";
import { useTheme } from "./ThemeContext";

const STATUS_OPTIONS = ["Applied", "Under Review", "Interview", "Offer", "Rejected"];

const STATUS_COLOR = {
  "Applied":      "#3B82F6",
  "Under Review": "#F59E0B",
  "Interview":    "#8B5CF6",
  "Offer":        "#00C47A",
  "Rejected":     "#FF6B6B",
};

const TIME_FILTERS = [
  { value: "all",     label: "All Time" },
  { value: "week",    label: "This Week" },
  { value: "month",   label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year",    label: "This Year" },
];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function getDateCutoff(filter) {
  const now = new Date();
  switch (filter) {
    case "week":    return new Date(Date.now() - 7 * 86400000);
    case "month":   return new Date(now.getFullYear(), now.getMonth(), 1);
    case "quarter": return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "year":    return new Date(now.getFullYear(), 0, 1);
    default:        return null;
  }
}

const GRID = "200px 180px 60px 60px 100px 130px auto";

export default function History({ session, onBack, onLogout }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [apps,       setApps]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState("active");   // "active" | "archived"
  const [timeFilter, setTimeFilter] = useState("all");

  // Generate-prep-plan modal state
  const [genModal,       setGenModal]       = useState(null);  // null | app object
  const [genDays,        setGenDays]        = useState(null);
  const [genHours,       setGenHours]       = useState(2);
  const [genError,       setGenError]       = useState("");
  const [generatingId,   setGeneratingId]   = useState(null); // app id being generated
  const [successToast,   setSuccessToast]   = useState("");   // "" or message
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // id pending inline confirm
  const [searchQuery,    setSearchQuery]    = useState("");

  useEffect(() => { fetchApps(); }, []);

  async function fetchApps() {
    setLoading(true);
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", session.user.id)
      .or("is_deleted.eq.false,is_deleted.is.null")
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
  }

  async function deleteApp(id) {
    // Optimistic: remove from UI immediately
    setApps(prev => prev.filter(a => a.id !== id));
    setConfirmDeleteId(null);
    await supabase.from("applications").update({ is_deleted: true }).eq("id", id);
    setSuccessToast("Deleted");
    setTimeout(() => setSuccessToast(""), 2500);
  }

  async function updateStatus(id, status) {
    await supabase.from("applications").update({ status }).eq("id", id);
    setApps(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  async function archiveApp(id, archive) {
    // Optimistic update — row disappears from current view immediately
    setApps(prev => prev.map(a => a.id === id ? { ...a, is_archived: archive } : a));
    await supabase.from("applications").update({ is_archived: archive }).eq("id", id);
  }

  function openResume(tailoredResume) {
    const html = generateResumeHTML(tailoredResume || "");
    const tab  = window.open("", "_blank");
    if (tab) { tab.document.write(html); tab.document.close(); }
  }

  function openPrepPlan(app) {
    const plan = app.prep_plan;
    if (!plan) return;
    const { interview_structure, readiness_assessment, daily_plan, question_bank, top_questions, emergency_tips } = plan;

    const esc = s => String(s || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

    const readinessColor = level =>
      level === "strong" ? "#16a34a" : level === "gap" ? "#dc2626" : "#d97706";
    const readinessLabel = level =>
      level === "strong" ? "✅ Strong" : level === "gap" ? "Gap" : "Neutral";

    // ── Section builders ────────────────────────────────────────────────────
    const structureHTML = interview_structure ? `
      <section>
        <div class="section-header"><span class="section-icon">🗂️</span><h2>Interview Structure</h2></div>
        ${interview_structure.overview ? `<p class="verdict">${esc(interview_structure.overview)}</p>` : ""}
        <div class="rounds">
          ${(interview_structure.rounds || []).map((r, i) => `
            <div class="round">
              <div class="round-num">${i + 1}</div>
              <div class="round-body">
                <span class="round-name">${esc(r.name)}</span>${r.duration ? `<span class="chip">${esc(r.duration)}</span>` : ""}
                <p class="muted">${esc(r.description)}</p>
              </div>
            </div>`).join("")}
        </div>
      </section>` : "";

    const readinessHTML = readiness_assessment ? `
      <section>
        <div class="section-header"><span class="section-icon">📊</span><h2>Readiness Assessment</h2></div>
        ${readiness_assessment.overall_verdict ? `<p class="verdict">${esc(readiness_assessment.overall_verdict)}</p>` : ""}
        <div class="items">
          ${(readiness_assessment.items || []).map(item => `
            <div class="item">
              <div class="item-row">
                <span class="item-label">${esc(item.label)}</span>
                <span class="badge" style="color:${readinessColor(item.level)};border-color:${readinessColor(item.level)}40;background:${readinessColor(item.level)}12">${readinessLabel(item.level)}</span>
              </div>
              ${item.note && item.level !== "strong" ? `<p class="item-note">${esc(item.note)}</p>` : ""}
            </div>`).join("")}
        </div>
      </section>` : "";

    const dailyHTML = (daily_plan || []).length ? `
      <section>
        <div class="section-header"><span class="section-icon">📅</span><h2>Day-by-Day Plan</h2></div>
        <div class="day-grid">
          ${daily_plan.map(day => `
            <div class="day-card">
              <div class="day-header"><span class="day-num">Day ${day.day}</span><span class="day-theme">${esc(day.theme)}</span></div>
              <ul class="task-list">
                ${(day.tasks || []).map(t => `<li><label class="task-label"><input type="checkbox" class="task-cb"> <span>${esc(t)}</span></label></li>`).join("")}
              </ul>
            </div>`).join("")}
        </div>
      </section>` : "";

    // question_bank (new format) or top_questions (legacy)
    const QBANK_META = {
      opening:               { label: "Opening",               emoji: "👋" },
      domain:                { label: "Domain Knowledge",      emoji: "🏦" },
      technical:             { label: "Technical",             emoji: "⚙️" },
      sql_data:              { label: "SQL & Data",            emoji: "🗄️" },
      leadership_behavioral: { label: "Leadership & Behavioral",emoji: "🤝" },
      vp_strategic:          { label: "Strategic / VP-Level",  emoji: "📈" },
      closing:               { label: "Closing",               emoji: "🎯" },
    };
    const DIFF_COLOR = { easy: "#16a34a", medium: "#d97706", hard: "#dc2626" };

    const questionsHTML = question_bank && Object.keys(question_bank).length ? `
      <section>
        <div class="section-header"><span class="section-icon">💬</span><h2>Interview Question Bank</h2></div>
        ${Object.entries(question_bank).map(([key, qs]) => {
          if (!qs || !qs.length) return "";
          const meta = QBANK_META[key] || { label: key, emoji: "❓" };
          return `
            <div class="qbank-section">
              <div class="qbank-heading">${meta.emoji} ${meta.label} <span class="qbank-count">${qs.length} questions</span></div>
              ${qs.map((q, i) => `
                <div class="question">
                  <div class="q-top">
                    <span class="q-num">${i + 1}</span>
                    <strong class="q-text">${esc(q.question)}</strong>
                    ${q.difficulty ? `<span class="diff-badge" style="color:${DIFF_COLOR[q.difficulty]||"#888"};border-color:${DIFF_COLOR[q.difficulty]||"#888"}40;background:${DIFF_COLOR[q.difficulty]||"#888"}12">${esc(q.difficulty)}</span>` : ""}
                  </div>
                  ${q.answer_guide ? `<p class="answer-guide">💡 ${esc(q.answer_guide)}</p>` : ""}
                  ${(q.key_points||[]).length ? `<ul class="key-points">${q.key_points.map(p=>`<li>${esc(p)}</li>`).join("")}</ul>` : ""}
                </div>`).join("")}
            </div>`;
        }).join("")}
      </section>` :
      (top_questions || []).length ? `
      <section>
        <div class="section-header"><span class="section-icon">💬</span><h2>Top Interview Questions</h2></div>
        ${top_questions.map((q, i) => `
          <div class="question">
            <div class="q-top">
              <span class="q-num">${i + 1}</span>
              ${q.category ? `<span class="cat-badge">${esc(q.category)}</span>` : ""}
              <strong class="q-text">${esc(q.question)}</strong>
            </div>
            ${q.answer_guide ? `<p class="answer-guide"><strong>How to answer:</strong> ${esc(q.answer_guide)}</p>` : ""}
          </div>`).join("")}
      </section>` : "";

    const tipsHTML = (emergency_tips || []).length ? `
      <section>
        <div class="section-header"><span class="section-icon">🚨</span><h2>Emergency Tips</h2></div>
        <ul class="tips-list">${emergency_tips.map(t => `<li>${esc(t)}</li>`).join("")}</ul>
      </section>` : "";

    // ── HTML template ────────────────────────────────────────────────────────
    const html = `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Prep Plan – ${esc(app.job_title || "Role")}${app.company_name ? ` @ ${esc(app.company_name)}` : ""}</title>
<style>
  /* ── Theme variables ── */
  :root[data-theme="light"] {
    --bg: #F8FAFC; --card: #FFFFFF; --card-alt: #F1F5F9;
    --text: #0F172A; --text-muted: #64748B; --text-faint: #94A3B8;
    --border: #E2E8F0; --accent: #2563EB; --accent-bg: #2563EB12;
    --nav-bg: #FFFFFF; --nav-border: #E2E8F0;
    --day-header: #F1F5F9;
  }
  :root[data-theme="dark"] {
    --bg: #0F172A; --card: #1E293B; --card-alt: #243044;
    --text: #CBD5E1; --text-muted: #64748B; --text-faint: #3D5068;
    --border: #334155; --accent: #3B82F6; --accent-bg: #3B82F612;
    --nav-bg: #0D1526; --nav-border: #334155;
    --day-header: #243044;
  }

  /* ── Reset & base ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    background: var(--bg); color: var(--text);
    transition: background 0.2s, color 0.2s;
    min-height: 100vh;
  }
  a { color: var(--accent); }

  /* ── Nav bar ── */
  .nav {
    position: sticky; top: 0; z-index: 100;
    background: var(--nav-bg); border-bottom: 1px solid var(--nav-border);
    padding: 0 40px;
    display: flex; align-items: center; justify-content: space-between;
    height: 56px;
  }
  .nav-brand {
    display: flex; align-items: center; gap: 8px;
    font-size: 17px; font-weight: 800; color: var(--text); letter-spacing: -0.02em;
    text-decoration: none;
  }
  .nav-brand .logo {
    width: 28px; height: 28px; background: var(--accent); border-radius: 7px;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
  }
  .nav-brand .accent { color: var(--accent); }
  .nav-actions { display: flex; align-items: center; gap: 8px; }
  .nav-btn {
    background: transparent; border: 1px solid var(--border); color: var(--text-muted);
    border-radius: 8px; padding: 6px 14px; font-size: 12px; cursor: pointer;
    font-family: inherit; transition: all 0.15s;
  }
  .nav-btn:hover { border-color: var(--accent); color: var(--accent); }
  .nav-btn.primary {
    background: var(--accent-bg); border-color: var(--accent); color: var(--accent);
  }

  /* ── Page body ── */
  .page { max-width: 1100px; margin: 0 auto; padding: 40px 40px 80px; }

  /* ── Page header ── */
  .page-header {
    margin-bottom: 36px; padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
  }
  .page-header h1 {
    font-size: 28px; font-weight: 800; color: var(--text);
    letter-spacing: -0.02em; margin-bottom: 8px;
  }
  .page-header .meta {
    font-size: 13px; color: var(--text-muted);
    font-family: "SF Mono", "Fira Code", "Cascadia Code", monospace;
  }
  .meta-pill {
    display: inline-block; background: var(--accent-bg);
    border: 1px solid var(--accent); color: var(--accent);
    border-radius: 20px; padding: 2px 10px; font-size: 11px;
    font-weight: 600; margin-top: 8px;
  }

  /* ── Sections ── */
  section {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 14px; padding: 24px 28px; margin-bottom: 16px;
  }
  .section-header {
    display: flex; align-items: center; gap: 10px; margin-bottom: 16px;
  }
  .section-icon { font-size: 18px; line-height: 1; }
  h2 { font-size: 16px; font-weight: 700; color: var(--text); }
  .verdict {
    font-size: 13px; color: var(--text-muted); line-height: 1.7;
    margin-bottom: 16px;
    font-family: "SF Mono", "Fira Code", monospace;
  }
  .muted { color: var(--text-muted); font-size: 12px; }
  .chip {
    font-size: 11px; background: var(--card-alt); color: var(--text-muted);
    border: 1px solid var(--border); border-radius: 5px; padding: 1px 7px;
    margin-left: 6px; font-family: "SF Mono","Fira Code",monospace;
  }

  /* ── Rounds ── */
  .rounds { display: flex; flex-direction: column; gap: 10px; }
  .round { display: flex; gap: 14px; align-items: flex-start; }
  .round-num {
    width: 26px; height: 26px; flex-shrink: 0;
    background: var(--accent-bg); border: 1px solid var(--accent);
    border-radius: 7px; display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 700; color: var(--accent);
    font-family: "SF Mono","Fira Code",monospace;
  }
  .round-body { flex: 1; }
  .round-name { font-size: 13px; font-weight: 600; color: var(--text); }
  .round-body .muted { margin-top: 3px; display: block; line-height: 1.5; }

  /* ── Readiness items ── */
  .items { display: flex; flex-direction: column; gap: 8px; }
  .item {
    padding: 11px 16px; background: var(--card-alt);
    border-radius: 9px; border: 1px solid var(--border);
  }
  .item-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .item-label { font-size: 13px; font-weight: 600; color: var(--text); }
  .badge {
    font-size: 11px; font-weight: 700; border: 1px solid;
    border-radius: 5px; padding: 2px 8px; white-space: nowrap; flex-shrink: 0;
    font-family: "SF Mono","Fira Code",monospace;
  }
  .item-note {
    font-size: 11px; color: var(--text-muted); line-height: 1.6; margin-top: 8px;
    padding-top: 8px; border-top: 1px solid var(--border);
    font-family: "SF Mono","Fira Code",monospace;
  }

  /* ── Day-by-day ── */
  .day-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .day-card { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .day-header {
    background: var(--day-header); padding: 10px 14px;
    display: flex; align-items: center; gap: 8px;
  }
  .day-num {
    font-size: 11px; font-weight: 700; color: var(--accent);
    font-family: "SF Mono","Fira Code",monospace; white-space: nowrap;
  }
  .day-theme { font-size: 13px; font-weight: 600; color: var(--text); }
  .task-list { padding: 10px 14px; list-style: none; }
  .task-list li { margin-bottom: 7px; }
  .task-label {
    display: flex; align-items: flex-start; gap: 8px;
    font-size: 13px; color: var(--text-muted); line-height: 1.5; cursor: pointer;
  }
  .task-cb { margin-top: 2px; accent-color: var(--accent); flex-shrink: 0; }
  .task-label input:checked + span { text-decoration: line-through; opacity: 0.5; }

  /* ── Question bank ── */
  .qbank-section { margin-bottom: 20px; }
  .qbank-section:last-child { margin-bottom: 0; }
  .qbank-heading {
    font-size: 13px; font-weight: 700; color: var(--text);
    padding: 8px 0; margin-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
  .qbank-count {
    font-size: 11px; font-weight: 400; color: var(--text-faint);
    font-family: "SF Mono","Fira Code",monospace; margin-left: 6px;
  }
  .question {
    padding: 12px 0; border-bottom: 1px solid var(--border);
  }
  .question:last-child { border-bottom: none; }
  .q-top { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
  .q-num {
    font-size: 10px; background: var(--accent-bg); color: var(--accent);
    border: 1px solid var(--accent); border-radius: 4px; padding: 2px 5px;
    font-family: "SF Mono","Fira Code",monospace; font-weight: 700; flex-shrink: 0; margin-top: 1px;
  }
  .q-text { font-size: 13px; color: var(--text); line-height: 1.5; flex: 1; }
  .diff-badge {
    font-size: 10px; font-weight: 700; border: 1px solid; border-radius: 4px;
    padding: 2px 6px; white-space: nowrap; flex-shrink: 0; margin-top: 1px;
    text-transform: uppercase; font-family: "SF Mono","Fira Code",monospace;
  }
  .cat-badge {
    font-size: 10px; background: var(--card-alt); color: var(--text-muted);
    border: 1px solid var(--border); border-radius: 4px; padding: 2px 6px;
    font-family: "SF Mono","Fira Code",monospace; flex-shrink: 0;
  }
  .answer-guide {
    font-size: 12px; color: var(--text-muted); line-height: 1.7; margin-bottom: 4px;
    font-family: "SF Mono","Fira Code",monospace;
  }
  .key-points {
    margin: 4px 0 0 20px; padding: 0;
  }
  .key-points li {
    font-size: 11px; color: var(--text-faint); line-height: 1.6; margin-bottom: 2px;
    font-family: "SF Mono","Fira Code",monospace;
  }

  /* ── Tips ── */
  .tips-list { padding-left: 20px; }
  .tips-list li {
    font-size: 13px; color: var(--text-muted); line-height: 1.7; margin-bottom: 6px;
  }

  /* ── Print ── */
  @media print {
    .nav { display: none; }
    body { background: #fff !important; color: #000 !important; }
    section { background: #fff !important; border-color: #ddd !important; break-inside: avoid; }
    .page-header { break-after: avoid; }
    .day-grid { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>

<nav class="nav">
  <a class="nav-brand" href="#">
    <div class="logo">⚡</div>
    Job<span class="accent">vate</span>
  </a>
  <div class="nav-actions">
    <button class="nav-btn primary" onclick="window.print()">🖨️ Print</button>
    <button class="nav-btn" id="theme-btn" onclick="toggleTheme()">🌙 Dark</button>
  </div>
</nav>

<div class="page">
  <div class="page-header">
    <h1>🎯 Interview Prep Plan</h1>
    <p class="meta">
      ${esc(app.job_title || "Role")}${app.company_name ? ` · ${esc(app.company_name)}` : ""}
    </p>
    ${app.days_until_interview ? `<span class="meta-pill">📅 ${app.days_until_interview} day${app.days_until_interview !== 1 ? "s" : ""} to interview</span>` : ""}
  </div>

  ${structureHTML}
  ${readinessHTML}
  ${dailyHTML}
  ${questionsHTML}
  ${tipsHTML}
</div>

<script>
  (function() {
    var saved = localStorage.getItem('jc-prep-theme') || 'light';
    applyTheme(saved);
  })();

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var btn = document.getElementById('theme-btn');
    if (btn) btn.textContent = t === 'dark' ? '☀️ Light' : '🌙 Dark';
    localStorage.setItem('jc-prep-theme', t);
  }

  function toggleTheme() {
    var current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }
</script>
</body></html>`;

    const tab = window.open("", "_blank");
    if (tab) { tab.document.write(html); tab.document.close(); }
  }

  async function generatePrepPlanForApp() {
    const app = genModal;
    if (!app || !genDays) return;
    // Close modal immediately, show spinner in row
    const capturedDays  = genDays;
    const capturedHours = genHours;
    setGenModal(null);
    setGeneratingId(app.id);
    setGenError("");

    const truncateText = (text, max = 3000) => {
      if (!text || text.length <= max) return text;
      return text.slice(0, max) + "\n\n[Content truncated...]";
    };

    const resumeText = truncateText(app.tailored_resume || app.original_resume || "", 2000);
    const jdText     = truncateText(app.job_description || "");
    const company    = app.company_name || "";
    const jobTitle   = app.job_title || "";
    const genDaysEff = capturedDays;
    const genHoursEff= capturedHours;

    const controller  = new AbortController();
    const timeoutId   = setTimeout(() => controller.abort(), 60000);

    try {
      // Web search for context (best-effort)
      let snippets = "";
      try {
        const queries = [
          `${company || jobTitle} interview process rounds questions`,
          `${jobTitle} interview questions technical behavioral`,
          `${company || jobTitle} company culture values hiring`,
        ];
        const results = await Promise.allSettled(
          queries.map(q =>
            fetch("/api/search", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ query: q }),
            }).then(r => r.ok ? r.json() : { results: [] }).catch(() => ({ results: [] }))
          )
        );
        snippets = results
          .map(r => r.status === "fulfilled" ? r.value : { results: [] })
          .flatMap(r => (r.results || []).slice(0, 3).map(s => s.snippet || s.description || ""))
          .filter(Boolean).slice(0, 12).join("\n");
      } catch { snippets = ""; }

      const response = await fetch("/api/proxy", {
        method: "POST",
        signal: controller.signal,
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
- Each answer_guide: max 120 characters
- Each tip: max 80 characters
- Each readiness note: max 80 characters
- Max 3 tasks per day
- Max 6 readiness items total
- Max 4 emergency tips

CONTEXT:
- Role: ${jobTitle || "the role"}
- Company: ${company || "the company"}
- Days until interview: ${genDaysEff}
- Study hours per day: ${genHoursEff}
- Tailored resume: ${resumeText}
- Job description: ${jdText}
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
  "question_bank": {
    "opening": [ { "question": "max 100 chars", "answer_guide": "max 120 chars", "key_points": ["max 70 chars", "max 70 chars"], "difficulty": "easy" } ],
    "domain": [ { "question": "max 100 chars", "answer_guide": "max 120 chars", "key_points": ["max 70 chars", "max 70 chars"], "difficulty": "medium" } ],
    "technical": [ { "question": "max 100 chars", "answer_guide": "max 120 chars", "key_points": ["max 70 chars", "max 70 chars"], "difficulty": "hard" } ],
    "sql_data": [ { "question": "max 100 chars", "answer_guide": "max 120 chars", "key_points": ["max 70 chars", "max 70 chars"], "difficulty": "medium" } ],
    "leadership_behavioral": [ { "question": "max 100 chars", "answer_guide": "max 120 chars", "key_points": ["max 70 chars", "max 70 chars"], "difficulty": "medium" } ],
    "vp_strategic": [ { "question": "max 100 chars", "answer_guide": "max 120 chars", "key_points": ["max 70 chars", "max 70 chars"], "difficulty": "hard" } ],
    "closing": [ { "question": "max 100 chars", "answer_guide": "max 120 chars", "key_points": ["max 70 chars", "max 70 chars"], "difficulty": "easy" } ]
  },
  "emergency_tips": ["concise tip (max 80 chars)"]
}

Rules:
- daily_plan must have exactly ${genDaysEff} day entries, max 3 tasks each
- question_bank sections: opening=3, domain=5, technical=5, sql_data=4, leadership_behavioral=5, vp_strategic=3, closing=2
- Each question must be specific to the role and company, not generic
- key_points: exactly 2 bullet points per question
- readiness_assessment.items: exactly 6 items drawn from the JD requirements
- emergency_tips: exactly 4 tips
- Tasks must be specific and actionable

STRICT SKILL MATCHING RULES for readiness_assessment:
- STRONG: exact tool explicitly in resume
- NEUTRAL: transferable but NOT the exact tool (AWS ≠ Azure, SQL Server ≠ Synapse)
- GAP: not mentioned at all
- For each gap/neutral: add a note field explaining what is missing and realistic prep time`,
          }],
        }),
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      const rawText = data.content.map(b => b.text || "").join("");
      const cleaned = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const plan = JSON.parse(cleaned);

      // Persist to Supabase
      await supabase.from("applications").update({
        prep_plan: plan,
        days_until_interview: genDaysEff,
      }).eq("id", app.id);

      // Update local state so the row updates immediately
      const updatedApp = { ...app, prep_plan: plan, days_until_interview: genDaysEff };
      setApps(prev => prev.map(a => a.id === app.id ? updatedApp : a));

      // Show green toast, then open plan
      const toastLabel = `${app.job_title || "Prep plan"} ready!`;
      setSuccessToast(toastLabel);
      setTimeout(() => setSuccessToast(""), 3500);
      openPrepPlan(updatedApp);
    } catch (e) {
      clearTimeout(timeoutId);
      console.error("History generatePrepPlan error:", e);
      const errMsg = e.name === "AbortError"
        ? "Timed out. Please try again."
        : "Failed to generate plan: " + e.message;
      setGenError(errMsg);
      // Re-open modal with error so user can retry
      setGenModal(app);
      setGenDays(capturedDays);
      setGenHours(capturedHours);
    } finally {
      setGeneratingId(null);
    }
  }

  // ── Derived lists ───────────────────────────────────────────────────────────
  const activeApps   = useMemo(() => apps.filter(a => !a.is_archived), [apps]);
  const archivedApps = useMemo(() => apps.filter(a =>  a.is_archived), [apps]);

  // Active apps filtered by the time picker (used for stats + active table)
  const filteredActive = useMemo(() => {
    const cutoff = getDateCutoff(timeFilter);
    if (!cutoff) return activeApps;
    return activeApps.filter(a => new Date(a.created_at) >= cutoff);
  }, [activeApps, timeFilter]);

  // Stats are always computed from time-filtered active apps
  const stats = useMemo(() => {
    const total      = filteredActive.length;
    const inProgress = filteredActive.filter(a => a.status === "Under Review" || a.status === "Interview").length;
    const offers     = filteredActive.filter(a => a.status === "Offer").length;
    const advanced   = filteredActive.filter(a => a.status === "Interview" || a.status === "Offer").length;
    const withScore  = filteredActive.filter(a => a.tailored_ats_score != null);
    const avgAts     = withScore.length
      ? Math.round(withScore.reduce((s, a) => s + a.tailored_ats_score, 0) / withScore.length)
      : null;
    const successRate = total > 0 ? Math.round((advanced / total) * 100) : 0;
    return { total, inProgress, offers, avgAts, successRate };
  }, [filteredActive]);

  // Rows shown in the table — filtered by search query
  const baseDisplayed = view === "active" ? filteredActive : archivedApps;
  const displayedApps = useMemo(() => {
    if (!searchQuery.trim()) return baseDisplayed;
    const q = searchQuery.toLowerCase();
    return baseDisplayed.filter(a =>
      a.company_name?.toLowerCase().includes(q) ||
      a.job_title?.toLowerCase().includes(q) ||
      a.status?.toLowerCase().includes(q)
    );
  }, [baseDisplayed, searchQuery]);

  const statCards = [
    { icon: "📋", label: "Total Applied",  value: String(stats.total),                              color: theme.accent  },
    { icon: "⚡", label: "In Progress",    value: String(stats.inProgress),                         color: "#F59E0B"     },
    { icon: "🎉", label: "Offers",         value: String(stats.offers),                             color: "#00C47A"     },
    { icon: "📊", label: "Avg ATS Score",  value: stats.avgAts != null ? `${stats.avgAts}%` : "—", color: theme.accent  },
    { icon: "🎯", label: "Success Rate",   value: `${stats.successRate}%`,                          color: "#8B5CF6"     },
  ];

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: "'Plus Jakarta Sans', sans-serif", color: theme.text, transition: "background 0.3s, color 0.3s" }}>

      {/* ── Generate Prep Plan Modal ────────────────────────────────────────── */}
      {/* ── Success Toast ───────────────────────────────────────────────────── */}
      {successToast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 2000,
          background: "#16a34a", color: "#fff",
          borderRadius: 10, padding: "12px 20px",
          fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600,
          boxShadow: "0 4px 20px #00000040",
          animation: "pc-slide-in 0.3s ease",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <style>{`@keyframes pc-slide-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }`}</style>
          ✅ {successToast}
        </div>
      )}

      {genModal && (
        <div
          onClick={e => { if (e.target === e.currentTarget) { setGenModal(null); setGenError(""); } }}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 1000, padding: 24,
          }}
        >
          <div style={{
            background: theme.card, border: `1px solid ${theme.border}`,
            borderRadius: 16, padding: 28, width: "100%", maxWidth: 420,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            {/* Modal header */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: theme.textStrong, marginBottom: 4 }}>
                🎯 Generate Interview Prep Plan
              </h3>
              <p style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'DM Mono', monospace" }}>
                {genModal.job_title || "Role"}{genModal.company_name ? ` @ ${genModal.company_name}` : ""}
              </p>
            </div>

            {/* Days selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: 8, letterSpacing: "0.06em" }}>
                DAYS UNTIL INTERVIEW
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                {[1, 2, 3, 5, 7, 14].map(d => (
                  <button
                    key={d}
                    onClick={() => setGenDays(d)}
                    style={{
                      width: 42, height: 42, borderRadius: 9,
                      border: `1px solid ${genDays === d ? theme.accent : theme.border}`,
                      background: genDays === d ? theme.accent + "20" : "transparent",
                      color: genDays === d ? theme.accent : theme.textMuted,
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'DM Mono', monospace", transition: "all 0.15s",
                    }}
                  >{d}</button>
                ))}
                <input
                  type="number" min={1} max={60}
                  value={genDays || ""}
                  onChange={e => setGenDays(parseInt(e.target.value) || null)}
                  placeholder="?"
                  style={{
                    width: 52, height: 42, borderRadius: 9,
                    border: `1px solid ${theme.border}`, background: theme.inputBg,
                    color: theme.text, fontSize: 13, textAlign: "center",
                    fontFamily: "'DM Mono', monospace", padding: "0 6px",
                  }}
                />
              </div>
            </div>

            {/* Hours selector */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: "block", fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: 8, letterSpacing: "0.06em" }}>
                STUDY HOURS PER DAY
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                {[1, 2, 3, 4].map(h => (
                  <button
                    key={h}
                    onClick={() => setGenHours(h)}
                    style={{
                      width: 52, height: 42, borderRadius: 9,
                      border: `1px solid ${genHours === h ? theme.accent : theme.border}`,
                      background: genHours === h ? theme.accent + "20" : "transparent",
                      color: genHours === h ? theme.accent : theme.textMuted,
                      fontSize: 13, fontWeight: 700, cursor: "pointer",
                      fontFamily: "'DM Mono', monospace", transition: "all 0.15s",
                    }}
                  >{h}h</button>
                ))}
              </div>
            </div>

            {genError && (
              <p style={{ fontSize: 12, color: "#ef4444", fontFamily: "'DM Mono', monospace", marginBottom: 14 }}>
                {genError}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => { setGenModal(null); setGenError(""); setGenDays(null); }}
                style={{
                  flex: 1, background: "transparent", border: `1px solid ${theme.border}`,
                  color: theme.textMuted, borderRadius: 9, padding: "11px 0",
                  fontSize: 13, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                }}
              >
                Cancel
              </button>
              <button
                onClick={generatePrepPlanForApp}
                disabled={!genDays}
                style={{
                  flex: 2,
                  background: genDays ? theme.accent : theme.border,
                  color: genDays ? theme.background : theme.textFaint,
                  border: "none", borderRadius: 9, padding: "11px 0",
                  fontSize: 13, fontWeight: 700,
                  cursor: genDays ? "pointer" : "not-allowed",
                  fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.15s",
                }}
              >
                Generate Plan →
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.background}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        .hist-row:hover { background: ${theme.cardAlt} !important; }
        .view-btn:hover { opacity: 0.8; }
        .arch-btn:hover { opacity: 1 !important; }
        .status-sel { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .status-sel:focus { outline: 2px solid ${theme.accent}40; outline-offset: 1px; }
        .pill-btn { transition: all 0.15s; }
        .time-sel { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .hist-actions { display: flex; flex-direction: row; gap: 6px; align-items: center; justify-content: flex-end; flex-wrap: nowrap; }
        @keyframes hist-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @media (max-width: 700px) {
          .hist-actions { flex-direction: column; align-items: flex-end; }
        }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        borderBottom: `1px solid ${theme.border}`, padding: "18px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: theme.headerBg, position: "sticky", top: 0, zIndex: 100,
        boxShadow: isDark ? "none" : "0 1px 4px #0000000A",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={onBack}>
            <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em" }}>
              Job<span style={{ color: theme.accent }}>vate</span>
            </span>
          </div>
          <button
            onClick={onBack}
            style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
          >← Back</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}
          >{isDark ? "☀️" : "🌙"}</button>
          <button
            onClick={onLogout}
            style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
          >Sign Out</button>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "48px 40px" }}>

        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em", marginBottom: 6 }}>
            Application History
          </h1>
          <p style={{ color: theme.textMuted, fontSize: 14 }}>
            Track your tailored resumes and application progress.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          <>
            {/* ── Stats bar ────────────────────────────────────────────────── */}
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              {statCards.map(({ icon, label, value, color }) => (
                <div key={label} style={{
                  flex: "1 1 140px",
                  background: theme.card,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 12,
                  padding: "16px 18px",
                  display: "flex", flexDirection: "column", gap: 5,
                }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
                  <span style={{ fontSize: 24, fontWeight: 800, color, fontFamily: "'DM Mono', monospace", lineHeight: 1.1, marginTop: 2 }}>
                    {value}
                  </span>
                  <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.04em" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Search bar ───────────────────────────────────────────────── */}
            <div style={{ position: "relative", marginBottom: 16 }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontSize: 15, pointerEvents: "none", opacity: 0.5,
              }}>🔍</span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by company, job title or status…"
                style={{
                  width: "100%", background: theme.inputBg,
                  border: `1px solid ${searchQuery ? theme.accent : theme.border}`,
                  borderRadius: 10, padding: "10px 40px 10px 40px",
                  color: theme.text, fontSize: 13,
                  fontFamily: "'DM Mono', monospace",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={e  => { e.target.style.borderColor = theme.accent; }}
                onBlur={e   => { e.target.style.borderColor = searchQuery ? theme.accent : theme.border; }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: theme.textMuted,
                    fontSize: 18, cursor: "pointer", lineHeight: 1, padding: "0 2px",
                  }}
                >×</button>
              )}
            </div>

            {/* ── Controls row ─────────────────────────────────────────────── */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>

              {/* Active / Archived pills */}
              <div style={{
                display: "flex",
                background: theme.cardAlt,
                border: `1px solid ${theme.border}`,
                borderRadius: 10,
                padding: 3,
                gap: 2,
              }}>
                {[
                  { key: "active",   label: `Active (${activeApps.length})` },
                  { key: "archived", label: `Archived (${archivedApps.length})` },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    className="pill-btn"
                    onClick={() => { setView(key); setSearchQuery(""); }}
                    style={{
                      background: view === key ? theme.accent : "transparent",
                      color:      view === key ? theme.background : theme.textMuted,
                      border: "none",
                      borderRadius: 7,
                      padding: "7px 18px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Time filter — active view only */}
              {view === "active" && (
                <select
                  className="time-sel"
                  value={timeFilter}
                  onChange={e => setTimeFilter(e.target.value)}
                  style={{
                    background: theme.card,
                    color: theme.text,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 8,
                    padding: "7px 14px",
                    fontSize: 12,
                    fontFamily: "'DM Mono', monospace",
                    cursor: "pointer",
                  }}
                >
                  {TIME_FILTERS.map(f => (
                    <option key={f.value} value={f.value} style={{ background: theme.card }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* ── Search result count ───────────────────────────────────────── */}
            {searchQuery.trim() && displayedApps.length > 0 && (
              <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
                Showing {displayedApps.length} of {baseDisplayed.length} application{baseDisplayed.length !== 1 ? "s" : ""}
              </p>
            )}

            {/* ── Table or empty state ─────────────────────────────────────── */}
            {displayedApps.length === 0 ? (
              searchQuery.trim() ? (
                <div style={{ textAlign: "center", padding: "60px 24px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                  <p style={{ color: theme.textStrong, fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    No applications found for "{searchQuery}"
                  </p>
                  <p style={{ color: theme.textMuted, fontSize: 13, marginBottom: 16 }}>Try a different search term.</p>
                  <button
                    onClick={() => setSearchQuery("")}
                    style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >Clear Search</button>
                </div>
              ) : view === "active" ? (
                <div style={{ textAlign: "center", padding: "80px 24px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
                  <p style={{ color: theme.textStrong, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                    No active applications.
                  </p>
                  <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 28 }}>
                    Start tailoring your first resume!
                  </p>
                  <button
                    onClick={onBack}
                    style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 10, padding: "11px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    Start Tailoring →
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "80px 24px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16 }}>
                  <div style={{ fontSize: 44, marginBottom: 16 }}>📦</div>
                  <p style={{ color: theme.textStrong, fontSize: 18, fontWeight: 700 }}>
                    No archived applications.
                  </p>
                </div>
              )
            ) : (
              <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: "hidden" }}>

                {/* Table header */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: GRID,
                  padding: "11px 20px",
                  background: theme.cardAlt,
                  borderBottom: `1px solid ${theme.border}`,
                }}>
                  {["Company", "Job Title", "Before", "After", "Date", "Status", "Actions"].map((h, i) => (
                    <span key={i} style={{ fontSize: 10, color: theme.textFaint, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      {h}
                    </span>
                  ))}
                </div>

                {/* Rows */}
                {displayedApps.map((app, idx) => {
                  const statusColor = STATUS_COLOR[app.status] || STATUS_COLOR["Applied"];
                  return (
                    <div
                      key={app.id}
                      className="hist-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: GRID,
                        padding: "13px 20px",
                        borderBottom: idx < displayedApps.length - 1 ? `1px solid ${theme.border}` : "none",
                        alignItems: "center",
                        background: theme.card,
                        transition: "background 0.15s",
                      }}
                    >
                      <span style={{ fontSize: 13, color: theme.text, fontWeight: 600, paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                        {app.company_name || "—"}
                      </span>
                      <span style={{ fontSize: 12, color: theme.textMuted, paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                        {app.job_title || "—"}
                      </span>
                      <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#FF6B6B", fontWeight: 700 }}>
                        {app.original_ats_score != null ? `${app.original_ats_score}%` : "—"}
                      </span>
                      <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: theme.accent, fontWeight: 700 }}>
                        {app.tailored_ats_score != null ? `${app.tailored_ats_score}%` : "—"}
                      </span>
                      <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: "'DM Mono', monospace" }}>
                        {formatDate(app.created_at)}
                      </span>

                      {/* Status dropdown */}
                      <select
                        className="status-sel"
                        value={app.status || "Applied"}
                        onChange={e => updateStatus(app.id, e.target.value)}
                        style={{
                          background: statusColor + "18",
                          color: statusColor,
                          border: `1px solid ${statusColor}50`,
                          borderRadius: 6,
                          padding: "4px 8px",
                          fontSize: 11,
                          fontFamily: "'DM Mono', monospace",
                          fontWeight: 600,
                          width: "100%",
                          maxWidth: 130,
                        }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s} style={{ background: theme.card, color: theme.text }}>{s}</option>
                        ))}
                      </select>

                      {/* Actions column: View PDF + Prep + Archive */}
                      <div className="hist-actions">
                        <button
                          className="view-btn"
                          onClick={() => openResume(app.tailored_resume)}
                          style={{
                            background: theme.accent + "18", color: theme.accent,
                            border: `1px solid ${theme.accent}40`, borderRadius: 7,
                            padding: "6px 10px", fontSize: 12, fontWeight: 600,
                            cursor: "pointer", fontFamily: "'DM Mono', monospace",
                            transition: "opacity 0.15s", whiteSpace: "nowrap",
                          }}
                        >
                          View PDF
                        </button>
                        {generatingId === app.id ? (
                          <span style={{
                            fontSize: 11, color: theme.accent, fontFamily: "'DM Mono', monospace",
                            display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap",
                            padding: "6px 10px",
                          }}>
                            <span style={{ animation: "hist-spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                            Generating…
                          </span>
                        ) : app.prep_plan ? (
                          <button
                            className="view-btn"
                            title="View prep plan"
                            onClick={() => openPrepPlan(app)}
                            style={{
                              background: "#22c55e18", color: "#22c55e",
                              border: "1px solid #22c55e40", borderRadius: 7,
                              padding: "6px 10px", fontSize: 12, fontWeight: 600,
                              cursor: "pointer", fontFamily: "'DM Mono', monospace",
                              transition: "opacity 0.15s", whiteSpace: "nowrap",
                            }}
                          >
                            🎯 View Prep
                          </button>
                        ) : (
                          <button
                            className="view-btn"
                            title="Generate prep plan"
                            onClick={() => { setGenModal(app); setGenDays(null); setGenHours(2); setGenError(""); }}
                            style={{
                              background: "transparent", color: theme.accent,
                              border: `1px solid ${theme.accent}50`, borderRadius: 7,
                              padding: "6px 10px", fontSize: 12, fontWeight: 600,
                              cursor: "pointer", fontFamily: "'DM Mono', monospace",
                              transition: "opacity 0.15s", whiteSpace: "nowrap",
                            }}
                          >
                            🎯 Gen Prep
                          </button>
                        )}
                        {/* Archive / Unarchive */}
                        <button
                          className="arch-btn"
                          title={app.is_archived ? "Unarchive" : "Archive"}
                          onClick={() => archiveApp(app.id, !app.is_archived)}
                          style={{
                            background: "transparent", border: "none",
                            fontSize: 16, cursor: "pointer",
                            padding: "4px 6px", lineHeight: 1,
                            opacity: 0.55, transition: "opacity 0.15s",
                            flexShrink: 0,
                          }}
                        >
                          {app.is_archived ? "📂" : "📦"}
                        </button>

                        {/* Delete — archived view only */}
                        {view === "archived" && (
                          confirmDeleteId === app.id ? (
                            <>
                              <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", whiteSpace: "nowrap" }}>Sure?</span>
                              <button
                                onClick={() => deleteApp(app.id)}
                                style={{
                                  background: "#DC262618", color: "#DC2626",
                                  border: "1px solid #DC262640", borderRadius: 7,
                                  padding: "5px 10px", fontSize: 11, fontWeight: 700,
                                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                                  whiteSpace: "nowrap",
                                }}
                              >Yes, Delete</button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                style={{
                                  background: "transparent", border: `1px solid ${theme.border}`,
                                  color: theme.textMuted, borderRadius: 7,
                                  padding: "5px 10px", fontSize: 11,
                                  cursor: "pointer", fontFamily: "'DM Mono', monospace",
                                }}
                              >Cancel</button>
                            </>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(app.id)}
                              style={{
                                background: "transparent", color: "#DC2626",
                                border: "1px solid #DC262640", borderRadius: 7,
                                padding: "5px 9px", fontSize: 11, fontWeight: 600,
                                cursor: "pointer", fontFamily: "'DM Mono', monospace",
                                whiteSpace: "nowrap", flexShrink: 0,
                              }}
                            >🗑 Delete</button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textFaint, marginTop: 48, fontFamily: "'DM Mono', monospace" }}>
          © 2026 Jobvate · All rights reserved
        </p>
      </div>
    </div>
  );
}
