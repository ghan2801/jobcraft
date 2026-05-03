import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeContext";

// ── Loader messages ───────────────────────────────────────────────────────────
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

// ── PrepLoader ────────────────────────────────────────────────────────────────
function PrepLoader({ companyName }) {
  const { theme } = useTheme();
  const ac = theme.accent;

  const msgs = PREP_MESSAGES.map((m, i) =>
    i === 1 ? { ...m, rest: ` interview patterns at ${companyName || "the company"}…` } : m
  );

  const [msgIndex, setMsgIndex] = useState(0);
  const [fade,     setFade]     = useState(true);
  const [progress, setProgress] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => { setMsgIndex(prev => (prev < msgs.length - 1 ? prev + 1 : 2)); setFade(true); }, 300);
    }, 2500);
    return () => clearInterval(id);
  }, [msgs.length]);

  useEffect(() => {
    const id = setInterval(() => {
      const elapsed = (Date.now() - startTime.current) / 1000;
      setProgress(Math.min(85, (elapsed / 30) * 85));
    }, 100);
    return () => clearInterval(id);
  }, []);

  const msg = msgs[msgIndex] || msgs[0];

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "28px 20px", minHeight: 380 }}>
      <style>{`
        @keyframes prep-pulse-glow { 0%,100%{box-shadow:0 0 14px ${ac}45,0 0 30px ${ac}20;border-color:${ac}} 50%{box-shadow:0 0 28px ${ac}80,0 0 56px ${ac}38;border-color:${ac}} }
        @keyframes prep-shimmer { 0%,100%{opacity:0.5;transform:scaleX(0.94)} 50%{opacity:1;transform:scaleX(1)} }
        @keyframes prep-dots { 0%{transform:translateX(-50px);opacity:0} 20%,80%{opacity:1} 100%{transform:translateX(50px);opacity:0} }
        @keyframes prep-msg { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={{ position:"relative", display:"flex", alignItems:"center", backgroundImage:`radial-gradient(circle, ${theme.border} 1px, transparent 1px)`, backgroundSize:"18px 18px", borderRadius:16, padding:"22px 28px 18px" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
          <div style={{ width:120, height:160, background:theme.card, border:`1px solid ${theme.border}`, borderRadius:8, padding:"14px 13px 10px", display:"flex", flexDirection:"column", gap:9, opacity:0.6 }}>
            <div style={{ width:"68%", height:8, background:theme.textFaint, borderRadius:3 }} />
            {LEFT_DOC_LINES.map((w, i) => <div key={i} style={{ width:`${w}%`, height:5, background:theme.border, borderRadius:2 }} />)}
          </div>
          <span style={{ fontSize:10, color:theme.textMuted, fontFamily:"'DM Mono', monospace", letterSpacing:"0.06em" }}>Your Profile</span>
        </div>
        <div style={{ width:72, position:"relative", display:"flex", alignItems:"center", marginBottom:18 }}>
          <div style={{ position:"absolute", left:0, right:10, height:2, background:`${ac}35`, top:"50%", transform:"translateY(-50%)" }} />
          {[0,1,2].map(i => <div key={i} style={{ position:"absolute", left:"50%", top:"50%", width:7, height:7, borderRadius:"50%", background:ac, transform:"translate(-50%, -50%)", animation:`prep-dots 1.5s ease-in-out infinite`, animationDelay:`${i*0.5}s` }} />)}
          <div style={{ position:"absolute", right:0, top:"50%", transform:"translateY(-50%)", width:0, height:0, borderTop:"5px solid transparent", borderBottom:"5px solid transparent", borderLeft:`9px solid ${ac}` }} />
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:7 }}>
          <div style={{ width:120, height:160, background:theme.card, border:`2px solid ${ac}`, borderRadius:8, padding:"14px 13px 10px", display:"flex", flexDirection:"column", gap:9, animation:"prep-pulse-glow 2.4s ease-in-out infinite" }}>
            <div style={{ width:"68%", height:8, background:ac, borderRadius:3, animation:"prep-shimmer 1.8s ease-in-out infinite" }} />
            {RIGHT_DOC_LINES.map((w, i) => <div key={i} style={{ width:`${w}%`, height:5, background:i%2===0?`${ac}95`:`${ac}55`, borderRadius:2, animation:`prep-shimmer 1.8s ease-in-out infinite`, animationDelay:`${i*0.28}s` }} />)}
          </div>
          <span style={{ fontSize:10, color:ac, fontFamily:"'DM Mono', monospace", letterSpacing:"0.06em", fontWeight:600 }}>Interview Ready</span>
        </div>
      </div>
      <p key={msgIndex} style={{ color:theme.text, fontSize:15, fontFamily:"'DM Mono', monospace", textAlign:"center", margin:0, opacity:fade?1:0, transition:"opacity 0.3s", animation:"prep-msg 0.35s ease" }}>
        <span style={{ marginRight:6 }}>{msg.emoji}</span>
        <strong style={{ color:theme.textStrong }}>{msg.action}</strong>
        {msg.rest}
      </p>
      <div style={{ width:"100%", maxWidth:340, height:3, background:theme.border, borderRadius:4, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${progress}%`, background:ac, borderRadius:4, transition:"width 0.15s linear" }} />
      </div>
      <p style={{ color:theme.textFaint, fontSize:12, fontFamily:"'DM Mono', monospace", textAlign:"center", margin:0, lineHeight:1.6 }}>
        Searching the web + generating your plan… (~30 seconds)
      </p>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeReadiness(items) {
  if (!items || !items.length) return 0;
  const scoreMap = { strong: 9, neutral: 5.5, gap: 2 };
  const avg = items.reduce((s, it) => s + (scoreMap[it.level] || 5.5), 0) / items.length;
  return Math.round((avg / 9) * 100);
}

function readinessColor(pct) {
  if (pct >= 70) return "#22c55e";
  if (pct >= 45) return "#f59e0b";
  return "#ef4444";
}

function itemScore(level) {
  if (level === "strong") return 8 + Math.round(Math.random());   // 8 or 9
  if (level === "neutral") return 5 + Math.round(Math.random());  // 5 or 6
  return 2 + Math.round(Math.random());                            // 2 or 3
}

