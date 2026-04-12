import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { generateResumeHTML } from "./ResumeHTML";

const ACCENT = "#00E5A0";
const DARK   = "#0A0F1E";
const CARD   = "#111827";
const BORDER = "#1E2D40";

const STATUS_OPTIONS = ["Applied", "Under Review", "Interview", "Offer", "Rejected"];

const STATUS_COLOR = {
  "Applied":      "#3B82F6",
  "Under Review": "#F59E0B",
  "Interview":    "#8B5CF6",
  "Offer":        "#00E5A0",
  "Rejected":     "#FF6B6B",
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function History({ session, onBack, onLogout }) {
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
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Syne', sans-serif", color: "#CBD5E1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0F1E; }
        ::-webkit-scrollbar-thumb { background: #1E2D40; border-radius: 3px; }
        .hist-row:hover { background: #0D1520 !important; }
        .view-btn:hover { opacity: 0.8; }
        .status-sel { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .status-sel:focus { outline: 2px solid #00E5A040; outline-offset: 1px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{
        borderBottom: `1px solid ${BORDER}`, padding: "18px 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: "#090E1C", position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: ACCENT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
              Job<span style={{ color: ACCENT }}>Craft</span>
            </span>
          </div>
          <button
            onClick={onBack}
            style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
          >← Back</button>
        </div>
        <button
          onClick={onLogout}
          style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
        >Sign Out</button>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>
            Application History
          </h1>
          <p style={{ color: "#6B7FA3", fontSize: 14 }}>
            Track your tailored resumes and application progress.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6B7FA3", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            Loading…
          </div>

        ) : apps.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 24px", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>📋</div>
            <p style={{ color: "#fff", fontSize: 18, fontWeight: 700, marginBottom: 8 }}>No applications yet.</p>
            <p style={{ color: "#6B7FA3", fontSize: 14, marginBottom: 28 }}>
              Start tailoring your first resume!
            </p>
            <button
              onClick={onBack}
              style={{ background: ACCENT, color: DARK, border: "none", borderRadius: 10, padding: "11px 26px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Syne', sans-serif" }}
            >Start Tailoring →</button>
          </div>

        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 80px 80px 110px 150px 100px",
              padding: "11px 20px",
              background: "#0D1117",
              borderBottom: `1px solid ${BORDER}`,
            }}>
              {["Company", "Job Title", "Before", "After", "Date", "Status", ""].map((h, i) => (
                <span key={i} style={{ fontSize: 10, color: "#4B5A70", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
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
                    borderBottom: idx < apps.length - 1 ? `1px solid ${BORDER}` : "none",
                    alignItems: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ fontSize: 13, color: "#CBD5E1", fontWeight: 600, paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {app.company_name || "—"}
                  </span>
                  <span style={{ fontSize: 12, color: "#8899A6", paddingRight: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {app.job_title || "—"}
                  </span>
                  <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: "#FF6B6B", fontWeight: 700 }}>
                    {app.original_ats_score != null ? `${app.original_ats_score}%` : "—"}
                  </span>
                  <span style={{ fontSize: 13, fontFamily: "'DM Mono', monospace", color: ACCENT, fontWeight: 700 }}>
                    {app.tailored_ats_score != null ? `${app.tailored_ats_score}%` : "—"}
                  </span>
                  <span style={{ fontSize: 11, color: "#4B5A70", fontFamily: "'DM Mono', monospace" }}>
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
                      <option key={s} value={s} style={{ background: "#111827", color: "#CBD5E1" }}>{s}</option>
                    ))}
                  </select>

                  {/* View Resume button */}
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <button
                      className="view-btn"
                      onClick={() => openResume(app.tailored_resume)}
                      style={{
                        background: `${ACCENT}18`, color: ACCENT,
                        border: `1px solid ${ACCENT}40`, borderRadius: 7,
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

        <p style={{ textAlign: "center", fontSize: 11, color: "#2D3D52", marginTop: 48, fontFamily: "'DM Mono', monospace" }}>
          Mission HIRED 🔥 · Built by Ghanshyam · Powered by Claude
        </p>
      </div>
    </div>
  );
}
