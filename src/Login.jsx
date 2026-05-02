import { useState } from "react";
import { supabase } from "./supabaseClient";
import { LIGHT_THEME, DARK_THEME } from "./ThemeContext";

// ── Password strength helper ──────────────────────────────────────────────────
function getStrength(pw) {
  if (!pw) return null;
  const long    = pw.length >= 10;
  const medium  = pw.length >= 8;
  const hasNum  = /[0-9]/.test(pw);
  const hasCap  = /[A-Z]/.test(pw);
  const hasSym  = /[^A-Za-z0-9]/.test(pw);
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
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 3,
            background: i <= bars ? color : "#e2e8f0",
            transition: "background 0.25s",
          }} />
        ))}
      </div>
      <span style={{ fontSize: 10, color, fontFamily: "'DM Mono', monospace", fontWeight: 700, whiteSpace: "nowrap" }}>
        {label}
      </span>
    </div>
  );
}

// ── Value props shown on the left panel ──────────────────────────────────────
const VALUE_PROPS = [
  { emoji: "🎯", text: "Tailor your resume in 30 seconds" },
  { emoji: "📊", text: "Beat ATS filters every time" },
  { emoji: "🎓", text: "Get personalised interview prep" },
  { emoji: "✅", text: "Track all your applications" },
];

