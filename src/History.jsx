import { useState, useEffect } from "react";
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

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function History({ session, onBack, onLogout }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [apps, setApps]       = useState([]);
  const [loading, setLoading] = useState(true);

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

  function openResume(tailoredResume) {
    const html = generateResumeHTML(tailoredResume || "");
    const tab  = window.open("", "_blank");
    tab.document.write(html);
    tab.document.close();
  }

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
        .status-sel { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .status-sel:focus { outline: 2px solid ${theme.accent}40; outline-offset: 1px; }
      `}</style>

      {/* Header */}
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

      {/* Body */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 32 }}>
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

        ) : apps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
            <p style={{ color: theme.textStrong, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No applications yet.</p>
            <p style={{ color: theme.textMuted, fontSize: 14, marginBottom: 28 }}>
              Start tailoring your first resume!
            </p>
            <button
              onClick={onBack}
              style={{ background: theme.accent, color: theme.background, border: "none", borderRadius: 10, padding: "11px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}
            >Start Tailoring →</button>
          </div>

        ) : (
          <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 80px 80px 110px 150px 100px",
              padding: "11px 20px",
              background: theme.cardAlt,
              borderBottom: `1px solid ${theme.border}`,
            }}>
              {["Company", "Job Title", "Before", "After", "Date", "Status", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 10, color: theme.textFaint, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {apps.map((app, idx) => {
              const statusColor = STATUS_COLOR[app.status] || STATUS_COLOR["Applied"];
              return (
                <div
                  key={app.id}
                  className="hist-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 80px 80px 110px 150px 100px",
                    padding: "13px 20px",
                    borderBottom: idx < apps.length - 1 ? `1px solid ${theme.border}` : "none",
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
                      width: "140px",
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
                        padding: "5px 12px", fontSize: 11, fontWeight: 600,
                        cursor: "pointer", fontFamily: "'DM Mono', monospace",
                        transition: "opacity 0.15s",
                      }}
                    >View PDF</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textFaint, marginTop: 48, fontFamily: "'DM Mono', monospace" }}>
          Mission HIRED 🔥 · Built by Ghanshyam · Powered by Claude
        </p>
      </div>
    </div>
  );
}
