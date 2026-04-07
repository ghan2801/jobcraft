import { useState } from "react";
import { supabase } from "./supabaseClient";

const ACCENT = "#00E5A0";
const DARK = "#0A0F1E";
const CARD = "#111827";
const BORDER = "#1E2D40";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [successMsg, setSuccessMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

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

  return (
    <div style={{ minHeight: "100vh", background: DARK, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Syne', sans-serif", color: "#CBD5E1" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input:focus { outline: none; border-color: ${ACCENT} !important; }
        button:focus { outline: none; }
        .login-btn:hover { background: #00FFB3 !important; transform: translateY(-1px); }
        .toggle-btn:hover { color: ${ACCENT} !important; }
      `}</style>

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, padding: "48px 40px", width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, background: ACCENT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
            <span style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>Job<span style={{ color: ACCENT }}>Craft</span></span>
          </div>
          <p style={{ color: "#6B7FA3", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>
            {mode === "login" ? "Sign in to tailor your resume" : "Create your free account"}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 11, color: "#6B7FA3", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{ width: "100%", background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", color: "#CBD5E1", fontSize: 14, fontFamily: "'DM Mono', monospace", transition: "border-color 0.2s" }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: "#6B7FA3", fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              style={{ width: "100%", background: "#0A0F1E", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", color: "#CBD5E1", fontSize: 14, fontFamily: "'DM Mono', monospace", transition: "border-color 0.2s" }}
            />
          </div>

          {error && (
            <p style={{ color: "#FF6B6B", fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{error}</p>
          )}
          {successMsg && (
            <p style={{ color: ACCENT, fontSize: 13, fontFamily: "'DM Mono', monospace" }}>{successMsg}</p>
          )}

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
            style={{ background: loading ? BORDER : ACCENT, color: loading ? "#4B5A70" : DARK, border: "none", borderRadius: 10, padding: "13px", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: "'Syne', sans-serif", marginTop: 4, transition: "all 0.2s" }}
          >
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#4B5A70" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button
            className="toggle-btn"
            onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setSuccessMsg(""); }}
            style={{ background: "none", border: "none", color: "#6B7FA3", cursor: "pointer", fontSize: 13, fontFamily: "'Syne', sans-serif", textDecoration: "underline", transition: "color 0.2s" }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