function barColor(score) {
  if (score >= 8) return "#22c55e";
  if (score >= 5) return "#f59e0b";
  return "#ef4444";
}

// ── Hero Header ───────────────────────────────────────────────────────────────
function HeroHeader({ prepPlan, jobTitle, companyName, daysUntilInterview, hoursPerDay,
                      onGenerate, onOpenClaude, onCopyPrompt, copiedPrompt, theme, isDark }) {
  const items       = prepPlan?.readiness_assessment?.items || [];
  const readyPct    = computeReadiness(items);
  const color       = readinessColor(readyPct);
  const totalHours  = (daysUntilInterview || 0) * (hoursPerDay || 0);
  const strongCount = items.filter(i => i.level === "strong").length;
  const neutralCount= items.filter(i => i.level === "neutral").length;
  const gapCount    = items.filter(i => i.level === "gap").length;
  const label       = readyPct >= 70 ? "Interview Ready" : readyPct >= 45 ? "Needs Work" : "Critical Gaps";
  const r = 34;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{
      background: isDark ? "linear-gradient(135deg, #0d1117 0%, #161b22 100%)" : "linear-gradient(135deg, #f8fafc 0%, #f0f4f8 100%)",
      border: `1px solid ${theme.border}`, borderRadius: 16, padding: "28px 32px", marginBottom: 20,
    }}>
      {/* Row 1 — title + readiness circle */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:20, flexWrap:"wrap", marginBottom:20 }}>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:38, height:38, background:theme.accent+"20", border:`1px solid ${theme.accent}40`, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🎯</div>
            <div>
              <h3 style={{ fontSize:20, fontWeight:800, color:theme.textStrong, margin:0, fontFamily:"'Plus Jakarta Sans', sans-serif", lineHeight:1.2 }}>
                {jobTitle || "Interview Prep"}
              </h3>
              {companyName && <p style={{ fontSize:13, color:theme.textMuted, fontFamily:"'DM Mono', monospace", margin:0 }}>@ {companyName}</p>}
            </div>
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, background:theme.accent+"15", color:theme.accent, border:`1px solid ${theme.accent}30`, borderRadius:20, padding:"3px 10px", fontFamily:"'DM Mono', monospace" }}>
              ⏱ {daysUntilInterview} day{daysUntilInterview !== 1 ? "s" : ""}
            </span>
            <span style={{ fontSize:11, background:theme.accent+"15", color:theme.accent, border:`1px solid ${theme.accent}30`, borderRadius:20, padding:"3px 10px", fontFamily:"'DM Mono', monospace" }}>
              {hoursPerDay}h/day
            </span>
            <span style={{ fontSize:11, background:isDark?"#ffffff08":"#00000008", color:theme.textMuted, border:`1px solid ${theme.border}`, borderRadius:20, padding:"3px 10px", fontFamily:"'DM Mono', monospace" }}>
              {totalHours}h total
            </span>
          </div>
        </div>

        {/* Circular readiness */}
        <div style={{ textAlign:"center", flexShrink:0 }}>
          <div style={{ position:"relative", width:84, height:84, margin:"0 auto 6px" }}>
            <svg width="84" height="84" viewBox="0 0 84 84">
              <circle cx="42" cy="42" r={r} fill="none" stroke={isDark?"#ffffff12":"#00000012"} strokeWidth="7" />
              <circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={circ * (1 - readyPct / 100)}
                transform="rotate(-90 42 42)"
                style={{ transition:"stroke-dashoffset 1.2s ease" }}
              />
            </svg>
            <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
              <span style={{ fontSize:17, fontWeight:800, color, fontFamily:"'Plus Jakarta Sans', sans-serif", lineHeight:1 }}>{readyPct}%</span>
            </div>
          </div>
          <p style={{ fontSize:10, color, fontFamily:"'DM Mono', monospace", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em", margin:0 }}>{label}</p>
        </div>
      </div>

      {/* Row 2 — skill summary pills */}
      {items.length > 0 && (
        <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
          {strongCount > 0 && (
            <div style={{ flex:1, minWidth:80, padding:"8px 12px", background:"#16a34a10", border:"1px solid #16a34a30", borderRadius:8, textAlign:"center" }}>
              <p style={{ fontSize:20, fontWeight:800, color:"#22c55e", margin:0, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>{strongCount}</p>
              <p style={{ fontSize:9, color:"#16a34a", margin:0, fontFamily:"'DM Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em" }}>Strong</p>
            </div>
          )}
          {neutralCount > 0 && (
            <div style={{ flex:1, minWidth:80, padding:"8px 12px", background:"#d9770610", border:"1px solid #d9770630", borderRadius:8, textAlign:"center" }}>
              <p style={{ fontSize:20, fontWeight:800, color:"#f59e0b", margin:0, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>{neutralCount}</p>
              <p style={{ fontSize:9, color:"#d97706", margin:0, fontFamily:"'DM Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em" }}>Needs Work</p>
            </div>
          )}
          {gapCount > 0 && (
            <div style={{ flex:1, minWidth:80, padding:"8px 12px", background:"#dc262610", border:"1px solid #dc262630", borderRadius:8, textAlign:"center" }}>
              <p style={{ fontSize:20, fontWeight:800, color:"#ef4444", margin:0, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>{gapCount}</p>
              <p style={{ fontSize:9, color:"#dc2626", margin:0, fontFamily:"'DM Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em" }}>Critical Gap</p>
            </div>
          )}
        </div>
      )}

      {/* Row 3 — coaching buttons */}
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <button onClick={onOpenClaude} style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:8, padding:"9px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
            🧠 Open in Claude →
          </button>
          <button onClick={onCopyPrompt} style={{ background:"transparent", color:copiedPrompt?"#16a34a":theme.textMuted, border:`1px solid ${copiedPrompt?"#16a34a50":theme.border}`, borderRadius:8, padding:"9px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
            {copiedPrompt ? "Copied! ✓" : "📋 Copy Prompt"}
          </button>
        </div>
        <button onClick={onGenerate} style={{ background:"transparent", border:`1px solid ${theme.border}`, color:theme.textMuted, borderRadius:8, padding:"8px 14px", fontSize:12, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
          🔄 Regenerate
        </button>
      </div>
    </div>
  );
}

// ── Skill Bars ────────────────────────────────────────────────────────────────
function SkillBarsSection({ items, theme, isDark }) {
  const [visible, setVisible] = useState(false);
  // Stable scores computed once
  const [scores] = useState(() => (items || []).map(it => itemScore(it.level)));

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  if (!items || !items.length) return null;

  return (
    <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <div style={{ padding:"14px 18px", background:theme.cardAlt||theme.card, borderBottom:`1px solid ${theme.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:14, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>📊 Skill Match</span>
        <span style={{ fontSize:11, color:theme.textMuted, fontFamily:"'DM Mono', monospace" }}>vs. job requirements</span>
      </div>
      <div style={{ padding:"16px 18px" }}>
        {items.map((item, i) => {
          const score = scores[i] || 5;
          const color = barColor(score);
          const pct   = (score / 10) * 100;
          return (
            <div key={i} style={{ marginBottom: i < items.length - 1 ? 16 : 0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:12, color:theme.text, fontFamily:"'DM Mono', monospace" }}>{item.label}</span>
                <span style={{ fontSize:11, color, fontFamily:"'DM Mono', monospace", fontWeight:700 }}>{score}/10</span>
              </div>
              <div style={{ height:8, background:isDark?"#ffffff10":"#00000010", borderRadius:4, overflow:"hidden" }}>
                <div style={{
                  height:"100%", borderRadius:4, background:color,
                  width: visible ? `${pct}%` : "0%",
                  transition: `width 0.8s cubic-bezier(0.4,0,0.2,1) ${i * 80}ms`,
                }} />
              </div>
              {item.note && (item.level === "gap" || item.level === "neutral") && (
                <p style={{ fontSize:10, color:theme.textFaint, fontFamily:"'DM Mono', monospace", margin:"3px 0 0", lineHeight:1.5 }}>{item.note}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Interview Timeline ────────────────────────────────────────────────────────
function InterviewTimeline({ interview_structure, theme }) {
  if (!interview_structure) return null;
  const rounds = interview_structure.rounds || [];
  if (!rounds.length) return null;

  return (
    <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <div style={{ padding:"14px 18px", background:theme.cardAlt||theme.card, borderBottom:`1px solid ${theme.border}` }}>
        <span style={{ fontSize:14, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>🗂️ Interview Structure</span>
        {interview_structure.overview && (
          <p style={{ fontSize:12, color:theme.textMuted, fontFamily:"'DM Mono', monospace", margin:"4px 0 0", lineHeight:1.6 }}>{interview_structure.overview}</p>
        )}
      </div>
      <div style={{ padding:"20px 18px" }}>
        {rounds.map((round, i) => (
          <div key={i} style={{ display:"flex", gap:0 }}>
            {/* timeline column */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", marginRight:16, flexShrink:0, width:32 }}>
              <div style={{ width:32, height:32, borderRadius:"50%", background:theme.accent+"20", border:`2px solid ${theme.accent}60`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:theme.accent, fontFamily:"'DM Mono', monospace", flexShrink:0 }}>
                {i + 1}
              </div>
              {i < rounds.length - 1 && <div style={{ width:2, flex:1, minHeight:16, background:theme.border, margin:"4px 0" }} />}
            </div>
            {/* content */}
            <div style={{ paddingBottom: i < rounds.length - 1 ? 20 : 0, flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
                <p style={{ fontSize:13, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif", margin:0 }}>{round.name}</p>
                {round.duration && (
                  <span style={{ fontSize:10, color:theme.accent, fontFamily:"'DM Mono', monospace", background:theme.accent+"15", padding:"2px 8px", borderRadius:10 }}>⏱ {round.duration}</span>
                )}
              </div>
              {round.description && (
                <p style={{ fontSize:12, color:theme.textMuted, lineHeight:1.6, fontFamily:"'DM Mono', monospace", margin:0 }}>{round.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Day Card ──────────────────────────────────────────────────────────────────
function DayCard({ day, isFirst, checked, onCheck, theme }) {
  const [open, setOpen] = useState(isFirst);
  const tasks = day.tasks || [];
  const doneCnt = tasks.filter((_, i) => checked[`${day.day}-${i}`]).length;
  const allDone = tasks.length > 0 && doneCnt === tasks.length;

  return (
    <div style={{ border:`1px solid ${allDone ? "#16a34a50" : open ? theme.accent+"60" : theme.border}`, borderRadius:10, marginBottom:8, overflow:"hidden", transition:"border-color 0.15s" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", background:allDone ? "#16a34a08" : open ? theme.accent+"10" : "transparent", border:"none", padding:"12px 16px", cursor:"pointer", color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif", fontSize:13, fontWeight:600, textAlign:"left" }}
      >
        <span>
          {allDone && <span style={{ marginRight:6 }}>✅</span>}
          <span style={{ color: allDone ? "#22c55e" : theme.accent, marginRight:8 }}>Day {day.day}</span>
          {day.theme}
        </span>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:11, color: allDone ? "#22c55e" : theme.textFaint }}>
            {doneCnt}/{tasks.length} done
          </span>
          <span style={{ color:theme.textFaint, fontSize:11 }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding:"12px 16px", borderTop:`1px solid ${theme.border}` }}>
          {tasks.map((task, i) => {
            const key = `${day.day}-${i}`;
            return (
              <label key={key} style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:8, cursor:"pointer" }}>
                <input type="checkbox" checked={!!checked[key]} onChange={() => onCheck(key)} style={{ marginTop:2, accentColor:theme.accent, flexShrink:0 }} />
                <span style={{ fontSize:13, color:checked[key]?theme.textFaint:theme.text, textDecoration:checked[key]?"line-through":"none", lineHeight:1.6, fontFamily:"'DM Mono', monospace" }}>{task}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Day Plan Section ──────────────────────────────────────────────────────────
function DayPlanSection({ daily_plan, checked, onCheck, theme, isDark }) {
  if (!daily_plan || !daily_plan.length) return null;

  const totalTasks = daily_plan.reduce((s, d) => s + (d.tasks||[]).length, 0);
  const doneTasks  = daily_plan.reduce((s, d) => s + (d.tasks||[]).filter((_,i) => checked[`${d.day}-${i}`]).length, 0);
  const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <div style={{ padding:"14px 18px", background:theme.cardAlt||theme.card, borderBottom:`1px solid ${theme.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:14, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>📅 {daily_plan.length}-Day Plan</span>
          <span style={{ fontSize:11, color: pct === 100 ? "#22c55e" : theme.textMuted, fontFamily:"'DM Mono', monospace" }}>
            {pct === 100 ? "🎉 All done!" : `${doneTasks}/${totalTasks} tasks`}
          </span>
        </div>
        <div style={{ height:6, background:isDark?"#ffffff10":"#00000010", borderRadius:4, overflow:"hidden" }}>
          <div style={{ height:"100%", width:`${pct}%`, background:pct===100?"#22c55e":theme.accent, borderRadius:4, transition:"width 0.5s ease" }} />
        </div>
      </div>
      <div style={{ padding:"12px" }}>
        {daily_plan.map((day, i) => (
          <DayCard key={i} day={day} isFirst={i===0} checked={checked} onCheck={onCheck} theme={theme} isDark={isDark} />
        ))}
      </div>
    </div>
  );
}

// ── Gap Resource Card ─────────────────────────────────────────────────────────
function GapResourceCard({ resource, isDark, theme }) {
  const [stepsDone, setStepsDone] = useState({});
  const mp    = resource.mini_project || {};
  const story = resource.interview_story || {};

  return (
    <div style={{ border:"1px solid #ef444430", borderLeft:"3px solid #ef4444", borderRadius:10, overflow:"hidden", marginBottom:14, background:isDark?"#1a0a0a":"#fef2f2" }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", borderBottom:"1px solid #ef444420" }}>
        <span style={{ fontSize:13, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>🎯 {resource.skill}</span>
        <span style={{ fontSize:10, background:"#ef444418", color:"#ef4444", border:"1px solid #ef444440", borderRadius:5, padding:"2px 8px", fontFamily:"'DM Mono', monospace", fontWeight:700, textTransform:"uppercase" }}>
          {resource.importance === "gap" ? "Gap" : resource.importance || "Gap"}
        </span>
      </div>
      <div style={{ padding:"12px 16px", borderBottom:"1px solid #ef444415" }}>
        <p style={{ fontSize:10, color:"#ef444490", fontFamily:"'DM Mono', monospace", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>📺 Watch First</p>
        {resource.video ? (
          <a href={resource.video.link||resource.video.url||"#"} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:theme.accent, fontFamily:"'DM Mono', monospace", lineHeight:1.5, textDecoration:"underline", display:"block", wordBreak:"break-word" }}>
            {resource.video.title || resource.video.link || "Watch tutorial"}
          </a>
        ) : (
          <p style={{ fontSize:12, color:theme.textMuted, fontFamily:"'DM Mono', monospace", lineHeight:1.6 }}>
            Search <em style={{ color:theme.textStrong }}>"{resource.skill} tutorial"</em> on YouTube
          </p>
        )}
      </div>
      <div style={{ padding:"12px 16px", borderBottom:"1px solid #ef444415" }}>
        <p style={{ fontSize:10, color:"#ef444490", fontFamily:"'DM Mono', monospace", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>
          🛠️ Build This{mp.time_needed ? ` (${mp.time_needed})` : ""}
        </p>
        {mp.title && <p style={{ fontSize:13, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif", marginBottom:6 }}>{mp.title}</p>}
        {mp.description && <p style={{ fontSize:12, color:theme.textMuted, fontFamily:"'DM Mono', monospace", lineHeight:1.6, marginBottom:10 }}>{mp.description}</p>}
        {(mp.steps||[]).map((step, i) => (
          <label key={i} style={{ display:"flex", alignItems:"flex-start", gap:8, cursor:"pointer", marginBottom:6 }}>
            <input type="checkbox" checked={!!stepsDone[i]} onChange={() => setStepsDone(p=>({...p,[i]:!p[i]}))} style={{ marginTop:2, accentColor:theme.accent, flexShrink:0 }} />
            <span style={{ fontSize:12, fontFamily:"'DM Mono', monospace", lineHeight:1.5, color:stepsDone[i]?theme.textFaint:theme.text, textDecoration:stepsDone[i]?"line-through":"none" }}>{step}</span>
          </label>
        ))}
        {mp.outcome && (
          <div style={{ padding:"8px 12px", background:isDark?"#ffffff08":"#00000006", borderRadius:6, marginTop:8 }}>
            <p style={{ fontSize:10, color:theme.textFaint, fontFamily:"'DM Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>After this you can say:</p>
            <p style={{ fontSize:12, color:theme.textMuted, fontFamily:"'DM Mono', monospace", lineHeight:1.6, fontStyle:"italic" }}>"{mp.outcome}"</p>
          </div>
        )}
      </div>
      <div style={{ padding:"12px 16px" }}>
        <p style={{ fontSize:10, color:"#ef444490", fontFamily:"'DM Mono', monospace", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>💬 What To Say</p>
        {story.what_to_say && <p style={{ fontSize:13, color:theme.text, fontFamily:"'DM Mono', monospace", lineHeight:1.7, fontStyle:"italic", marginBottom:story.key_phrase?10:0 }}>{story.what_to_say}</p>}
        {story.key_phrase && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:8 }}>
            <span style={{ fontSize:10, color:theme.textFaint, fontFamily:"'DM Mono', monospace", textTransform:"uppercase", letterSpacing:"0.06em", flexShrink:0 }}>Key phrase:</span>
            <span style={{ fontSize:13, fontWeight:700, color:theme.accent, fontFamily:"'DM Mono', monospace" }}>"{story.key_phrase}"</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Gap Resources Section ─────────────────────────────────────────────────────
function GapResourcesSection({ gapResources, gapResourcesLoading, gapSkillNames, theme, isDark }) {
  if (!gapResourcesLoading && (!gapResources || !gapResources.length)) return null;

  const skeletonNames = gapSkillNames && gapSkillNames.length > 0 ? gapSkillNames.slice(0, 3) : ["Skill 1", "Skill 2", "Skill 3"];

  return (
    <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      <div style={{ padding:"14px 18px", background:theme.cardAlt||theme.card, borderBottom:`1px solid ${theme.border}` }}>
        <span style={{ fontSize:14, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>📚 Gap Learning Resources</span>
      </div>
      <div style={{ padding:"16px 18px" }}>
        <style>{`@keyframes pc-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
        {gapResourcesLoading ? (
          skeletonNames.map((name, i) => (
            <div key={i} style={{ border:"1px solid #ef444430", borderLeft:"3px solid #ef444430", borderRadius:10, overflow:"hidden", marginBottom:14, background:isDark?"#1a0a0a":"#fef2f2" }}>
              <div style={{ padding:"12px 16px", borderBottom:"1px solid #ef444415", display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:13, animation:"pc-pulse 1.5s ease-in-out infinite", display:"inline-block" }}>⟳</span>
                <span style={{ fontSize:12, color:theme.textMuted, fontFamily:"'DM Mono', monospace" }}>
                  Finding best resources for <strong style={{ color:theme.textStrong }}>{name}</strong>…
                </span>
              </div>
              <div style={{ padding:"12px 16px" }}>
                <div style={{ height:12, width:"70%", borderRadius:4, background:isDark?"#ffffff10":"#00000010", animation:"pc-pulse 1.5s ease-in-out infinite", marginBottom:8 }} />
                <div style={{ height:12, width:"45%", borderRadius:4, background:isDark?"#ffffff08":"#00000008", animation:"pc-pulse 1.5s ease-in-out infinite", animationDelay:"0.2s" }} />
              </div>
            </div>
          ))
        ) : (
          gapResources.slice(0, 3).map((resource, i) => (
            <GapResourceCard key={i} resource={resource} isDark={isDark} theme={theme} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Difficulty Badge ──────────────────────────────────────────────────────────
const DIFF_COLORS = {
  easy:   { bg:"#16a34a20", border:"#16a34a40", text:"#16a34a" },
  medium: { bg:"#d9770620", border:"#d9770640", text:"#d97706" },
  hard:   { bg:"#dc262620", border:"#dc262640", text:"#dc2626" },
};

function DiffBadge({ level }) {
  const c = DIFF_COLORS[level] || DIFF_COLORS.medium;
  return (
    <span style={{ fontSize:10, background:c.bg, color:c.text, border:`1px solid ${c.border}`, borderRadius:5, padding:"2px 7px", fontFamily:"'DM Mono', monospace", fontWeight:700, whiteSpace:"nowrap", flexShrink:0, textTransform:"uppercase" }}>{level || "medium"}</span>
  );
}

// ── Question Bank ─────────────────────────────────────────────────────────────
const SECTION_META = {
  opening:               { label:"Opening",              emoji:"👋" },
  domain:                { label:"Domain Knowledge",     emoji:"🏦" },
  technical:             { label:"Technical",            emoji:"⚙️" },
  sql_data:              { label:"SQL & Data",           emoji:"🗄️" },
  leadership_behavioral: { label:"Leadership & Behavioral", emoji:"🤝" },
  vp_strategic:          { label:"Strategic / VP-Level", emoji:"📈" },
  closing:               { label:"Closing",              emoji:"🎯" },
};

function QuestionBank({ question_bank, practiced, onToggle, theme, isDark }) {
  const [openSections, setOpenSections] = useState(() =>
    Object.fromEntries(Object.keys(question_bank).map((k, i) => [k, i === 0]))
  );
  const [search,       setSearch]       = useState("");
  const [practiceMode, setPracticeMode] = useState(false);
  const [showAnswer,   setShowAnswer]   = useState(false);
  const [practiceIdx,  setPracticeIdx]  = useState(0);

  // Flatten all questions for practice mode
  const allQuestions = Object.entries(question_bank).flatMap(([sectionKey, qs]) =>
    (qs || []).map((q, i) => ({ ...q, sectionKey, idx: i, key: `${sectionKey}_${i}` }))
  );

  const searchLower = search.toLowerCase();
  const filteredAll = search
    ? allQuestions.filter(q => q.question?.toLowerCase().includes(searchLower) || q.answer_guide?.toLowerCase().includes(searchLower))
    : allQuestions;

  const totalCount    = allQuestions.length;
  const practicedCount= Object.values(practiced).filter(Boolean).length;

  // Practice mode navigation
  const clampedIdx   = Math.min(practiceIdx, filteredAll.length - 1);
  const practiceQ    = filteredAll[clampedIdx];

  if (practiceMode && filteredAll.length > 0) {
    const done = practiceQ ? !!practiced[practiceQ.key] : false;
    return (
      <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
        {/* Header */}
        <div style={{ padding:"14px 18px", background:theme.cardAlt||theme.card, borderBottom:`1px solid ${theme.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:14, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>🎤 Practice Mode</span>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:11, fontFamily:"'DM Mono', monospace", color:theme.textMuted }}>
              Q {clampedIdx + 1} of {filteredAll.length}
            </span>
            <button onClick={() => { setPracticeMode(false); setShowAnswer(false); setPracticeIdx(0); }} style={{ background:"transparent", border:`1px solid ${theme.border}`, color:theme.textMuted, borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
              ✕ Exit Practice
            </button>
          </div>
        </div>
        <div style={{ padding:"24px 24px" }}>
          {/* Progress bar */}
          <div style={{ height:4, background:isDark?"#ffffff10":"#00000010", borderRadius:4, overflow:"hidden", marginBottom:20 }}>
            <div style={{ height:"100%", width:`${((clampedIdx+1)/filteredAll.length)*100}%`, background:theme.accent, borderRadius:4, transition:"width 0.3s" }} />
          </div>

          {practiceQ && (
            <>
              {/* Category tag */}
              {practiceQ.sectionKey && SECTION_META[practiceQ.sectionKey] && (
                <span style={{ fontSize:10, background:theme.accent+"15", color:theme.accent, border:`1px solid ${theme.accent}30`, borderRadius:10, padding:"2px 8px", fontFamily:"'DM Mono', monospace", marginBottom:16, display:"inline-block" }}>
                  {SECTION_META[practiceQ.sectionKey].emoji} {SECTION_META[practiceQ.sectionKey].label}
                </span>
              )}
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginTop:12, marginBottom:20 }}>
                <p style={{ fontSize:16, fontWeight:700, color:theme.textStrong, lineHeight:1.5, fontFamily:"'Plus Jakarta Sans', sans-serif", margin:0 }}>
                  {practiceQ.question}
                </p>
                <DiffBadge level={practiceQ.difficulty || "medium"} />
              </div>

              {/* Answer area */}
              {!showAnswer ? (
                <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
                  <button onClick={() => setShowAnswer(true)} style={{ background:theme.accent+"20", color:theme.accent, border:`1px solid ${theme.accent}40`, borderRadius:8, padding:"10px 20px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
                    💡 Show Answer Guide
                  </button>
                </div>
              ) : (
                <div style={{ background:isDark?"#ffffff06":"#00000005", border:`1px solid ${theme.border}`, borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
                  {practiceQ.answer_guide && (
                    <p style={{ fontSize:13, color:theme.text, fontFamily:"'DM Mono', monospace", lineHeight:1.7, margin:0, marginBottom:(practiceQ.key_points||[]).length?12:0 }}>
                      💡 {practiceQ.answer_guide}
                    </p>
                  )}
                  {(practiceQ.key_points||[]).length > 0 && (
                    <ul style={{ margin:0, paddingLeft:18 }}>
                      {practiceQ.key_points.map((pt, pi) => (
                        <li key={pi} style={{ fontSize:12, color:theme.textMuted, lineHeight:1.6, fontFamily:"'DM Mono', monospace" }}>{pt}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Actions row */}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:16, alignItems:"center" }}>
                <button
                  onClick={() => onToggle(practiceQ.key)}
                  style={{ fontSize:12, padding:"8px 14px", borderRadius:8, cursor:"pointer", fontFamily:"'DM Mono', monospace", fontWeight:600, background:done?"#16a34a20":"transparent", color:done?"#16a34a":theme.textMuted, border:`1px solid ${done?"#16a34a50":theme.border}` }}
                >
                  {done ? "✓ Practiced" : "Mark Practiced"}
                </button>
                {clampedIdx < filteredAll.length - 1 ? (
                  <button onClick={() => { setPracticeIdx(i => i+1); setShowAnswer(false); }} style={{ background:theme.accent, color:theme.background, border:"none", borderRadius:8, padding:"8px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
                    Next Question →
                  </button>
                ) : (
                  <span style={{ fontSize:12, color:"#22c55e", fontFamily:"'DM Mono', monospace", fontWeight:700 }}>🎉 That's all the questions!</span>
                )}
                {clampedIdx > 0 && (
                  <button onClick={() => { setPracticeIdx(i => i-1); setShowAnswer(false); }} style={{ background:"transparent", color:theme.textMuted, border:`1px solid ${theme.border}`, borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
                    ← Prev
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Normal (browsing) mode
  return (
    <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
      {/* Header */}
      <div style={{ padding:"14px 18px", background:theme.cardAlt||theme.card, borderBottom:`1px solid ${theme.border}` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10, marginBottom:10 }}>
          <span style={{ fontSize:14, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>💬 Question Bank</span>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontSize:11, fontFamily:"'DM Mono', monospace", color: practicedCount === totalCount && totalCount > 0 ? "#16a34a" : theme.textMuted }}>
              Practiced: {practicedCount}/{totalCount}
            </span>
            <button onClick={() => { setPracticeMode(true); setPracticeIdx(0); setShowAnswer(false); }} style={{ background:theme.accent+"15", color:theme.accent, border:`1px solid ${theme.accent}40`, borderRadius:7, padding:"5px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono', monospace" }}>
              🎤 Practice Mode
            </button>
          </div>
        </div>
        {/* Search */}
        <input
          type="text"
          placeholder="Search questions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width:"100%", background:theme.inputBg||theme.background, border:`1px solid ${theme.border}`, borderRadius:8, padding:"8px 12px", color:theme.text, fontSize:12, fontFamily:"'DM Mono', monospace", outline:"none" }}
        />
      </div>

      <div style={{ padding:"12px" }}>
        {search ? (
          // Flat search results
          filteredAll.length === 0 ? (
            <p style={{ fontSize:13, color:theme.textMuted, fontFamily:"'DM Mono', monospace", padding:"12px 4px" }}>No questions match "{search}"</p>
          ) : (
            filteredAll.map((q, i) => {
              const done = !!practiced[q.key];
              return (
                <div key={i} style={{ marginBottom:8, padding:"12px 14px", background:theme.background, borderRadius:8, border:`1px solid ${theme.border}`, borderLeft:`3px solid ${done?"#16a34a":theme.border}`, opacity:done?0.8:1 }}>
                  <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:6 }}>
                    <p style={{ fontSize:13, fontWeight:700, color:done?theme.textMuted:theme.textStrong, lineHeight:1.5, fontFamily:"'Plus Jakarta Sans', sans-serif", margin:0 }}>{q.question}</p>
                    <DiffBadge level={q.difficulty||"medium"} />
                  </div>
                  {q.answer_guide && <p style={{ fontSize:12, color:theme.textMuted, lineHeight:1.6, fontFamily:"'DM Mono', monospace", margin:"0 0 8px" }}>💡 {q.answer_guide}</p>}
                  <button onClick={() => onToggle(q.key)} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, cursor:"pointer", fontFamily:"'DM Mono', monospace", fontWeight:600, background:done?"#16a34a20":"transparent", color:done?"#16a34a":theme.textMuted, border:`1px solid ${done?"#16a34a50":theme.border}` }}>
                    {done ? "✓ Practiced" : "Mark Practiced"}
                  </button>
                </div>
              );
            })
          )
        ) : (
          // Section accordions
          Object.entries(question_bank).map(([sectionKey, questions]) => {
            if (!questions || !questions.length) return null;
            const meta = SECTION_META[sectionKey] || { label:sectionKey, emoji:"❓" };
            const secPracticed = questions.filter((_,i) => practiced[`${sectionKey}_${i}`]).length;
            const isOpen = openSections[sectionKey];
            return (
              <div key={sectionKey} style={{ marginBottom:8, border:`1px solid ${theme.border}`, borderRadius:10, overflow:"hidden" }}>
                <button
                  onClick={() => setOpenSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                  style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px", background:theme.card, border:"none", cursor:"pointer", gap:10 }}
                >
                  <span style={{ fontSize:13, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>{meta.emoji} {meta.label}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:11, fontFamily:"'DM Mono', monospace", color:secPracticed===questions.length&&questions.length>0?"#16a34a":theme.textMuted }}>
                      {secPracticed}/{questions.length}
                    </span>
                    <span style={{ fontSize:11, color:theme.textFaint }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </button>
                {isOpen && (
                  <div style={{ padding:"0 12px 12px" }}>
                    {questions.map((q, i) => {
                      const key  = `${sectionKey}_${i}`;
                      const done = !!practiced[key];
                      return (
                        <div key={i} style={{ marginTop:10, padding:"12px 14px", background:done?theme.background+"80":theme.background, borderRadius:8, border:`1px solid ${theme.border}`, borderLeft:`3px solid ${done?"#16a34a":theme.border}`, opacity:done?0.8:1, transition:"all 0.2s" }}>
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:6 }}>
                            <p style={{ fontSize:13, fontWeight:700, color:done?theme.textMuted:theme.textStrong, lineHeight:1.5, fontFamily:"'Plus Jakarta Sans', sans-serif", margin:0 }}>{q.question}</p>
                            <DiffBadge level={q.difficulty||"medium"} />
                          </div>
                          {q.answer_guide && <p style={{ fontSize:12, color:theme.textMuted, lineHeight:1.6, fontFamily:"'DM Mono', monospace", margin:"0 0 6px" }}>💡 {q.answer_guide}</p>}
                          {q.key_points && q.key_points.length > 0 && (
                            <ul style={{ margin:"0 0 8px", paddingLeft:16 }}>
                              {q.key_points.map((pt,pi) => <li key={pi} style={{ fontSize:11, color:theme.textFaint, lineHeight:1.6, fontFamily:"'DM Mono', monospace" }}>{pt}</li>)}
                            </ul>
                          )}
                          <button onClick={() => onToggle(key)} style={{ fontSize:11, padding:"4px 10px", borderRadius:6, cursor:"pointer", fontFamily:"'DM Mono', monospace", fontWeight:600, background:done?"#16a34a20":"transparent", color:done?"#16a34a":theme.textMuted, border:`1px solid ${done?"#16a34a50":theme.border}`, transition:"all 0.15s" }}>
                            {done ? "✓ Practiced" : "Mark as Practiced"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main PrepCoach ────────────────────────────────────────────────────────────
export default function PrepCoach({
  prepPlan, prepLoading, prepError,
  daysUntilInterview, hoursPerDay,
  onDaysChange, onHoursChange, onGenerate,
  jobTitle, companyName, resume, jd,
  gapResources = [], gapResourcesLoading = false,
}) {
  const { theme, isDark } = useTheme();
  const [checked,      setChecked]      = useState({});
  const [practiced,    setPracticed]    = useState({});
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  function toggleCheck(key)    { setChecked(prev => ({ ...prev, [key]: !prev[key] })); }
  function togglePracticed(key){ setPracticed(prev => ({ ...prev, [key]: !prev[key] })); }

  function buildCoachingPrompt() {
    if (!prepPlan) return "";
    const gaps = (prepPlan.readiness_assessment?.items || [])
      .filter(item => item.level === "gap" || item.level === "neutral")
      .map(item => `- ${item.label} (${item.level})${item.note ? ": " + item.note : ""}`)
      .join("\n");
    const planSummary = (prepPlan.daily_plan || [])
      .map(d => `Day ${d.day} — ${d.theme}: ${(d.tasks||[]).join("; ")}`)
      .join("\n");
    return `You are an expert interview coach. I have an interview coming up and need your help with mock practice.

ROLE: ${jobTitle || "the role"}
COMPANY: ${companyName || "the company"}
DAYS UNTIL INTERVIEW: ${daysUntilInterview}

MY RESUME (excerpt):
${resume ? resume.slice(0, 500) : "Not provided"}

JOB DESCRIPTION (excerpt):
${jd ? jd.slice(0, 500) : "Not provided"}

MY SKILL GAPS:
${gaps || "None identified"}

MY PREP PLAN:
${planSummary || "Not generated yet"}

INSTRUCTIONS:
1. Start by asking me one interview question at a time from the question bank above
2. After I answer, give me specific feedback: what I did well, what to improve, and a model answer
3. Track my progress and adjust difficulty based on my responses
4. Focus extra time on my skill gaps
5. End each session with 3 key takeaways

Let's start — ask me the first question.`;
  }

  function copyCoachingPrompt() {
    navigator.clipboard.writeText(buildCoachingPrompt()).then(() => {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    });
  }

  function openInClaude() {
    window.open(`https://claude.ai/new?q=${encodeURIComponent(buildCoachingPrompt())}`, "_blank");
  }

  // ── Input screen ──────────────────────────────────────────────────────────
  if (!prepPlan && !prepLoading) {
    return (
      <div style={{ maxWidth:520, margin:"0 auto", padding:"32px 0" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🎯</div>
          <h2 style={{ fontSize:22, fontWeight:800, color:theme.textStrong, marginBottom:8, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>PrepCoach</h2>
          <p style={{ color:theme.textMuted, fontSize:14, lineHeight:1.7 }}>
            Get a personalised day-by-day interview prep plan for{" "}
            <strong style={{ color:theme.textStrong }}>{jobTitle || "this role"}</strong>
            {companyName ? <> at <strong style={{ color:theme.textStrong }}>{companyName}</strong></> : ""}.
          </p>
        </div>

        <div style={{ background:theme.card, border:`1px solid ${theme.border}`, borderRadius:14, padding:28 }}>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:12, color:theme.textMuted, fontFamily:"'DM Mono', monospace", marginBottom:8, letterSpacing:"0.06em" }}>DAYS UNTIL INTERVIEW</label>
            <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              {[1,2,3,5,7,14].map(d => (
                <button key={d} onClick={() => onDaysChange(d)} style={{ width:44, height:44, borderRadius:10, border:`1px solid ${daysUntilInterview===d?theme.accent:theme.border}`, background:daysUntilInterview===d?theme.accent+"20":"transparent", color:daysUntilInterview===d?theme.accent:theme.textMuted, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono', monospace", transition:"all 0.15s" }}>{d}</button>
              ))}
              <input type="number" min={1} max={60} value={daysUntilInterview||""} onChange={e => onDaysChange(parseInt(e.target.value)||null)} placeholder="?" style={{ width:60, height:44, borderRadius:10, border:`1px solid ${theme.border}`, background:theme.inputBg, color:theme.text, fontSize:14, textAlign:"center", fontFamily:"'DM Mono', monospace", padding:"0 8px" }} />
            </div>
          </div>

          <div style={{ marginBottom:28 }}>
            <label style={{ display:"block", fontSize:12, color:theme.textMuted, fontFamily:"'DM Mono', monospace", marginBottom:8, letterSpacing:"0.06em" }}>STUDY HOURS PER DAY</label>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              {[1,2,3,4].map(h => (
                <button key={h} onClick={() => onHoursChange(h)} style={{ width:44, height:44, borderRadius:10, border:`1px solid ${hoursPerDay===h?theme.accent:theme.border}`, background:hoursPerDay===h?theme.accent+"20":"transparent", color:hoursPerDay===h?theme.accent:theme.textMuted, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"'DM Mono', monospace", transition:"all 0.15s" }}>{h}h</button>
              ))}
            </div>
          </div>

          {prepError && <p style={{ color:"#ef4444", fontSize:13, fontFamily:"'DM Mono', monospace", marginBottom:16 }}>{prepError}</p>}

          <button onClick={onGenerate} disabled={!daysUntilInterview} style={{ width:"100%", background:daysUntilInterview?theme.accent:theme.border, color:daysUntilInterview?theme.background:theme.textFaint, border:"none", borderRadius:10, padding:"14px 0", fontSize:15, fontWeight:700, cursor:daysUntilInterview?"pointer":"not-allowed", fontFamily:"'Plus Jakarta Sans', sans-serif", transition:"all 0.15s" }}>
            🚀 Generate My Prep Plan
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (prepLoading) return <PrepLoader companyName={companyName} />;

  // ── Plan display ──────────────────────────────────────────────────────────
  const { interview_structure, readiness_assessment, daily_plan, question_bank, emergency_tips } = prepPlan;
  const isEmergency = daysUntilInterview && daysUntilInterview <= 3;

  // Gap skill names for named skeletons
  const gapSkillNames = (readiness_assessment?.items || [])
    .filter(it => it.level === "gap" || it.level === "neutral")
    .slice(0, 3)
    .map(it => it.label);

  return (
    <div>
      <style>{`
        .pc-nav-btn { background: transparent; border: none; cursor: pointer; padding: 6px 14px; font-size: 12px; font-family: 'DM Mono', monospace; border-radius: 20px; transition: all 0.15s; }
        .pc-nav-btn:hover { background: var(--pc-accent-dim, #ffffff10); }
      `}</style>

      {/* ── Hero Header ── */}
      <HeroHeader
        prepPlan={prepPlan}
        jobTitle={jobTitle} companyName={companyName}
        daysUntilInterview={daysUntilInterview} hoursPerDay={hoursPerDay}
        onGenerate={onGenerate} onOpenClaude={openInClaude}
        onCopyPrompt={copyCoachingPrompt} copiedPrompt={copiedPrompt}
        theme={theme} isDark={isDark}
      />

      {/* Emergency banner */}
      {isEmergency && emergency_tips && emergency_tips.length > 0 && (
        <div style={{ background:isDark?"#1c0a0a":"#fef2f2", border:"1px solid #ef444440", borderRadius:12, padding:"16px 18px", marginBottom:12 }}>
          <p style={{ fontSize:13, fontWeight:700, color:"#ef4444", marginBottom:10, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
            🚨 Emergency Tips — {daysUntilInterview} day{daysUntilInterview!==1?"s":""} to go
          </p>
          <ul style={{ margin:0, paddingLeft:18 }}>
            {emergency_tips.map((tip, i) => (
              <li key={i} style={{ fontSize:13, color:theme.text, lineHeight:1.7, marginBottom:4, fontFamily:"'DM Mono', monospace" }}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Skill Bars ── */}
      <SkillBarsSection items={readiness_assessment?.items || []} theme={theme} isDark={isDark} />

      {/* ── Interview Timeline ── */}
      <InterviewTimeline interview_structure={interview_structure} theme={theme} isDark={isDark} />

      {/* ── Day Plan ── */}
      <DayPlanSection daily_plan={daily_plan} checked={checked} onCheck={toggleCheck} theme={theme} isDark={isDark} />

      {/* ── Question Bank ── */}
      {question_bank && Object.keys(question_bank).length > 0 && (
        <QuestionBank question_bank={question_bank} practiced={practiced} onToggle={togglePracticed} theme={theme} isDark={isDark} />
      )}

      {/* ── Gap Resources ── */}
      <GapResourcesSection gapResources={gapResources} gapResourcesLoading={gapResourcesLoading} gapSkillNames={gapSkillNames} theme={theme} isDark={isDark} />

      {/* ── Emergency tips (non-emergency — bottom section) ── */}
      {!isEmergency && emergency_tips && emergency_tips.length > 0 && (
        <div style={{ border:`1px solid ${theme.border}`, borderRadius:12, overflow:"hidden", marginBottom:12 }}>
          <div style={{ padding:"14px 18px", background:theme.cardAlt||theme.card, borderBottom:`1px solid ${theme.border}` }}>
            <span style={{ fontSize:14, fontWeight:700, color:theme.textStrong, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>🚨 Emergency Tips</span>
          </div>
          <div style={{ padding:"16px 18px" }}>
            <ul style={{ margin:0, paddingLeft:18 }}>
              {emergency_tips.map((tip, i) => (
                <li key={i} style={{ fontSize:13, color:theme.text, lineHeight:1.7, marginBottom:4, fontFamily:"'DM Mono', monospace" }}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
