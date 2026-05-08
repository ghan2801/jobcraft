/*
 * ── Supabase SQL (run once in dashboard) ──────────────────────────────────────
 *
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS visa_status text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marital_status text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS languages jsonb DEFAULT '[]';
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_1_name text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_1_title text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_1_company text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_1_email text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_1_phone text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_1_relationship text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_2_name text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_2_title text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_2_company text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_2_email text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_2_phone text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referee_2_relationship text;
 * ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signature_city text;
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { useTheme } from "./ThemeContext";
import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const TABS = [
  { id: "basic",    label: "Basic Info" },
  { id: "personal", label: "Personal Details" },
  { id: "languages",label: "Languages" },
  { id: "referees", label: "References" },
];

// Max date: must be at least 18 years old
const _today = new Date();
const DOB_MAX = new Date(_today.getFullYear() - 18, _today.getMonth(), _today.getDate())
  .toISOString().split("T")[0]; // YYYY-MM-DD

const LANG_LEVELS = ["Native", "C2", "C1", "B2", "B1", "A2", "A1"];
const MARITAL_OPTIONS = ["Prefer not to say", "Single", "Married", "Other"];
const REFEREE_RELS = ["Direct Manager", "Senior Colleague", "Client", "Other"];

function Field({ label, value, onChange, placeholder, type = "text", readOnly = false }) {
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
        onChange={e => !readOnly && onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", background: readOnly ? "transparent" : theme.inputBg,
          border: `1px solid ${focused && !readOnly ? theme.accent : theme.border}`,
          borderRadius: 8, padding: "10px 14px", color: readOnly ? theme.textMuted : theme.text,
          fontSize: 13, fontFamily: "'DM Mono', monospace",
          outline: "none", transition: "border-color 0.2s",
          cursor: readOnly ? "default" : "text",
        }}
      />
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  const { theme } = useTheme();
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: "block", fontSize: 11, color: theme.textMuted,
        fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em",
        textTransform: "uppercase", marginBottom: 6,
      }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%", background: theme.inputBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 8, padding: "10px 14px", color: theme.text,
          fontSize: 13, fontFamily: "'DM Mono', monospace",
          outline: "none",
        }}
      >
        {options.map(o => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function SectionNote({ children }) {
  const { theme, isDark } = useTheme();
  return (
    <div style={{
      background: isDark ? "#0D1F3C" : "#EFF6FF",
      border: `1px solid ${isDark ? "#1B3A6A" : "#BFDBFE"}`,
      borderRadius: 10, padding: "10px 14px", marginBottom: 22,
      display: "flex", gap: 10, alignItems: "flex-start",
    }}>
      <span style={{ fontSize: 15, flexShrink: 0 }}>ℹ️</span>
      <p style={{ fontSize: 12, color: isDark ? "#93C5FD" : "#1E40AF", fontFamily: "'DM Mono', monospace", lineHeight: 1.6, margin: 0 }}>
        {children}
      </p>
    </div>
  );
}

function RefereeBlock({ n, fields, onChange }) {
  const { theme } = useTheme();
  const pfx = `ref${n}`;
  return (
    <div style={{ background: theme.cardAlt, border: `1px solid ${theme.border}`, borderRadius: 12, padding: 20, marginBottom: 18 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: theme.textStrong, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em", marginBottom: 14, textTransform: "uppercase" }}>
        Referee {n}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <Field label="Full Name"    value={fields[`${pfx}Name`]}    onChange={v => onChange(`${pfx}Name`, v)}    placeholder="e.g. Jane Smith" />
        <Field label="Job Title"    value={fields[`${pfx}Title`]}   onChange={v => onChange(`${pfx}Title`, v)}   placeholder="e.g. Senior Manager" />
        <Field label="Company"      value={fields[`${pfx}Company`]} onChange={v => onChange(`${pfx}Company`, v)} placeholder="e.g. Accenture" />
        <Field label="Email"        value={fields[`${pfx}Email`]}   onChange={v => onChange(`${pfx}Email`, v)}   placeholder="e.g. jane@company.com" type="email" />
        <Field label="Phone"        value={fields[`${pfx}Phone`]}   onChange={v => onChange(`${pfx}Phone`, v)}   placeholder="e.g. +44 7700 900000" />
        <Select label="Relationship" value={fields[`${pfx}Rel`]} onChange={v => onChange(`${pfx}Rel`, v)} options={REFEREE_RELS} />
      </div>
    </div>
  );
}

export default function Profile({ session, onBack, onLogout }) {
  const { theme, isDark, toggleTheme } = useTheme();

  // Basic
  const [fullName,   setFullName]   = useState("");
  const [phone,      setPhone]      = useState("");
  const [location,   setLocation]   = useState("");
  const [linkedin,   setLinkedin]   = useState("");
  const [baseResume, setBaseResume] = useState("");

  // Photo
  const [avatarUrl,      setAvatarUrl]      = useState(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoMsg,       setPhotoMsg]       = useState("");

  // Personal Details
  const [dateOfBirth,   setDateOfBirth]   = useState("");
  const [nationality,   setNationality]   = useState("");
  const [visaStatus,    setVisaStatus]    = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Prefer not to say");
  const [signatureCity, setSignatureCity] = useState("");

  // Languages
  const [languages, setLanguages] = useState([]);
  const [langName,  setLangName]  = useState("");
  const [langLevel, setLangLevel] = useState("Native");

  // Referees (flat state — easier to bind)
  const [ref1Name,    setRef1Name]    = useState("");
  const [ref1Title,   setRef1Title]   = useState("");
  const [ref1Company, setRef1Company] = useState("");
  const [ref1Email,   setRef1Email]   = useState("");
  const [ref1Phone,   setRef1Phone]   = useState("");
  const [ref1Rel,     setRef1Rel]     = useState("Direct Manager");

  const [ref2Name,    setRef2Name]    = useState("");
  const [ref2Title,   setRef2Title]   = useState("");
  const [ref2Company, setRef2Company] = useState("");
  const [ref2Email,   setRef2Email]   = useState("");
  const [ref2Phone,   setRef2Phone]   = useState("");
  const [ref2Rel,     setRef2Rel]     = useState("Direct Manager");

  // UI
  const [activeTab,      setActiveTab]      = useState("basic");
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [resumeFocused,  setResumeFocused]  = useState(false);
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileError,      setFileError]      = useState("");

  const fileRef  = useRef();
  const photoRef = useRef();

  useEffect(() => { fetchProfile(); }, []);

  async function fetchProfile() {
    const { data, error } = await supabase.from("profiles").select("*").eq("id", session.user.id).single();
    console.log("Loaded profile:", data);
    if (error) console.error("Profile load error:", error);
    if (data) {
      setFullName(data.full_name    || "");
      setPhone(data.phone           || "");
      setLocation(data.location     || "");
      setLinkedin(data.linkedin     || "");
      setBaseResume(data.base_resume || "");
      if (data.avatar_url) setAvatarUrl(data.avatar_url);

      setDateOfBirth(data.date_of_birth  || "");
      setNationality(data.nationality    || "");
      setVisaStatus(data.visa_status     || "");
      setMaritalStatus(data.marital_status || "Prefer not to say");
      setSignatureCity(data.signature_city || "");

      if (Array.isArray(data.languages)) setLanguages(data.languages);
      else if (data.languages) { try { setLanguages(JSON.parse(data.languages)); } catch { setLanguages([]); } }

      setRef1Name(data.referee_1_name         || "");
      setRef1Title(data.referee_1_title        || "");
      setRef1Company(data.referee_1_company    || "");
      setRef1Email(data.referee_1_email        || "");
      setRef1Phone(data.referee_1_phone        || "");
      setRef1Rel(data.referee_1_relationship   || "Direct Manager");

      setRef2Name(data.referee_2_name         || "");
      setRef2Title(data.referee_2_title        || "");
      setRef2Company(data.referee_2_company    || "");
      setRef2Email(data.referee_2_email        || "");
      setRef2Phone(data.referee_2_phone        || "");
      setRef2Rel(data.referee_2_relationship   || "Direct Manager");
    }
    setLoading(false);
  }

  async function uploadPhoto(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setPhotoMsg("error:File too large. Max 5MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoMsg("error:Please upload a JPEG, PNG or WebP image."); return;
    }
    setPhotoUploading(true); setPhotoMsg("");
    try {
      const ext = file.name.split(".").pop().toLowerCase();
      const fileName = `${session.user.id}/avatar.${ext}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true, contentType: file.type });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", session.user.id);
      setAvatarUrl(urlData.publicUrl);
      setPhotoMsg("success");
      setTimeout(() => setPhotoMsg(""), 3000);
    } catch (err) {
      setPhotoMsg("error:" + (err.message || "Upload failed."));
    } finally { setPhotoUploading(false); }
  }

  async function removePhoto() {
    setPhotoUploading(true);
    try { await supabase.storage.from("avatars").remove(["jpg","jpeg","png","webp"].map(e => `${session.user.id}/avatar.${e}`)); } catch {}
    try {
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", session.user.id);
      setAvatarUrl(null); setPhotoMsg("");
    } catch (err) { setPhotoMsg("error:Could not remove photo."); }
    finally { setPhotoUploading(false); }
  }

  async function handleSave() {
    setSaving(true);
    console.log("Saving profile with:", { date_of_birth: dateOfBirth, nationality, visa_status: visaStatus, marital_status: maritalStatus, signature_city: signatureCity, languages, referee_1_name: ref1Name, referee_2_name: ref2Name });
    const { error: saveError } = await supabase.from("profiles").upsert({
      id:                    session.user.id,
      email:                 session.user.email,
      full_name:             fullName,
      phone,
      location,
      linkedin,
      base_resume:           baseResume,
      date_of_birth:         dateOfBirth,
      nationality,
      visa_status:           visaStatus,
      marital_status:        maritalStatus,
      signature_city:        signatureCity,
      languages:             languages,
      referee_1_name:        ref1Name,
      referee_1_title:       ref1Title,
      referee_1_company:     ref1Company,
      referee_1_email:       ref1Email,
      referee_1_phone:       ref1Phone,
      referee_1_relationship:ref1Rel,
      referee_2_name:        ref2Name,
      referee_2_title:       ref2Title,
      referee_2_company:     ref2Company,
      referee_2_email:       ref2Email,
      referee_2_phone:       ref2Phone,
      referee_2_relationship:ref2Rel,
      updated_at:            new Date().toISOString(),
    });
    if (saveError) console.error("Profile save error:", saveError);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    setFileProcessing(true); setFileError("");
    try {
      const name = file.name.toLowerCase();
      let text = "";
      if (name.endsWith(".pdf")) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          pages.push(content.items.map(item => item.str + (item.hasEOL ? "\n" : "")).join(""));
        }
        text = pages.join("\n\n");
      } else if (name.endsWith(".doc") || name.endsWith(".docx")) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else {
        text = await file.text();
      }
      if (!text.trim()) throw new Error("No text extracted");
      setBaseResume(text);
    } catch {
      setFileError("❌ Could not read this file. Please try copy-pasting your resume text.");
    } finally { setFileProcessing(false); }
  }

  function addLanguage() {
    if (!langName.trim()) return;
    setLanguages(prev => [...prev, { name: langName.trim(), level: langLevel }]);
    setLangName(""); setLangLevel("Native");
  }

  function removeLanguage(idx) {
    setLanguages(prev => prev.filter((_, i) => i !== idx));
  }

  // Ref field setter — maps field key to state setter
  const refSetters = {
    ref1Name: setRef1Name, ref1Title: setRef1Title, ref1Company: setRef1Company,
    ref1Email: setRef1Email, ref1Phone: setRef1Phone, ref1Rel: setRef1Rel,
    ref2Name: setRef2Name, ref2Title: setRef2Title, ref2Company: setRef2Company,
    ref2Email: setRef2Email, ref2Phone: setRef2Phone, ref2Rel: setRef2Rel,
  };
  const refFields = {
    ref1Name, ref1Title, ref1Company, ref1Email, ref1Phone, ref1Rel,
    ref2Name, ref2Title, ref2Company, ref2Email, ref2Phone, ref2Rel,
  };

  return (
    <div style={{ minHeight: "100vh", background: theme.background, fontFamily: "'Plus Jakarta Sans', sans-serif", color: theme.text, transition: "background 0.3s, color 0.3s" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        textarea:focus, input:focus, button:focus, select:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${theme.background}; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        textarea { resize: vertical; }
        .save-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .ghost-btn:hover { border-color: ${theme.accent} !important; color: ${theme.accent} !important; }
        .tab-btn:hover { color: ${theme.textStrong} !important; }
        select option { background: ${theme.card}; color: ${theme.text}; }
        input[type="date"] { color-scheme: ${isDark ? "dark" : "light"}; cursor: pointer; }
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.6; cursor: pointer; filter: ${isDark ? "invert(1)" : "none"}; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
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
              Job<span style={{ color: theme.accent }}>vate</span>
            </span>
          </div>
          <button onClick={onBack} className="ghost-btn" style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
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

      {/* Body */}
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 40px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: theme.textStrong, letterSpacing: "-0.02em", marginBottom: 6 }}>My Profile</h1>
          <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.6 }}>
            Save your details once — they auto-populate in all regional CV templates.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontSize: 13 }}>
            Loading profile…
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 20, borderBottom: `1px solid ${theme.border}`, paddingBottom: 0 }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  className="tab-btn"
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    padding: "10px 18px", fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? theme.accent : theme.textMuted,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    borderBottom: `2px solid ${activeTab === tab.id ? theme.accent : "transparent"}`,
                    marginBottom: -1, transition: "color 0.15s",
                  }}
                >{tab.label}</button>
              ))}
            </div>

            <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 16, padding: 32 }}>

              {/* ── TAB: Basic Info ────────────────────────────────── */}
              {activeTab === "basic" && (
                <>
                  {/* Profile Photo */}
                  <div style={{ marginBottom: 28, paddingBottom: 28, borderBottom: `1px solid ${theme.border}` }}>
                    <label style={{ display: "block", fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>
                      Profile Photo
                    </label>
                    <p style={{ fontSize: 12, color: theme.textFaint, fontFamily: "'DM Mono', monospace", marginBottom: 16, lineHeight: 1.5 }}>
                      Used in CVs for Germany, Finland, Singapore and other countries
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{
                        width: 100, height: 100, borderRadius: "50%",
                        border: `2px solid ${avatarUrl ? theme.accent : theme.border}`,
                        overflow: "hidden", flexShrink: 0,
                        background: theme.cardAlt,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "border-color 0.2s",
                      }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 38, opacity: 0.35 }}>👤</span>
                        )}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { uploadPhoto(e.target.files[0]); e.target.value = ""; }} style={{ display: "none" }} />
                        <button className="ghost-btn" onClick={() => photoRef.current.click()} disabled={photoUploading} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: photoUploading ? "not-allowed" : "pointer", fontFamily: "'DM Mono', monospace", opacity: photoUploading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
                          {photoUploading ? <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span> Uploading…</> : "📷 Upload Photo"}
                        </button>
                        {avatarUrl && !photoUploading && (
                          <button onClick={removePhoto} style={{ background: "transparent", border: "1px solid #FF6B6B40", color: "#FF6B6B", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}>
                            🗑 Remove
                          </button>
                        )}
                        {photoMsg === "success" && <p style={{ fontSize: 11, color: "#16a34a", fontFamily: "'DM Mono', monospace" }}>✅ Photo saved!</p>}
                        {photoMsg.startsWith("error:") && <p style={{ fontSize: 11, color: "#DC2626", fontFamily: "'DM Mono', monospace", maxWidth: 200, lineHeight: 1.4 }}>{photoMsg.slice(6)}</p>}
                        <p style={{ fontSize: 10, color: theme.textFaint, fontFamily: "'DM Mono', monospace", lineHeight: 1.6 }}>JPEG, PNG or WebP · Max 5MB<br />Recommended: square, min 300×300</p>
                      </div>
                    </div>
                  </div>

                  {/* Contact fields */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                    <Field label="Full Name"    value={fullName}  onChange={setFullName}  placeholder="e.g. John Smith" />
                    <Field label="Phone"        value={phone}     onChange={setPhone}     placeholder="e.g. +1 234 567 8900" />
                    <Field label="Location / Address" value={location} onChange={setLocation} placeholder="e.g. London, United Kingdom" />
                    <Field label="LinkedIn URL" value={linkedin}  onChange={setLinkedin}  placeholder="e.g. linkedin.com/in/johnsmith" />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Email" value={session.user.email} onChange={() => {}} readOnly />
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${theme.border}`, margin: "4px 0 24px" }} />

                  {/* Base Resume */}
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <label style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>Base Resume</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        {baseResume && <span style={{ fontSize: 11, color: theme.textFaint, fontFamily: "'DM Mono', monospace" }}>{baseResume.length.toLocaleString()} chars</span>}
                        <input ref={fileRef} type="file" accept=".txt,.pdf,.doc,.docx" onChange={handleFileUpload} style={{ display: "none" }} />
                        <button className="ghost-btn" onClick={() => fileRef.current.click()} disabled={fileProcessing} style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 6, padding: "4px 10px", fontSize: 11, cursor: fileProcessing ? "not-allowed" : "pointer", fontFamily: "'DM Mono', monospace", opacity: fileProcessing ? 0.6 : 1 }}>
                          📁 Upload PDF, DOC or TXT
                        </button>
                      </div>
                    </div>
                    {fileProcessing && <p style={{ color: theme.textMuted, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>📄 Reading your file…</p>}
                    {fileError && !fileProcessing && <p style={{ color: "#FF6B6B", fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>{fileError}</p>}
                    {baseResume && !fileProcessing && !fileError && <p style={{ color: theme.accent, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>✅ Resume extracted — {baseResume.length.toLocaleString()} characters</p>}
                    <textarea
                      value={baseResume}
                      onChange={e => { setBaseResume(e.target.value); setFileError(""); }}
                      onFocus={() => setResumeFocused(true)}
                      onBlur={() => setResumeFocused(false)}
                      placeholder="Paste your honest resume here. This is your master resume — not tailored for any specific job."
                      style={{
                        width: "100%", minHeight: 320, background: theme.inputBg,
                        border: `1px solid ${resumeFocused ? theme.accent : theme.border}`,
                        borderRadius: 10, padding: 16, color: theme.text,
                        fontSize: 13, fontFamily: "'DM Mono', monospace",
                        lineHeight: 1.8, transition: "border-color 0.2s",
                      }}
                    />
                  </div>
                </>
              )}

              {/* ── TAB: Personal Details ─────────────────────────── */}
              {activeTab === "personal" && (
                <>
                  <SectionNote>
                    Required for European and Asian CV formats. These details will be injected automatically into the relevant regional templates.
                  </SectionNote>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
                    <div style={{ marginBottom: 18 }}>
                      <label style={{ display: "block", fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                        Date of Birth
                      </label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={e => setDateOfBirth(e.target.value)}
                        max={DOB_MAX}
                        style={{
                          width: "100%", background: theme.inputBg,
                          border: `1px solid ${theme.border}`,
                          borderRadius: 8, padding: "10px 14px", color: theme.text,
                          fontSize: 13, fontFamily: "'DM Mono', monospace",
                          outline: "none", transition: "border-color 0.2s",
                        }}
                        onFocus={e  => { e.target.style.borderColor = theme.accent; }}
                        onBlur={e   => { e.target.style.borderColor = theme.border; }}
                      />
                    </div>
                    <Field label="Nationality" value={nationality} onChange={setNationality} placeholder="e.g. British, Indian, German" />
                    <Field label="Visa / Work Status" value={visaStatus} onChange={setVisaStatus} placeholder="e.g. EU Citizen, Skilled Worker Visa, Open Work Permit" />
                    <Select label="Marital Status (optional)" value={maritalStatus} onChange={setMaritalStatus} options={MARITAL_OPTIONS} />
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="City for Signature" value={signatureCity} onChange={setSignatureCity} placeholder="e.g. Berlin, Dublin, London" />
                      <p style={{ fontSize: 11, color: theme.textFaint, fontFamily: "'DM Mono', monospace", marginTop: -12, marginBottom: 18 }}>
                        Used in the signature block of German CVs
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* ── TAB: Languages ─────────────────────────────────── */}
              {activeTab === "languages" && (
                <>
                  <SectionNote>
                    Important for German and Finnish CVs. Include CEFR levels (C1, B2 etc.) for each language. These appear in the Languages section of your regional template.
                  </SectionNote>

                  {/* Existing chips */}
                  {languages.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20 }}>
                      {languages.map((lang, i) => (
                        <div key={i} style={{
                          display: "flex", alignItems: "center", gap: 6,
                          background: theme.accent + "15", border: `1px solid ${theme.accent}40`,
                          borderRadius: 20, padding: "6px 12px",
                        }}>
                          <span style={{ fontSize: 13, color: theme.accent, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                            {lang.name} <span style={{ opacity: 0.7 }}>({lang.level})</span>
                          </span>
                          <button
                            onClick={() => removeLanguage(i)}
                            style={{ background: "none", border: "none", color: theme.textMuted, cursor: "pointer", fontSize: 14, lineHeight: 1, padding: "0 2px" }}
                          >×</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add language row */}
                  <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                    <div style={{ flex: 2 }}>
                      <Field label="Language" value={langName} onChange={setLangName} placeholder="e.g. English" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <Select label="Proficiency" value={langLevel} onChange={setLangLevel} options={LANG_LEVELS} />
                    </div>
                    <div style={{ marginBottom: 18 }}>
                      <button
                        onClick={addLanguage}
                        disabled={!langName.trim()}
                        style={{
                          background: langName.trim() ? theme.accent : theme.border,
                          color: langName.trim() ? theme.background : theme.textMuted,
                          border: "none", borderRadius: 8, padding: "10px 18px",
                          fontSize: 13, fontWeight: 700, cursor: langName.trim() ? "pointer" : "not-allowed",
                          fontFamily: "'Plus Jakarta Sans', sans-serif", whiteSpace: "nowrap",
                        }}
                      >+ Add</button>
                    </div>
                  </div>

                  {languages.length === 0 && (
                    <p style={{ color: theme.textFaint, fontSize: 12, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>
                      No languages added yet. Type a language name and click + Add.
                    </p>
                  )}
                </>
              )}

              {/* ── TAB: References ────────────────────────────────── */}
              {activeTab === "referees" && (
                <>
                  <SectionNote>
                    Required for Australian, New Zealand and Finnish CVs. Your referees will appear at the end of the CV with all contact details.
                  </SectionNote>
                  <RefereeBlock n={1} fields={refFields} onChange={(key, val) => refSetters[key](val)} />
                  <RefereeBlock n={2} fields={refFields} onChange={(key, val) => refSetters[key](val)} />
                </>
              )}

              {/* Save button — always visible */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 28, paddingTop: 24, borderTop: `1px solid ${theme.border}` }}>
                <button
                  className="save-btn"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    background: saving ? theme.border : theme.accent,
                    color: saving ? theme.textFaint : theme.background,
                    border: "none", borderRadius: 10,
                    padding: "12px 28px", fontSize: 14, fontWeight: 700,
                    cursor: saving ? "not-allowed" : "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "all 0.2s",
                  }}
                >{saving ? "Saving…" : "Save Profile"}</button>
                {saved && (
                  <span style={{ color: theme.accent, fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                    ✅ Profile saved successfully
                  </span>
                )}
              </div>
            </div>
          </>
        )}

        <p style={{ textAlign: "center", fontSize: 11, color: theme.textFaint, marginTop: 48, fontFamily: "'DM Mono', monospace" }}>
          © 2026 Jobvate · All rights reserved
        </p>
      </div>
    </div>
  );
}
