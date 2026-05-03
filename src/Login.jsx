import { useState, useRef, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { LIGHT_THEME, DARK_THEME } from "./ThemeContext";

// ── Password strength ─────────────────────────────────────────────────────────
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

// ── Alert box ─────────────────────────────────────────────────────────────────
// variant: "error" | "success" | "info"
// alert: { text: string, action?: { label: string, fn: () => void } }
function AlertBox({ alert, variant = "error", onDismiss }) {
  if (!alert) return null;

  const styles = {
    error: {
      bg: "#FEF2F2", border: "#FCA5A5", text: "#DC2626",
      icon: "❌",
    },
    success: {
      bg: "#F0FDF4", border: "#86EFAC", text: "#16A34A",
      icon: "✅",
    },
    info: {
      bg: "#EFF6FF", border: "#BFDBFE", text: "#1D4ED8",
      icon: "ℹ️",
    },
  };
  const s = styles[variant];

  return (
    <div style={{
      background: s.bg, border: `1px solid ${s.border}`, borderRadius: 10,
      padding: "12px 14px",
      display: "flex", alignItems: "flex-start", gap: 10,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1.5 }}>{s.icon}</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: s.text, fontFamily: "'DM Mono', monospace", lineHeight: 1.6, margin: 0 }}>
          {alert.text}
        </p>
        {alert.action && (
          <button
            type="button"
            onClick={alert.action.fn}
            style={{
              marginTop: 6, background: "none", border: "none", padding: 0,
              color: s.text, fontSize: 12, fontFamily: "'DM Mono', monospace",
              fontWeight: 700, cursor: "pointer", textDecoration: "underline",
            }}
          >
            {alert.action.label}
          </button>
        )}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            background: "none", border: "none", padding: "0 2px",
            color: s.text, fontSize: 15, cursor: "pointer", lineHeight: 1,
            opacity: 0.6, flexShrink: 0,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}

// ── Value props ───────────────────────────────────────────────────────────────
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
      }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        autoComplete={type === "email" ? "email" : type === "password" ? "current-password" : "off"}
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

// ── Error normalisation ───────────────────────────────────────────────────────
// Maps raw Supabase / network error messages to user-friendly copies.
// Returns { text, action? } — action is optional { label, fn }.
function normalizeError(err, switchToLogin) {
  const raw = (err?.message || "").toLowerCase().trim();

  // ── Already registered ──
  if (
    raw.includes("user already registered") ||
    raw.includes("already registered") ||
    raw.includes("already exists")
  ) {
    return {
      text: "An account with this email already exists. Please log in instead.",
      action: { label: "Go to Login →", fn: switchToLogin },
    };
  }

  // ── Wrong credentials ──
  if (
    raw.includes("invalid login credentials") ||
    raw.includes("invalid credentials") ||
    raw.includes("wrong password")
  ) {
    return { text: "Incorrect email or password. Please try again." };
  }

  // ── Email not confirmed ──
  if (raw.includes("email not confirmed") || raw.includes("not confirmed")) {
    return { text: "Please confirm your email first — check your inbox." };
  }

  // ── Weak / short password (Supabase server-side) ──
  if (
    (raw.includes("password") && raw.includes("6")) ||
    raw.includes("password should be at least")
  ) {
    return { text: "Password must be at least 6 characters." };
  }

  // ── Rate limiting ──
  if (raw.includes("rate limit") || raw.includes("too many requests") || raw.includes("over_email_send_rate_limit")) {
    return { text: "Too many attempts. Please wait a minute and try again." };
  }

  // ── Network / fetch failure ──
  if (
    raw.includes("failed to fetch") ||
    raw.includes("network") ||
    raw.includes("networkerror") ||
    err?.name === "TypeError"
  ) {
    return { text: "Connection error. Please check your internet and try again." };
  }

  // ── Signup disabled ──
  if (raw.includes("signups not allowed") || raw.includes("signup disabled")) {
    return { text: "New signups are temporarily disabled. Please try again later." };
  }

  // ── Fallback: use Supabase message but capitalise it ──
  const msg = err?.message
    ? err.message.charAt(0).toUpperCase() + err.message.slice(1)
    : "Something went wrong. Please try again.";
  return { text: msg };
}

