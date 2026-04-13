import { useTheme } from "./ThemeContext";

export default function DiffView({ original, tailored }) {
  const { theme } = useTheme();

  const origLines = original.split("\n");
  const tailLines = tailored.split("\n");
  const maxLen = Math.max(origLines.length, tailLines.length);
  const rows = [];
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i] ?? "";
    const t = tailLines[i] ?? "";
    const changed = o.trim() !== t.trim();
    rows.push({ o, t, changed });
  }
  const changes = rows.filter(r => r.changed).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <span style={{ color: theme.textStrong, fontWeight: 700, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>Resume Diff</span>
        <span style={{ background: "#FF6B6B18", color: "#FF6B6B", border: "1px solid #FF6B6B40", borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>{changes} lines changed</span>
        <span style={{ background: theme.accent + "18", color: theme.accent, border: `1px solid ${theme.accent}40`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 500 }}>ATS Optimized</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}` }}>
        <div style={{ background: theme.cardAlt, padding: "10px 14px", borderBottom: "2px solid #FF6B6B40" }}>
          <span style={{ fontSize: 11, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>ORIGINAL</span>
        </div>
        <div style={{ background: theme.cardAlt, padding: "10px 14px", borderBottom: `2px solid ${theme.accent}40` }}>
          <span style={{ fontSize: 11, color: theme.accent, fontFamily: "'DM Mono', monospace" }}>TAILORED</span>
        </div>
        {rows.map((row, i) => (
          <>
            <div key={`o-${i}`} style={{
              background: row.changed ? "#FF6B6B0A" : theme.background,
              padding: "4px 14px",
              borderRight: `1px solid ${theme.border}`,
              borderLeft: row.changed ? "3px solid #FF6B6B" : "3px solid transparent",
            }}>
              <span style={{ fontSize: 12, color: row.changed ? "#FF9999" : theme.textFaint, fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{row.o || " "}</span>
            </div>
            <div key={`t-${i}`} style={{
              background: row.changed ? (theme.accent + "08") : theme.background,
              padding: "4px 14px",
              borderLeft: row.changed ? `3px solid ${theme.accent}` : "3px solid transparent",
            }}>
              <span style={{ fontSize: 12, color: row.changed ? theme.accent : theme.textFaint, fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{row.t || " "}</span>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}
