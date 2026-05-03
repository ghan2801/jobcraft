import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { useTheme } from "./ThemeContext";

// ── Reusable field ────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, type = "text", disabled = false, note }) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block", fontSize: 11, color: theme.textMuted,
        fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 6,
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange && onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoComplete={type === "password" ? "current-password" : "off"}
        style={{
          width: "100%",
          background: disabled ? (theme.cardAlt || theme.card) : theme.inputBg,
          border: `1px solid ${focused && !disabled ? theme.accent : theme.border}`,
          borderRadius: 8, padding: "10px 14px", color: disabled ? theme.textMuted : theme.text,
          fontSize: 13, fontFamily: "'DM Mono', monospace",
          outline: "none", transition: "border-color 0.2s",
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? 0.75 : 1,
        }}
      />
      {note && (
        <p style={{ fontSize: 11, color: theme.textFaint, fontFamily: "'DM Mono', monospace", marginTop: 5, lineHeight: 1.5 }}>
          {note}
        </p>
      )}
    </div>
  );
}

// ── Password strength bar (same logic as Login.jsx) ───────────────────────────
function getStrength(pw) {
  if (!pw) return null;
  const long   = pw.length >= 10;
  const medium = pw.length >= 8;
  const hasNum = /[0-9]/.test(pw);
  const hasCap = /[A-Z]/.test(pw);
  const hasSym = /[^A-Za-z0-9]/.test(pw);
  if (long && hasNum && hasCap && hasSym) return "strong";
  if (medium && (hasNum || hasCap))       return "medium";
  return "weak";
}
const STRENGTH_META = {
  weak:   { label: "Weak",   color: "#ef4444", bars: 1 },
  medium: { label: "Medium", color: "#f59e0b", bars: 2 },
  strong: { label: "Strong", color: "#22c55e", bars: 3 },
};
function StrengthBar({ password }) {
  const s = getStrength(password);
  if (!s) return null;
  const { label, color, bars } = STRENGTH_META[s];
  return (
    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ display: "flex", gap: 3, flex: 1 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= bars ? color : "#e2e8f0", transition: "background 0.25s" }} />
        ))}
      </div>
      <span style={{ fontSize: 10, color, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{label}</span>
    </div>
  );
}