// ── Client-side validation ────────────────────────────────────────────────────
// Returns { text } on failure, null on pass.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(email, password, confirm, mode) {
  if (!email.trim())               return { text: "Please enter your email address." };
  if (!EMAIL_RE.test(email))       return { text: "Please enter a valid email address." };
  if (!password)                   return { text: "Please enter a password." };
  if (password.length < 6)         return { text: "Password must be at least 6 characters." };
  if (mode === "signup") {
    if (!confirm)                  return { text: "Please confirm your password." };
    if (password !== confirm)      return { text: "Passwords don't match." };
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Login({ emailConfirmed = false, onConfirmedDismiss = () => {} }) {
  const [isDark,     setIsDark]     = useState(false);   // default light
  const [mode,       setMode]       = useState("login"); // "login" | "signup"
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");
  const [confirm,    setConfirm]    = useState("");
  const [loading,    setLoading]    = useState(false);

  // error / success are { text, action? } objects, or null
  const [error,      setError]      = useState(null);
  const [success,    setSuccess]    = useState(null);
  const [resetSent,  setResetSent]  = useState(false);

  const errorTimerRef = useRef(null);
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  // Auto-dismiss email-confirmed banner after 5 seconds
  useEffect(() => {
    if (!emailConfirmed) return;
    const t = setTimeout(onConfirmedDismiss, 5000);
    return () => clearTimeout(t);
  }, [emailConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Alert helpers ──
  function showError(text, action = null) {
    clearTimeout(errorTimerRef.current);
    setError({ text, action });
    errorTimerRef.current = setTimeout(() => setError(null), 8000);
  }

  function dismissError() {
    clearTimeout(errorTimerRef.current);
    setError(null);
  }

  function showSuccess(text) {
    setSuccess({ text });
    setError(null);
  }

  // ── Mode switch ──
  function switchMode(next) {
    setMode(next);
    dismissError();
    setSuccess(null);
    setResetSent(false);
    setConfirm("");
    setPassword("");
  }

  // ── Forgot password ──
  function handleForgotPassword() {
    dismissError();
    setResetSent(true);
  }

  // ── Submit ──
  async function handleSubmit(e) {
    e.preventDefault();
    dismissError();
    setSuccess(null);
    setResetSent(false);

    // Client-side checks first — no API call needed
    const validationErr = validate(email, password, confirm, mode);
    if (validationErr) {
      showError(validationErr.text);
      return;
    }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) showError(normalizeError(err, () => switchMode("login")).text);
      } else {
        const { error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (err) {
          const normalized = normalizeError(err, () => switchMode("login"));
          showError(normalized.text, normalized.action ?? null);
        } else {
          showSuccess("Account created! Check your email to confirm, then log in.");
        }
      }
    } catch (e) {
      showError(normalizeError(e, () => switchMode("login")).text);
    } finally {
      setLoading(false);
    }
  }

  const confirmMismatch = mode === "signup" && confirm.length > 0 && confirm !== password;

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
        .lg-link:hover { text-decoration: underline !important; }
        .lg-toggle:hover { opacity: 0.8; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 2px; }
        @media (max-width: 640px) {
          .lg-left-panel  { display: none !important; }
          .lg-right-panel { border-radius: 20px !important; }
          .lg-mobile-logo { display: flex !important; }
        }
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
        background: theme.card, borderRadius: 20,
        boxShadow: isDark ? "0 24px 64px #000000A0" : "0 16px 48px #00000018",
        overflow: "hidden", border: `1px solid ${theme.border}`,
      }}>

        {/* ── Left panel ── */}
        <div
          className="lg-left-panel"
          style={{
            flex: "0 0 340px",
            background: "linear-gradient(160deg, #0F172A 0%, #1E3A5F 100%)",
            padding: "52px 40px",
            display: "flex", flexDirection: "column", justifyContent: "center",
          }}
        >
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
                <div style={{ width: 36, height: 36, flexShrink: 0, background: theme.accent + "18", border: `1px solid ${theme.accent}30`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>
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
        <div
          className="lg-right-panel"
          style={{ flex: 1, padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "center" }}
        >
          {/* Mobile-only logo */}
          <div className="lg-mobile-logo" style={{ display: "none", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 32, height: 32, background: theme.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⚡</div>
            <span style={{ fontSize: 20, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em" }}>
              Job<span style={{ color: theme.accent }}>Craft</span>
            </span>
          </div>

          {/* Email-confirmed banner */}
          {emailConfirmed && (
            <div style={{ marginBottom: 20 }}>
              <AlertBox
                alert={{ text: "Email confirmed! You can now log in." }}
                variant="success"
                onDismiss={onConfirmedDismiss}
              />
            </div>
          )}

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em", marginBottom: 4 }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p style={{ fontSize: 13, color: theme.textMuted, fontFamily: "'DM Mono', monospace" }}>
              {mode === "login" ? "Sign in to continue to JobCraft" : "Free forever · No credit card needed"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Email */}
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={v => { setEmail(v); dismissError(); }}
              placeholder="you@example.com"
              theme={theme}
            />

            {/* Password */}
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
                    style={{ background: "none", border: "none", color: theme.accent, fontSize: 11, fontFamily: "'DM Mono', monospace", cursor: "pointer", padding: 0 }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); dismissError(); }}
                required
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onFocus={e => (e.target.style.borderColor = theme.accent)}
                onBlur={e => (e.target.style.borderColor = theme.border)}
                style={{
                  width: "100%", background: theme.inputBg,
                  border: `1px solid ${theme.border}`,
                  borderRadius: 10, padding: "11px 14px", color: theme.text,
                  fontSize: 14, fontFamily: "'DM Mono', monospace",
                  outline: "none", transition: "border-color 0.2s",
                }}
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
                  onChange={e => { setConfirm(e.target.value); dismissError(); }}
                  required
                  placeholder="••••••••"
                  autoComplete="new-password"
                  onFocus={e => { if (!confirmMismatch) e.target.style.borderColor = theme.accent; }}
                  onBlur={e => { e.target.style.borderColor = confirmMismatch ? "#ef4444" : theme.border; }}
                  style={{
                    width: "100%", background: theme.inputBg,
                    border: `1px solid ${confirmMismatch ? "#ef4444" : theme.border}`,
                    borderRadius: 10, padding: "11px 14px", color: theme.text,
                    fontSize: 14, fontFamily: "'DM Mono', monospace",
                    outline: "none", transition: "border-color 0.2s",
                  }}
                />
                {confirmMismatch && (
                  <p style={{ fontSize: 11, color: "#DC2626", fontFamily: "'DM Mono', monospace", marginTop: 5 }}>
                    Passwords don't match
                  </p>
                )}
              </div>
            )}

            {/* Forgot-password info */}
            {resetSent && (
              <AlertBox
                alert={{
                  text: "Password reset via email is being set up. For now, please contact us at ghanshyamrajput84@gmail.com and we'll reset it manually.",
                }}
                variant="info"
                onDismiss={() => setResetSent(false)}
              />
            )}

            {/* Error */}
            <AlertBox alert={error} variant="error" onDismiss={dismissError} />

            {/* Success */}
            <AlertBox alert={success} variant="success" onDismiss={() => setSuccess(null)} />

            {/* Submit */}
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

          {/* Mode toggle */}
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

// ── Password Reset ────────────────────────────────────────────────────────────
// Rendered by App.jsx when Supabase fires the PASSWORD_RECOVERY auth event.
// Calls onDone() after signing out so App falls back to <Login>.
export function PasswordReset({ onDone }) {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("jobcraft-theme");
    return saved ? saved === "dark" : false; // default light for auth screens
  });
  const [newPw,      setNewPw]      = useState("");
  const [confirmPw,  setConfirmPw]  = useState("");
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);   // { text } | null
  const [success,    setSuccess]    = useState(false);
  const errorTimerRef = useRef(null);
  const theme = isDark ? DARK_THEME : LIGHT_THEME;

  function showError(text) {
    clearTimeout(errorTimerRef.current);
    setError({ text });
    errorTimerRef.current = setTimeout(() => setError(null), 8000);
  }
  function dismissError() {
    clearTimeout(errorTimerRef.current);
    setError(null);
  }

  const confirmMismatch = confirmPw.length > 0 && confirmPw !== newPw;

  async function handleSubmit(e) {
    e.preventDefault();
    dismissError();
    if (!newPw)             { showError("Please enter a new password.");         return; }
    if (newPw.length < 6)   { showError("Password must be at least 6 characters."); return; }
    if (!confirmPw)         { showError("Please confirm your new password.");    return; }
    if (newPw !== confirmPw){ showError("Passwords don't match.");               return; }

    setLoading(true);
    try {
      const { error: err } = await supabase.auth.updateUser({ password: newPw });
      if (err) {
        showError(err.message || "Failed to update password. Please try again.");
      } else {
        setSuccess(true);
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.history.replaceState(null, "", window.location.pathname);
          onDone();
        }, 2000);
      }
    } catch {
      showError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const accentColor = isDark ? DARK_THEME.accent : LIGHT_THEME.accent;

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
        .pr-submit:hover:not(:disabled) { filter: brightness(1.08); transform: translateY(-1px); }
      `}</style>

      {/* Theme toggle */}
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

      <div style={{
        width: "100%", maxWidth: 420,
        background: theme.card, borderRadius: 20,
        boxShadow: isDark ? "0 24px 64px #000000A0" : "0 16px 48px #00000018",
        border: `1px solid ${theme.border}`,
        padding: "48px 44px",
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 32 }}>
          <div style={{ width: 36, height: 36, background: accentColor, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <span style={{ fontSize: 20, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em" }}>
            Job<span style={{ color: accentColor }}>Craft</span>
          </span>
        </div>

        {/* Heading */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em", marginBottom: 4 }}>
            Set New Password
          </h1>
          <p style={{ fontSize: 13, color: theme.textMuted, fontFamily: "'DM Mono', monospace" }}>
            Choose a strong password for your account.
          </p>
        </div>

        {success ? (
          /* Success state */
          <div style={{ textAlign: "center", padding: "12px 0 8px" }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>✅</div>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#16A34A", fontFamily: "'Syne', sans-serif", marginBottom: 8 }}>
              Password updated!
            </p>
            <p style={{ fontSize: 13, color: theme.textMuted, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>
              Redirecting you to login…
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* New password */}
            <div>
              <label style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                New Password
              </label>
              <input
                type="password"
                value={newPw}
                onChange={e => { setNewPw(e.target.value); dismissError(); }}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                onFocus={e => (e.target.style.borderColor = accentColor)}
                onBlur={e => (e.target.style.borderColor = theme.border)}
                style={{
                  width: "100%", background: theme.inputBg,
                  border: `1px solid ${theme.border}`, borderRadius: 10,
                  padding: "11px 14px", color: theme.text,
                  fontSize: 14, fontFamily: "'DM Mono', monospace",
                  outline: "none", transition: "border-color 0.2s",
                }}
              />
              <StrengthBar password={newPw} />
            </div>

            {/* Confirm password */}
            <div>
              <label style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); dismissError(); }}
                required
                placeholder="••••••••"
                autoComplete="new-password"
                onFocus={e => { if (!confirmMismatch) e.target.style.borderColor = accentColor; }}
                onBlur={e => { e.target.style.borderColor = confirmMismatch ? "#ef4444" : theme.border; }}
                style={{
                  width: "100%", background: theme.inputBg,
                  border: `1px solid ${confirmMismatch ? "#ef4444" : theme.border}`,
                  borderRadius: 10, padding: "11px 14px", color: theme.text,
                  fontSize: 14, fontFamily: "'DM Mono', monospace",
                  outline: "none", transition: "border-color 0.2s",
                }}
              />
              {confirmMismatch && (
                <p style={{ fontSize: 11, color: "#DC2626", fontFamily: "'DM Mono', monospace", marginTop: 5 }}>
                  Passwords don't match
                </p>
              )}
            </div>

            {/* Error */}
            <AlertBox alert={error} variant="error" onDismiss={dismissError} />

            {/* Submit */}
            <button
              type="submit"
              className="pr-submit"
              disabled={loading || confirmMismatch}
              style={{
                background: loading || confirmMismatch ? theme.border : accentColor,
                color: loading || confirmMismatch ? theme.textFaint : isDark ? "#0A0F1E" : "#FFFFFF",
                border: "none", borderRadius: 10, padding: "13px",
                fontSize: 15, fontWeight: 700,
                cursor: loading || confirmMismatch ? "not-allowed" : "pointer",
                fontFamily: "'Syne', sans-serif",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Updating…" : "Update Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
