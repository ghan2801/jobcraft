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

const GRID = "2fr 2fr 80px 80px 110px 140px 90px 40px";

export default function History({ session, onBack, onLogout }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [apps,       setApps]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState("active");   // "active" | "archived"
  const [timeFilter, setTimeFilter] = useState("all");

  useEffect(() => { fetchApps(); }, []);

  async function fetchApps() {
    setLoading(true);
    const { data } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setApps(data || []);
    setLoading(false);
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

  // Rows shown in the table
  const displayedApps = view === "active" ? filteredActive : archivedApps;

  const statCards = [
    { icon: "📋", label: "Total Applied",  value: String(stats.total),                              color: theme.accent  },
    { icon: "⚡", label: "In Progress",    value: String(stats.inProgress),                         color: "#F59E0B"     },
    { icon: "🎉", label: "Offers",         value: String(stats.offers),                             color: "#00C47A"     },
    { icon: "📊", label: "Avg ATS Score",  value: stats.avgAts != null ? `${stats.avgAts}%` : "—", color: theme.accent  },
    { icon: "🎯", label: "Success Rate",   value: `${stats.successRate}%`,                          color: "#8B5CF6"     },
  ];

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: "'Syne', sans-serif", color: theme.text, transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
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
              Job<span style={{ color: theme.accent }}>Craft</span>
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
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>

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
                    onClick={() => setView(key)}
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

            {/* ── Table or empty state ─────────────────────────────────────── */}
            {displayedApps.length === 0 ? (
              view === "active" ? (
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
                    style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 10, padding: "11px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}
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
                  {["Company", "Job Title", "Before", "After", "Date", "Status", "", ""].map((h, i) => (
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
                      <span style={{ fontSize: 13, color: theme.text, fontWeight: 600, paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {app.company_name || "—"}
                      </span>
                      <span style={{ fontSize: 12, color: theme.textMuted, paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                          width: "132px",
                        }}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s} style={{ background: theme.card, color: theme.text }}>{s}</option>
                        ))}
                      </select>

                      {/* View Resume button */}
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          className="view-btn"
                          onClick={() => openResume(app.tailored_resume)}
                          style={{
                            background: theme.accent + "18", color: theme.accent,
                            border: `1px solid ${theme.accent}40`, borderRadius: 7,
                            padding: "5px 10px", fontSize: 11, fontWeight: 600,
                            cursor: "pointer", fontFamily: "'DM Mono', monospace",
                            transition: "opacity 0.15s",
                          }}
                        >
                          View PDF
                        </button>
                      </div>

                      {/* Archive / Unarchive button */}
                      <div style={{ display: "flex", justifyContent: "center" }}>
                        <button
                          className="arch-btn"
                          title={app.is_archived ? "Unarchive" : "Archive"}
                          onClick={() => archiveApp(app.id, !app.is_archived)}
                          style={{
                            background: "transparent",
                            border: "none",
                            fontSize: 16,
                            cursor: "pointer",
                            padding: "2px 4px",
                            lineHeight: 1,
                            opacity: 0.55,
                            transition: "opacity 0.15s",
                          }}
                        >
                          {app.is_archived ? "📂" : "📦"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textFaint, marginTop: 48, fontFamily: "'DM Mono', monospace" }}>
          Mission HIRED 🔥 · Built by Ghanshyam · Powered by Claude
        </p>
      </div>
    </div>
  );
}