// ── Inline status message ─────────────────────────────────────────────────────
function StatusMsg({ msg }) {
  if (!msg) return null;
  const isError = msg.startsWith("❌") || msg.startsWith("Error") || msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("incorrect") || msg.toLowerCase().includes("wrong") || msg.toLowerCase().includes("don't match");
  return (
    <p style={{
      fontSize: 12, fontFamily: "'DM Mono', monospace", lineHeight: 1.6, marginTop: 4,
      color: isError ? "#DC2626" : "#16A34A",
    }}>{msg}</p>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  const { theme } = useTheme();
  return (
    <div style={{
      background: theme.card, border: `1px solid ${theme.border}`,
      borderRadius: 14, padding: "28px 32px", marginBottom: 20,
    }}>
      <h2 style={{
        fontSize: 15, fontWeight: 700, color: theme.textStrong,
        fontFamily: "'Syne', sans-serif", marginBottom: 22,
        paddingBottom: 14, borderBottom: `1px solid ${theme.border}`,
      }}>{title}</h2>
      {children}
    </div>
  );
}

// ── Delete confirmation modal ─────────────────────────────────────────────────
function DeleteModal({ onClose, theme, isDark }) {
  const [typed, setTyped] = useState("");
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 24,
      }}
    >
      <div style={{
        background: theme.card, border: `1px solid ${theme.border}`,
        borderRadius: 16, padding: "32px 28px", width: "100%", maxWidth: 420,
        fontFamily: "'Syne', sans-serif",
      }}>
        <div style={{ fontSize: 36, textAlign: "center", marginBottom: 16 }}>⚠️</div>
        <h3 style={{ fontSize: 18, fontWeight: 800, color: "#DC2626", textAlign: "center", marginBottom: 10 }}>
          Delete Account
        </h3>
        <p style={{ fontSize: 13, color: theme.textMuted, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, textAlign: "center", marginBottom: 20 }}>
          This will permanently delete your account and all your data. This action cannot be undone.
        </p>
        <div style={{ background: isDark ? "#1c0a0a" : "#fef2f2", border: "1px solid #fca5a5", borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: "#DC2626", fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
            To delete your account, please contact us at{" "}
            <strong>ghanshyamrajput84@gmail.com</strong>{" "}
            with the subject "Delete my account". We'll process it within 24 hours.
          </p>
        </div>
        <button
          onClick={onClose}
          style={{
            width: "100%", background: theme.accent,
            color: isDark ? "#0A0F1E" : "#fff",
            border: "none", borderRadius: 10, padding: "12px",
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            fontFamily: "'Syne', sans-serif",
          }}
        >
          OK, Got It
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AccountSettings({ session, onBack, onLogout }) {
  const { theme, isDark, toggleTheme } = useTheme();

  // ── Section 1: Personal info ──
  const [fullName,  setFullName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [location,  setLocation]  = useState("");
  const [linkedin,  setLinkedin]  = useState("");
  const [infoLoading, setInfoLoading] = useState(true);
  const [infoSaving,  setInfoSaving]  = useState(false);
  const [infoMsg,     setInfoMsg]     = useState("");

  // ── Section 2: Change password ──
  const [currentPw,  setCurrentPw]  = useState("");
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [pwSaving,   setPwSaving]   = useState(false);
  const [pwMsg,      setPwMsg]      = useState("");

  // ── Section 3: Account info ──
  const [appCount, setAppCount] = useState(null);

  // ── Section 4: Danger zone ──
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ── Load profile on mount ──
  useEffect(() => {
    async function load() {
      const [profileRes, countRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", session.user.id).single(),
        supabase.from("applications").select("*", { count: "exact", head: true }).eq("user_id", session.user.id),
      ]);
      if (profileRes.data) {
        setFullName(profileRes.data.full_name   || "");
        setPhone(profileRes.data.phone          || "");
        setLocation(profileRes.data.location    || "");
        setLinkedin(profileRes.data.linkedin    || "");
      }
      setAppCount(countRes.count ?? 0);
      setInfoLoading(false);
    }
    load();
  }, [session.user.id]);

  // ── Save personal info ──
  async function handleSaveInfo() {
    setInfoSaving(true);
    setInfoMsg("");
    const { error } = await supabase.from("profiles").upsert({
      id:         session.user.id,
      email:      session.user.email,
      full_name:  fullName,
      phone,
      location,
      linkedin,
      updated_at: new Date().toISOString(),
    });
    setInfoSaving(false);
    setInfoMsg(error ? `❌ ${error.message}` : "✅ Profile updated.");
    if (!error) setTimeout(() => setInfoMsg(""), 3000);
  }

  // ── Change password ──
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwMsg("");
    if (!currentPw)               { setPwMsg("❌ Enter your current password.");     return; }
    if (!newPw)                   { setPwMsg("❌ Enter a new password.");             return; }
    if (newPw.length < 8)         { setPwMsg("❌ New password must be at least 8 characters."); return; }
    if (newPw === currentPw)      { setPwMsg("❌ New password must differ from current."); return; }
    if (newPw !== confirmPw)      { setPwMsg("❌ New passwords don't match.");        return; }

    setPwSaving(true);
    // Step 1: verify current password
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPw,
    });
    if (verifyErr) {
      setPwSaving(false);
      setPwMsg("❌ Current password is incorrect.");
      return;
    }
    // Step 2: update to new password
    const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (updateErr) {
      setPwMsg(`❌ ${updateErr.message}`);
    } else {
      setPwMsg("✅ Password updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwMsg(""), 4000);
    }
  }

  const confirmPwMismatch = confirmPw.length > 0 && confirmPw !== newPw;
  const memberSince = session.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: "'Syne', sans-serif", color: theme.text, transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus, button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.background}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        .as-save-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
        .as-ghost-btn:hover { border-color: ${theme.accent} !important; color: ${theme.accent} !important; }
        .as-danger-btn:hover { background: #DC262615 !important; }
      `}</style>

      {showDeleteModal && (
        <DeleteModal onClose={() => setShowDeleteModal(false)} theme={theme} isDark={isDark} />
      )}

      {/* ── Header ── */}
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
          <button onClick={onBack} className="as-ghost-btn" style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
            ← Back
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"} style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}>
            {isDark ? "☀️" : "🌙"}
          </button>
          <button onClick={onLogout} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 40px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em", marginBottom: 6 }}>⚙️ Account Settings</h1>
          <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.6 }}>Manage your personal info, password, and account.</p>
        </div>

        {infoLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            Loading…
          </div>
        ) : (
          <>
            {/* ── Section 1: Personal Info ── */}
            <SectionCard title="👤 Personal Information">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                <Field label="Full Name"    value={fullName}  onChange={setFullName}  placeholder="Your full name" />
                <Field label="Phone"        value={phone}     onChange={setPhone}     placeholder="+91 98765 43210" />
                <Field label="Location"     value={location}  onChange={setLocation}  placeholder="City, Country" />
                <Field label="LinkedIn URL" value={linkedin}  onChange={setLinkedin}  placeholder="linkedin.com/in/yourname" />
              </div>
              <Field
                label="Email"
                value={session.user.email}
                onChange={() => {}}
                disabled
                note="To change your email, contact ghanshyamrajput84@gmail.com"
              />
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 8 }}>
                <button
                  className="as-save-btn"
                  onClick={handleSaveInfo}
                  disabled={infoSaving}
                  style={{
                    background: infoSaving ? theme.border : theme.accent,
                    color: infoSaving ? theme.textFaint : isDark ? "#0A0F1E" : "#fff",
                    border: "none", borderRadius: 10, padding: "11px 26px",
                    fontSize: 13, fontWeight: 700, cursor: infoSaving ? "not-allowed" : "pointer",
                    fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
                  }}
                >
                  {infoSaving ? "Saving…" : "Save Changes"}
                </button>
                {infoMsg && <StatusMsg msg={infoMsg} />}
              </div>
            </SectionCard>

            {/* ── Section 2: Change Password ── */}
            <SectionCard title="🔒 Change Password">
              <form onSubmit={handleChangePassword} noValidate>
                <Field
                  label="Current Password"
                  type="password"
                  value={currentPw}
                  onChange={v => { setCurrentPw(v); setPwMsg(""); }}
                  placeholder="••••••••"
                />
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPw}
                    onChange={e => { setNewPw(e.target.value); setPwMsg(""); }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    onFocus={e => (e.target.style.borderColor = theme.accent)}
                    onBlur={e => (e.target.style.borderColor = theme.border)}
                    style={{ width: "100%", background: theme.inputBg, border: `1px solid ${theme.border}`, borderRadius: 8, padding: "10px 14px", color: theme.text, fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", transition: "border-color 0.2s" }}
                  />
                  <StrengthBar password={newPw} />
                </div>
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={e => { setConfirmPw(e.target.value); setPwMsg(""); }}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    onFocus={e => { if (!confirmPwMismatch) e.target.style.borderColor = theme.accent; }}
                    onBlur={e => { e.target.style.borderColor = confirmPwMismatch ? "#ef4444" : theme.border; }}
                    style={{ width: "100%", background: theme.inputBg, border: `1px solid ${confirmPwMismatch ? "#ef4444" : theme.border}`, borderRadius: 8, padding: "10px 14px", color: theme.text, fontSize: 13, fontFamily: "'DM Mono', monospace", outline: "none", transition: "border-color 0.2s" }}
                  />
                  {confirmPwMismatch && (
                    <p style={{ fontSize: 11, color: "#DC2626", fontFamily: "'DM Mono', monospace", marginTop: 5 }}>Passwords don't match</p>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    type="submit"
                    className="as-save-btn"
                    disabled={pwSaving || confirmPwMismatch}
                    style={{
                      background: pwSaving || confirmPwMismatch ? theme.border : theme.accent,
                      color: pwSaving || confirmPwMismatch ? theme.textFaint : isDark ? "#0A0F1E" : "#fff",
                      border: "none", borderRadius: 10, padding: "11px 26px",
                      fontSize: 13, fontWeight: 700, cursor: pwSaving || confirmPwMismatch ? "not-allowed" : "pointer",
                      fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
                    }}
                  >
                    {pwSaving ? "Updating…" : "Update Password"}
                  </button>
                  {pwMsg && <StatusMsg msg={pwMsg} />}
                </div>
              </form>
            </SectionCard>

            {/* ── Section 3: Account Info ── */}
            <SectionCard title="📋 Account Info">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { label: "Email",                value: session.user.email },
                  { label: "Member Since",          value: memberSince },
                  { label: "Total Applications",    value: appCount !== null ? String(appCount) : "—" },
                  { label: "Account Type",          value: "Free" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ padding: "14px 16px", background: theme.cardAlt || theme.background, border: `1px solid ${theme.border}`, borderRadius: 10 }}>
                    <p style={{ fontSize: 10, color: theme.textFaint, fontFamily: "'DM Mono', monospace", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>{label}</p>
                    <p style={{ fontSize: 14, fontWeight: 700, color: theme.textStrong, fontFamily: "'DM Mono', monospace", wordBreak: "break-all" }}>{value}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* ── Section 4: Danger Zone ── */}
            <SectionCard title="⚠️ Danger Zone">
              <p style={{ fontSize: 13, color: theme.textMuted, fontFamily: "'DM Mono', monospace", lineHeight: 1.7, marginBottom: 18 }}>
                Permanently delete your account and all associated data including your resume, applications, and prep plans. This cannot be undone.
              </p>
              <button
                className="as-danger-btn"
                onClick={() => setShowDeleteModal(true)}
                style={{
                  background: "transparent", border: "1px solid #DC2626",
                  color: "#DC2626", borderRadius: 10, padding: "10px 22px",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                  fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
                }}
              >
                🗑️ Delete Account
              </button>
            </SectionCard>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textFaint, marginTop: 48, fontFamily: "'DM Mono', monospace" }}>
          Mission HIRED 🔥 · Built by Ghanshyam · Powered by Claude
        </p>
      </div>
    </div>
  );
}
