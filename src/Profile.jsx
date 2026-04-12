import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const ACCENT = "#00E5A0";
const DARK   = "#0A0F1E";
const CARD   = "#111827";
const BORDER = "#1E2D40";

function Field({ label, value, onChange, placeholder, type = "text" }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: "block", fontSize: 11, color: "#6B7FA3",
        fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 6,
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: DARK,
          border: `1px solid ${focused ? ACCENT : BORDER}`,
          borderRadius: 8, padding: "10px 14px", color: "#CBD5E1",
          fontSize: 13, fontFamily: "'DM Mono', monospace",
          outline: "none", transition: "border-color 0.2s",
        }}
      />
    </div>
  );
}

export default function Profile({ session, onBack, onLogout }) {
  const [fullName,   setFullName]   = useState("");
  const [phone,      setPhone]      = useState("");
  const [location,   setLocation]   = useState("");
  const [linkedin,   setLinkedin]   = useState("");
  const [baseResume, setBaseResume] = useState("");
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [resumeFocused, setResumeFocused] = useState(false);
  const fileRef = useRef();

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();
    if (data) {
      setFullName(data.full_name   || "");
      setPhone(data.phone          || "");
      setLocation(data.location    || "");
      setLinkedin(data.linkedin    || "");
      setBaseResume(data.base_resume || "");
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    await supabase.from("profiles").upsert({
      id:          session.user.id,
      email:       session.user.email,
      full_name:   fullName,
      phone,
      location,
      linkedin,
      base_resume: baseResume,
      updated_at:  new Date().toISOString(),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setBaseResume(ev.target.result);
    reader.readAsText(file);
  }

  return (
    <div style={{ minHeight: "100vh", background: DARK, fontFamily: "'Syne', sans-serif", color: "#CBD5E1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus, button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0A0F1E; }
        ::-webkit-scrollbar-thumb { background: #1E2D40; border-radius: 3px; }
        textarea { resize: vertical; }
        .save-btn:hover { background: #00FFB3 !important; transform: translateY(-1px); }
        .ghost-btn:hover { border-color: ${ACCENT} !important; color: ${ACCENT} !important; }
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
          <button onClick={onBack} className="ghost-btn" style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
            ← Back
          </button>
        </div>
        <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
          Sign Out
        </button>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em", marginBottom: 6 }}>My Profile</h1>
          <p style={{ color: "#6B7FA3", fontSize: 14, lineHeight: 1.6 }}>
            Save your base resume once — it auto-loads on every tailoring session.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6B7FA3", fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            Loading profile…
          </div>
        ) : (
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 32 }}>

            {/* Contact fields — 2-column grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              <Field label="Full Name"    value={fullName}  onChange={setFullName}  placeholder="Ghanshyam Rajput" />
              <Field label="Phone"        value={phone}     onChange={setPhone}     placeholder="+91 98765 43210" />
              <Field label="Location"     value={location}  onChange={setLocation}  placeholder="Pune, India" />
              <Field label="LinkedIn URL" value={linkedin}  onChange={setLinkedin}  placeholder="linkedin.com/in/yourname" />
            </div>

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${BORDER}`, margin: "4px 0 24px" }} />

            {/* Base Resume */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: "#6B7FA3", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Base Resume
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {baseResume && (
                    <span style={{ fontSize: 11, color: "#4B5A70", fontFamily: "'DM Mono', monospace" }}>
                      {baseResume.length.toLocaleString()} chars
                    </span>
                  )}
                  <input ref={fileRef} type="file" accept=".txt,.md" onChange={handleFileUpload} style={{ display: "none" }} />
                  <button
                    className="ghost-btn"
                    onClick={() => fileRef.current.click()}
                    style={{ background: "transparent", border: `1px solid ${BORDER}`, color: "#6B7FA3", borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
                  >📁 Upload .txt</button>
                </div>
              </div>
              <textarea
                value={baseResume}
                onChange={e => setBaseResume(e.target.value)}
                onFocus={() => setResumeFocused(true)}
                onBlur={() => setResumeFocused(false)}
                placeholder={"Paste your honest resume here. This is your master resume — not tailored for any specific job."}
                style={{
                  width: "100%", minHeight: 320, background: DARK,
                  border: `1px solid ${resumeFocused ? ACCENT : BORDER}`,
                  borderRadius: 10, padding: 16, color: "#CBD5E1",
                  fontSize: 13, fontFamily: "'DM Mono', monospace",
                  lineHeight: 1.8, transition: "border-color 0.2s",
                }}
              />
            </div>

            {/* Save */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 24 }}>
              <button
                className="save-btn"
                onClick={handleSave}
                disabled={saving}
                style={{
                  background: saving ? BORDER : ACCENT,
                  color: saving ? "#4B5A70" : DARK,
                  border: "none", borderRadius: 10,
                  padding: "12px 28px", fontSize: 14, fontWeight: 700,
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
                }}
              >{saving ? "Saving…" : "Save Profile"}</button>

              {saved && (
                <span style={{ color: ACCENT, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                  ✓ Profile saved
                </span>
              )}
            </div>
          </div>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: "#2D3D52", marginTop: 48, fontFamily: "'DM Mono', monospace" }}>
          Mission HIRED 🔥 · Built by Ghanshyam · Powered by Claude
        </p>
      </div>
    </div>
  );
}