// ── Input field ───────────────────────────────────────────────────────────────
function Field({ label, type, value, onChange, placeholder, theme, children }) {
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <label style={{
        fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace",
        letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6,
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: theme.inputBg,
          border: `1px solid ${focused ? theme.accent : theme.border}`,
          borderRadius: 10, padding: "11px 14px", color: theme.text,
          fontSize: 14, fontFamily: "'DM Mono', monospace",
          outline: "none", transition: "border-color 0.2s",
        }}
      />
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Login() {
  const [isDark,       setIsDark]       = useState(false);  // default light
  const [mode,         setMode]         = useState("login"); // "login" | "signup"
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [successMsg,   setSuccessMsg]   = useState("");
  const [resetSent,    setResetSent]    = useState(false);

  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  function switchMode(next) {
    setMode(next);
    setError("");
    setSuccessMsg("");
    setResetSent(false);
    setConfirm("");
    setPassword("");
  }

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email above first."); return; }
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setResetSent(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setResetSent(false);

    if (mode === "signup") {
      if (password !== confirm) { setError("Passwords don't match."); return; }
      if (getStrength(password) === "weak") { setError("Password too weak — use 8+ characters."); return; }
    }

    setLoading(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setSuccessMsg("Account created! Check your email to confirm, then log in.");
    }
    setLoading(false);
  }

  const confirmMismatch = mode === "signup" && confirm && confirm !== password;

  return (
    <div style={{
      minHeight: "100vh",
      background: isDark ? theme.background : "#EEF2FF",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Syne', sans-serif", color: theme.text,
      padding: "24px 16px",
      transition: "background 0.3s, color 0.3s",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .lg-submit:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
        .lg-link:hover { text-decoration: underline; }
        .lg-toggle:hover { color: ${theme.accent} !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 2px; }
      `}</style>

      {/* Theme toggle — fixed top-right */}
      <button
        onClick={() => setIsDark(d => !d)}
        title={isDark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          position: "fixed", top: 20, right: 20, zIndex: 100,
          background: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 8, padding: "6px 10px", fontSize: 16,
          cursor: "pointer", lineHeight: 1, boxShadow: "0 2px 8px #00000018",
        }}
      >{isDark ? "☀️" : "🌙"}</button>

      {/* ── Two-panel card ── */}
      <div style={{
        display: "flex", width: "100%", maxWidth: 860,
        background: theme.card,
        borderRadius: 20,
        boxShadow: isDark ? "0 24px 64px #000000A0" : "0 16px 48px #00000018",
        overflow: "hidden",
        border: `1px solid ${theme.border}`,
      }}>

        {/* ── Left panel — value props ── */}
        <div style={{
          flex: "0 0 340px",
          background: isDark
            ? "linear-gradient(160deg, #0D1A2F 0%, #0A1628 100%)"
            : "linear-gradient(160deg, #0F172A 0%, #1E3A5F 100%)",
          padding: "52px 40px",
          display: "flex", flexDirection: "column", justifyContent: "center",
          // Hidden on mobile via a media query workaround using inline style only
        }} className="lg-left-panel">
          <style>{`
            @media (max-width: 640px) { .lg-left-panel { display: none !important; } }
            @media (max-width: 640px) { .lg-right-panel { border-radius: 20px !important; } }
          `}</style>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40 }}>
            <div style={{ width: 38, height: 38, background: theme.accent, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⚡</div>
            <span style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.02em" }}>
              Job<span style={{ color: theme.accent }}>Craft</span>
            </span>
          </div>

          <h2 style={{ fontSize: 26, fontWeight: 800, color: "#FFFFFF", lineHeight: 1.3, marginBottom: 10, letterSpacing: "-0.02em" }}>
            Land your dream job faster.
          </h2>
          <p style={{ fontSize: 13, color: "#94A3B8", fontFamily: "'DM Mono', monospace", lineHeight: 1.7, marginBottom: 36 }}>
            AI-powered resume tailoring and interview coaching, built for ambitious job seekers.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {VALUE_PROPS.map(({ emoji, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, flexShrink: 0,
                  background: theme.accent + "18", border: `1px solid ${theme.accent}30`,
                  borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                }}>
                  {emoji}
                </div>
                <span style={{ fontSize: 13, color: "#CBD5E1", fontFamily: "'DM Mono', monospace", lineHeight: 1.4 }}>
                  {text}
                </span>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 44, padding: "16px 18px", background: "#ffffff08", borderRadius: 12, border: "1px solid #ffffff12" }}>
            <p style={{ fontSize: 12, color: "#94A3B8", fontFamily: "'DM Mono', monospace", lineHeight: 1.6, fontStyle: "italic" }}>
              "JobCraft helped me go from 12% to 89% ATS score — got the interview within a week."
            </p>
            <p style={{ fontSize: 11, color: "#64748B", fontFamily: "'DM Mono', monospace", marginTop: 8 }}>— Early user feedback</p>
          </div>
        </div>

        {/* ── Right panel — form ── */}
        <div className="lg-right-panel" style={{ flex: 1, padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "center" }}>

          {/* Header */}
          <div style={{ marginBottom: 32 }}>
            {/* Mobile-only logo */}
            <div className="lg-mobile-logo" style={{ display: "none", alignItems: "center", gap: 10, marginBottom: 24 }}>
              <style>{`.lg-mobile-logo { display: none !important; } @media (max-width: 640px) { .lg-mobile-logo { display: flex !important; } }`}</style>
              <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
              <span style={{ fontSize: 20, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em" }}>
                Job<span style={{ color: theme.accent }}>Craft</span>
              </span>
            </div>

            <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em", marginBottom: 4 }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontSize: 13, color: theme.textMuted, fontFamily: "'DM Mono', monospace" }}>
              {mode === "login" ? "Sign in to continue to JobCraft" : "Free forever · No credit card needed"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" theme={theme} />

            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <label style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    className="lg-link"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    style={{ background: "none", border: "none", color: theme.accent, fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer", padding: 0, textDecoration: "none" }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{
                  width: "100%", background: theme.inputBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10, padding: "11px 14px", color: theme.text,
                  fontSize: 14, fontFamily: "'DM Mono', monospace",
                  outline: "none", transition: "border-color 0.2s",
                }}
                onFocus={e => e.target.style.borderColor = theme.accent}
                onBlur={e => e.target.style.borderColor = theme.border}
              />
              {mode === "signup" && <StrengthBar password={password} />}
            </div>

            {/* Confirm password — signup only */}
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{
                    width: "100%", background: theme.inputBg,
                    border: `1px solid ${confirmMismatch ? "#ef4444" : theme.border}`,
                    borderRadius: 10, padding: "11px 14px", color: theme.text,
                    fontSize: 14, fontFamily: "'DM Mono', monospace",
                    outline: "none", transition: "border-color 0.2s",
                  }}
                  onFocus={e => { if (!confirmMismatch) e.target.style.borderColor = theme.accent; }}
                  onBlur={e => { e.target.style.borderColor = confirmMismatch ? "#ef4444" : theme.border; }}
                />
                {confirmMismatch && (
                  <p style={{ fontSize: 11, color: "#ef4444", fontFamily: "'DM Mono', monospace", marginTop: 5 }}>
                    Passwords don't match
                  </p>
                )}
              </div>
            )}

            {/* Reset sent message */}
            {resetSent && (
              <div style={{ padding: "10px 14px", background: theme.accent + "15", border: `1px solid ${theme.accent}40`, borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: theme.accent, fontFamily: "'DM Mono', monospace" }}>
                  ✅ Reset link sent — check your email.
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ padding: "10px 14px", background: "#ef444412", border: "1px solid #ef444430", borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: "#ef4444", fontFamily: "'DM Mono', monospace" }}>{error}</p>
              </div>
            )}

            {/* Success */}
            {successMsg && (
              <div style={{ padding: "10px 14px", background: theme.accent + "15", border: `1px solid ${theme.accent}40`, borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: theme.accent, fontFamily: "'DM Mono', monospace" }}>{successMsg}</p>
              </div>
            )}

            <button
              type="submit"
              className="lg-submit"
              disabled={loading || confirmMismatch}
              style={{
                background: loading || confirmMismatch ? theme.border : theme.accent,
                color: loading || confirmMismatch ? theme.textFaint : isDark ? "#0A0F1E" : "#FFFFFF",
                border: "none", borderRadius: 10, padding: "13px",
                fontSize: 15, fontWeight: 700,
                cursor: loading || confirmMismatch ? "not-allowed" : "pointer",
                fontFamily: "'Syne', sans-serif", marginTop: 4,
                transition: "all 0.2s",
              }}
            >
              {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          {/* Toggle */}
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: theme.textMuted, fontFamily: "'DM Mono', monospace" }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              className="lg-toggle"
              onClick={() => switchMode(mode === "login" ? "signup" : "login")}
              style={{
                background: "none", border: "none", color: theme.accent,
                cursor: "pointer", fontSize: 13, fontFamily: "'DM Mono', monospace",
                fontWeight: 700, padding: 0,
              }}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
