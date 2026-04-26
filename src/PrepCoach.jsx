import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeContext";

const PREP_MESSAGES = [
  { emoji: "🔍", action: "Searching",   rest: " real interview experiences…" },
  { emoji: "📊", action: "Analysing",   rest: " interview patterns…" },
  { emoji: "🎯", action: "Mapping",     rest: " your skills to job requirements…" },
  { emoji: "📚", action: "Identifying", rest: " your preparation priorities…" },
  { emoji: "🗓️", action: "Building",    rest: " your day-by-day plan…" },
  { emoji: "💡", action: "Finding",     rest: " the best resources for you…" },
  { emoji: "🔑", action: "Generating",  rest: " likely interview questions…" },
  { emoji: "✅", action: "Finalising",  rest: " your prep strategy…" },
];

const LEFT_DOC_LINES  = [62, 85, 55, 78, 48];
const RIGHT_DOC_LINES = [62, 85, 55, 78, 48];

function PrepLoader({ companyName }) {
  const { theme } = useTheme();
  const ac = theme.accent;

  const msgs = PREP_MESSAGES.map((m, i) =>
    i === 1
      ? { ...m, rest: ` interview patterns at ${companyName || "the company"}…` }
      : m
  );

  const [msgIndex, setMsgIndex] = useState(0);
  const [fade,     setFade]     = useState(true);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());
  const loopFrom  = 2; // cycle back to message index 2 after the first full pass

  // Message cycling — full pass first, then loop from index 2
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex(prev => (prev < msgs.length - 1 ? prev + 1 : loopFrom));
        setFade(true);
      }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, [msgs.length]);

  // Progress bar: 0 → 85 % over 30 s
  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      setProgress(Math.min(85, (elapsed / 30) * 85));
    }, 100);
    return () => clearInterval(id);
  }, []);

  const msg = msgs[msgIndex] || msgs[0];

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      gap: 18, padding: "28px 20px", minHeight: 380,
    }}>
      <style>{`
        @keyframes prep-pulse-glow {
          0%, 100% { box-shadow: 0 0 14px ${ac}45, 0 0 30px ${ac}20; border-color: ${ac}; }
          50%       { box-shadow: 0 0 28px ${ac}80, 0 0 56px ${ac}38; border-color: ${ac}; }
        }
        @keyframes prep-shimmer {
          0%, 100% { opacity: 0.5; transform: scaleX(0.94); }
          50%       { opacity: 1;   transform: scaleX(1); }
        }
        @keyframes prep-dots {
          0%        { transform: translateX(-50px); opacity: 0; }
          20%, 80%  { opacity: 1; }
          100%      { transform: translateX(50px);  opacity: 0; }
        }
        @keyframes prep-msg {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── DOCUMENT TRANSFORM SCENE ── */}
      <div style={{
        position: "relative",
        display: "flex", alignItems: "center",
        backgroundImage: `radial-gradient(circle, ${theme.border} 1px, transparent 1px)`,
        backgroundSize: "18px 18px",
        borderRadius: 16,
        padding: "22px 28px 18px",
      }}>

        {/* LEFT — "Your Profile" (gray, dimmed) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 120, height: 160,
            background: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 8,
            padding: "14px 13px 10px",
            display: "flex", flexDirection: "column", gap: 9,
            opacity: 0.6,
          }}>
            {/* header line */}
            <div style={{ width: "68%", height: 8, background: theme.textFaint, borderRadius: 3 }} />
            {/* body lines */}
            {LEFT_DOC_LINES.map((w, i) => (
              <div key={i} style={{
                width: `${w}%`, height: 5,
                background: theme.border, borderRadius: 2,
              }} />
            ))}
          </div>
          <span style={{
            fontSize: 10, color: theme.textMuted,
            fontFamily: "'DM Mono', monospace", letterSpacing: "0.06em",
          }}>Your Profile</span>
        </div>

        {/* ANIMATED ARROW */}
        <div style={{ width: 72, position: "relative", display: "flex", alignItems: "center", marginBottom: 18 }}>
          {/* track */}
          <div style={{
            position: "absolute", left: 0, right: 10,
            height: 2, background: `${ac}35`, top: "50%", transform: "translateY(-50%)",
          }} />
          {/* moving dots */}
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              position: "absolute", left: "50%", top: "50%",
              width: 7, height: 7, borderRadius: "50%",
              background: ac,
              transform: "translate(-50%, -50%)",
              animation: `prep-dots 1.5s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}
          {/* arrowhead */}
          <div style={{
            position: "absolute", right: 0, top: "50%",
            transform: "translateY(-50%)",
            width: 0, height: 0,
            borderTop: "5px solid transparent",
            borderBottom: "5px solid transparent",
            borderLeft: `9px solid ${ac}`,
          }} />
        </div>

        {/* RIGHT — "Interview Ready" (glowing green) */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7 }}>
          <div style={{
            width: 120, height: 160,
            background: theme.card,
            border: `2px solid ${ac}`,
            borderRadius: 8,
            padding: "14px 13px 10px",
            display: "flex", flexDirection: "column", gap: 9,
            animation: "prep-pulse-glow 2.4s ease-in-out infinite",
          }}>
            {/* header line */}
            <div style={{
              width: "68%", height: 8,
              background: ac, borderRadius: 3,
              animation: "prep-shimmer 1.8s ease-in-out infinite",
            }} />
            {/* body lines */}
            {RIGHT_DOC_LINES.map((w, i) => (
              <div key={i} style={{
                width: `${w}%`, height: 5,
                background: i % 2 === 0 ? `${ac}95` : `${ac}55`,
                borderRadius: 2,
                animation: `prep-shimmer 1.8s ease-in-out infinite`,
                animationDelay: `${i * 0.28}s`,
              }} />
            ))}
          </div>
          <span style={{
            fontSize: 10, color: ac,
            fontFamily: "'DM Mono', monospace",
            letterSpacing: "0.06em", fontWeight: 600,
          }}>Interview Ready</span>
        </div>
      </div>

      {/* ── CYCLING MESSAGE ── */}
      <p
        key={msgIndex}
        style={{
          color: theme.text, fontSize: 15,
          fontFamily: "'DM Mono', monospace",
          textAlign: "center", margin: 0,
          opacity: fade ? 1 : 0, transition: "opacity 0.3s",
          animation: "prep-msg 0.35s ease",
        }}
      >
        <span style={{ marginRight: 6 }}>{msg.emoji}</span>
        <strong style={{ color: theme.textStrong }}>{msg.action}</strong>
        {msg.rest}
      </p>

      {/* ── PROGRESS BAR ── */}
      <div style={{
        width: "100%", maxWidth: 340, height: 3,
        background: theme.border, borderRadius: 4, overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${progress}%`,
          background: ac, borderRadius: 4,
          transition: "width 0.15s linear",
        }} />
      </div>

      {/* ── SUBTITLE ── */}
      <p style={{
        color: theme.textFaint, fontSize: 12,
        fontFamily: "'DM Mono', monospace",
        textAlign: "center", margin: 0, lineHeight: 1.6,
      }}>
        Searching the web + generating your plan… (~30 seconds)
      </p>
    </div>
  );
}

function Section({ title, emoji, children, defaultOpen = false }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: theme.cardAlt || theme.card, border: "none", padding: "14px 18px",
          cursor: "pointer", color: theme.textStrong, fontSize: 14, fontWeight: 700,
          fontFamily: "'Syne', sans-serif", textAlign: "left",
        }}
      >
        <span>{emoji} {title}</span>
        <span style={{ color: theme.textFaint, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "16px 18px", borderTop: `1px solid ${theme.border}` }}>
          {children}
        </div>
      )}
    </div>
  );
}

function ReadinessBadge({ level }) {
  const colors = {
    strong:  { bg: "#052e16", text: "#22c55e", border: "#16a34a40" },
    neutral: { bg: "#1c1917", text: "#f59e0b", border: "#d9770640" },
    gap:     { bg: "#1c0a0a", text: "#ef4444", border: "#dc262640" },
  };
  const labels = { strong: "✅ Strong", neutral: "⚠️ Neutral", gap: "🔴 Gap" };
  const c = colors[level] || colors.neutral;
  return (
    <span style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 6, padding: "2px 8px", fontSize: 11,
      fontFamily: "'DM Mono', monospace", fontWeight: 600,
    }}>{labels[level]}</span>
  );
}

function DayCard({ day, isFirst, checked, onCheck }) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(isFirst);
  return (
    <div style={{ border: `1px solid ${open ? theme.accent + "60" : theme.border}`, borderRadius: 10, marginBottom: 8, overflow: "hidden", transition: "border-color 0.15s" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: open ? theme.accent + "10" : "transparent",
          border: "none", padding: "12px 16px", cursor: "pointer",
          color: theme.textStrong, fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600,
          textAlign: "left",
        }}
      >
        <span>
          <span style={{ color: theme.accent, marginRight: 8 }}>Day {day.day}</span>
          {day.theme}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: theme.textFaint }}>
            {(day.tasks || []).filter((_, i) => checked[`${day.day}-${i}`]).length}/{(day.tasks || []).length} done
          </span>
          <span style={{ color: theme.textFaint, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: "12px 16px", borderTop: `1px solid ${theme.border}` }}>
          {(day.tasks || []).map((task, i) => {
            const key = `${day.day}-${i}`;
            return (
              <label
                key={key}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8, cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={!!checked[key]}
                  onChange={() => onCheck(key)}
                  style={{ marginTop: 2, accentColor: theme.accent, flexShrink: 0 }}
                />
                <span style={{
                  fontSize: 13, color: checked[key] ? theme.textFaint : theme.text,
                  textDecoration: checked[key] ? "line-through" : "none",
                  lineHeight: 1.6,
                  fontFamily: "'DM Mono', monospace",
                }}>{task}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function PrepCoach({
  prepPlan,
  prepLoading,
  prepError,
  daysUntilInterview,
  hoursPerDay,
  onDaysChange,
  onHoursChange,
  onGenerate,
  jobTitle,
  companyName,
}) {
  const { theme, isDark } = useTheme();
  const [checked, setChecked] = useState({});

  function toggleCheck(key) {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  }

  // ── Input screen ──────────────────────────────────────────────
  if (!prepPlan && !prepLoading) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "32px 0" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: theme.textStrong, marginBottom: 8, fontFamily: "'Syne', sans-serif" }}>
            PrepCoach
          </h2>
          <p style={{ color: theme.textMuted, fontSize: 14, lineHeight: 1.7 }}>
            Get a personalised day-by-day interview preparation plan for{" "}
            <strong style={{ color: theme.textStrong }}>{jobTitle || "this role"}</strong>
            {companyName ? <> at <strong style={{ color: theme.textStrong }}>{companyName}</strong></> : ""}.
          </p>
        </div>

        <div style={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 14, padding: 28 }}>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: 8, letterSpacing: "0.06em" }}>
              DAYS UNTIL INTERVIEW
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {[1, 2, 3, 5, 7, 14].map(d => (
                <button
                  key={d}
                  onClick={() => onDaysChange(d)}
                  style={{
                    width: 44, height: 44, borderRadius: 10, border: `1px solid ${daysUntilInterview === d ? theme.accent : theme.border}`,
                    background: daysUntilInterview === d ? theme.accent + "20" : "transparent",
                    color: daysUntilInterview === d ? theme.accent : theme.textMuted,
                    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >{d}</button>
              ))}
              <input
                type="number"
                min={1}
                max={60}
                value={daysUntilInterview || ""}
                onChange={e => onDaysChange(parseInt(e.target.value) || null)}
                placeholder="?"
                style={{
                  width: 60, height: 44, borderRadius: 10, border: `1px solid ${theme.border}`,
                  background: theme.inputBg, color: theme.text, fontSize: 14, textAlign: "center",
                  fontFamily: "'DM Mono', monospace", padding: "0 8px",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ display: "block", fontSize: 12, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: 8, letterSpacing: "0.06em" }}>
              STUDY HOURS PER DAY
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {[1, 2, 3, 4].map(h => (
                <button
                  key={h}
                  onClick={() => onHoursChange(h)}
                  style={{
                    width: 44, height: 44, borderRadius: 10, border: `1px solid ${hoursPerDay === h ? theme.accent : theme.border}`,
                    background: hoursPerDay === h ? theme.accent + "20" : "transparent",
                    color: hoursPerDay === h ? theme.accent : theme.textMuted,
                    fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'DM Mono', monospace",
                    transition: "all 0.15s",
                  }}
                >{h}h</button>
              ))}
            </div>
          </div>

          {prepError && (
            <p style={{ color: "#ef4444", fontSize: 13, fontFamily: "'DM Mono', monospace", marginBottom: 16 }}>{prepError}</p>
          )}

          <button
            onClick={onGenerate}
            disabled={!daysUntilInterview}
            style={{
              width: "100%", background: daysUntilInterview ? theme.accent : theme.border,
              color: daysUntilInterview ? theme.background : theme.textFaint,
              border: "none", borderRadius: 10, padding: "14px 0", fontSize: 15, fontWeight: 700,
              cursor: daysUntilInterview ? "pointer" : "not-allowed", fontFamily: "'Syne', sans-serif",
              transition: "all 0.15s",
            }}
          >
            🚀 Generate My Prep Plan
          </button>
        </div>
      </div>
    );
  }

  // ── Loading screen ────────────────────────────────────────────
  if (prepLoading) {
    return <PrepLoader companyName={companyName} />;
  }

  // ── Prep plan display ─────────────────────────────────────────
  const {
    interview_structure,
    readiness_assessment,
    daily_plan,
    top_questions,
    emergency_tips,
  } = prepPlan;

  const isEmergency = daysUntilInterview && daysUntilInterview <= 3;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: theme.textStrong, marginBottom: 4, fontFamily: "'Syne', sans-serif" }}>
            🎯 Your Interview Prep Plan
          </h3>
          <p style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'DM Mono', monospace" }}>
            {daysUntilInterview} day{daysUntilInterview !== 1 ? "s" : ""} · {hoursPerDay}h/day ·{" "}
            {jobTitle || "Role"}{companyName ? ` @ ${companyName}` : ""}
          </p>
        </div>
        <button
          onClick={onGenerate}
          style={{ background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, borderRadius: 8, padding: "8px 14px", fontSize: 12, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
        >
          🔄 Regenerate
        </button>
      </div>

      {/* Emergency Tips — shown at top when ≤ 3 days */}
      {isEmergency && emergency_tips && emergency_tips.length > 0 && (
        <div style={{
          background: isDark ? "#1c0a0a" : "#fef2f2", border: "1px solid #ef444440",
          borderRadius: 12, padding: "16px 18px", marginBottom: 16,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#ef4444", marginBottom: 10, fontFamily: "'Syne', sans-serif" }}>
            🚨 Emergency Tips — {daysUntilInterview} day{daysUntilInterview !== 1 ? "s" : ""} to go
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {emergency_tips.map((tip, i) => (
              <li key={i} style={{ fontSize: 13, color: theme.text, lineHeight: 1.7, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 1. Interview Structure */}
      {interview_structure && (
        <Section title="Interview Structure" emoji="🗂️" defaultOpen>
          {interview_structure.overview && (
            <p style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.7, marginBottom: 12, fontFamily: "'DM Mono', monospace" }}>{interview_structure.overview}</p>
          )}
          {(interview_structure.rounds || []).map((round, i) => (
            <div key={i} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
              <div style={{ width: 24, height: 24, background: theme.accent + "20", border: `1px solid ${theme.accent}40`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: theme.accent, fontFamily: "'DM Mono', monospace", fontWeight: 700, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: theme.textStrong, marginBottom: 2, fontFamily: "'Syne', sans-serif" }}>{round.name}</p>
                <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.6, fontFamily: "'DM Mono', monospace" }}>{round.description}</p>
                {round.duration && <p style={{ fontSize: 11, color: theme.textFaint, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>⏱ {round.duration}</p>}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* 2. Readiness Assessment */}
      {readiness_assessment && (
        <Section title="Readiness Assessment" emoji="📊" defaultOpen>
          {readiness_assessment.overall_verdict && (
            <p style={{ fontSize: 13, color: theme.textMuted, lineHeight: 1.7, marginBottom: 14, fontFamily: "'DM Mono', monospace" }}>{readiness_assessment.overall_verdict}</p>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(readiness_assessment.items || []).map((item, i) => (
              <div key={i} style={{ padding: "10px 14px", background: theme.background, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ fontSize: 13, color: theme.text, lineHeight: 1.5, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>{item.label}</span>
                  <ReadinessBadge level={item.level} />
                </div>
                {item.note && (item.level === "neutral" || item.level === "gap") && (
                  <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", lineHeight: 1.6, marginTop: 5, paddingTop: 5, borderTop: `1px solid ${theme.border}` }}>{item.note}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* 3. Day-by-Day Plan */}
      {daily_plan && daily_plan.length > 0 && (
        <Section title={`Day-by-Day Plan (${daily_plan.length} days)`} emoji="📅" defaultOpen>
          {daily_plan.map((day, i) => (
            <DayCard
              key={i}
              day={day}
              isFirst={i === 0}
              checked={checked}
              onCheck={toggleCheck}
            />
          ))}
        </Section>
      )}

      {/* 4. Top Interview Questions */}
      {top_questions && top_questions.length > 0 && (
        <Section title={`Top ${top_questions.length} Interview Questions`} emoji="💬">
          {top_questions.map((q, i) => (
            <div key={i} style={{ marginBottom: 16, paddingBottom: 16, borderBottom: i < top_questions.length - 1 ? `1px solid ${theme.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 11, background: theme.accent + "20", color: theme.accent, border: `1px solid ${theme.accent}40`, borderRadius: 5, padding: "2px 7px", fontFamily: "'DM Mono', monospace", fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>{q.category || "General"}</span>
                <p style={{ fontSize: 13, fontWeight: 700, color: theme.textStrong, lineHeight: 1.5, fontFamily: "'Syne', sans-serif" }}>{q.question}</p>
              </div>
              {q.answer_guide && (
                <p style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.7, fontFamily: "'DM Mono', monospace", paddingLeft: 0 }}>
                  <strong style={{ color: theme.textStrong }}>How to answer: </strong>{q.answer_guide}
                </p>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* 5. Emergency Tips — also shown at bottom as a section if > 3 days */}
      {!isEmergency && emergency_tips && emergency_tips.length > 0 && (
        <Section title="Emergency Tips" emoji="🚨">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {emergency_tips.map((tip, i) => (
              <li key={i} style={{ fontSize: 13, color: theme.text, lineHeight: 1.7, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{tip}</li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
