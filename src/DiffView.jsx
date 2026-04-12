const ACCENT  = "#00E5A0";
const DARK    = "#0A0F1E";
const BORDER  = "#1E2D40";

function Tag({ children, color = ACCENT }) {
  return (
    <span style={{
      background: color + "18",
      color: color,
      border: `1px solid ${color}40`,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 11,
      fontFamily: "'DM Mono', monospace",
      fontWeight: 500,
      letterSpacing: "0.05em",
    }}>{children}</span>
  );
}

export default function DiffView({ original, tailored }) {
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
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "'Syne', sans-serif" }}>Resume Diff</span>
        <Tag color="#FF6B6B">{changes} lines changed</Tag>
        <Tag color={ACCENT}>ATS Optimized</Tag>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, borderRadius: 8, overflow: "hidden", border: `1px solid ${BORDER}` }}>
        <div style={{ background: "#0D1117", padding: "10px 14px", borderBottom: `2px solid #FF6B6B40` }}>
          <span style={{ fontSize: 11, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>ORIGINAL</span>
        </div>
        <div style={{ background: "#0D1117", padding: "10px 14px", borderBottom: `2px solid ${ACCENT}40` }}>
          <span style={{ fontSize: 11, color: ACCENT, fontFamily: "'DM Mono', monospace" }}>TAILORED</span>
        </div>
        {rows.map((row, i) => (
          <>
            <div key={`o-${i}`} style={{
              background: row.changed ? "#FF6B6B0A" : DARK,
              padding: "4px 14px",
              borderRight: `1px solid ${BORDER}`,
              borderLeft: row.changed ? "3px solid #FF6B6B" : "3px solid transparent",
            }}>
              <span style={{ fontSize: 12, color: row.changed ? "#FF9999" : "#4B5A70", fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{row.o || " "}</span>
            </div>
            <div key={`t-${i}`} style={{
              background: row.changed ? `${ACCENT}08` : DARK,
              padding: "4px 14px",
              borderLeft: row.changed ? `3px solid ${ACCENT}` : "3px solid transparent",
            }}>
              <span style={{ fontSize: 12, color: row.changed ? ACCENT : "#4B5A70", fontFamily: "'DM Mono', monospace", whiteSpace: "pre-wrap", lineHeight: 1.7 }}>{row.t || " "}</span>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}
