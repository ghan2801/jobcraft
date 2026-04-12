import { useState } from "react";
import DiffView from "./DiffView";

const ACCENT  = "#00E5A0";
const CARD    = "#111827";
const BORDER  = "#1E2D40";

function SectionCard({ icon, title, children, fullWidth = false }) {
  return (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: 20,
      gridColumn: fullWidth ? "1 / -1" : undefined,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff", fontFamily: "'Syne', sans-serif" }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function Pill({ children }) {
  return (
    <span style={{
      background: "#00E5A018",
      color: ACCENT,
      border: "1px solid #00E5A040",
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 12,
      fontFamily: "'DM Mono', monospace",
      fontWeight: 500,
      display: "inline-block",
    }}>{children}</span>
  );
}

export default function ChangeSummary({ changeSummary, original, tailored }) {
  const [diffOpen, setDiffOpen] = useState(false);

  if (!changeSummary) {
    return (
      <div style={{ color: "#4B5A70", fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center", padding: "32px 0" }}>
        No change summary available.
      </div>
    );
  }

  const {
    overall_strategy,
    title_change,
    keywords_added      = [],
    sections_reframed   = [],
    removed_or_deemphasized = [],
  } = changeSummary;

  const titleChanged = title_change && title_change.from && title_change.to &&
    title_change.from.trim().toLowerCase() !== title_change.to.trim().toLowerCase();

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

        {/* Card 1 — Overall Strategy (full width) */}
        {overall_strategy && (
          <SectionCard icon="🎯" title="Tailoring Strategy" fullWidth>
            <div style={{
              background: "#0D1F2D",
              border: "1px solid #1B3A52",
              borderRadius: 8,
              padding: "12px 16px",
            }}>
              <p style={{ color: "#A8D8F0", fontSize: 13, lineHeight: 1.7, fontFamily: "'DM Mono', monospace" }}>
                {overall_strategy}
              </p>
            </div>
          </SectionCard>
        )}

        {/* Card 2 — Title Change */}
        {titleChanged && (
          <SectionCard icon="📝" title="Title Change" fullWidth>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#FF9999", fontFamily: "'DM Mono', monospace", background: "#FF6B6B10", border: "1px solid #FF6B6B30", borderRadius: 6, padding: "4px 12px" }}>
                {title_change.from}
              </span>
              <span style={{ color: "#4B5A70", fontSize: 16 }}>→</span>
              <span style={{ fontSize: 13, color: ACCENT, fontFamily: "'DM Mono', monospace", background: "#00E5A010", border: "1px solid #00E5A030", borderRadius: 6, padding: "4px 12px" }}>
                {title_change.to}
              </span>
            </div>
            {title_change.reason && (
              <p style={{ color: "#6B7FA3", fontSize: 11, fontStyle: "italic", marginTop: 10, lineHeight: 1.6, fontFamily: "'DM Mono', monospace" }}>
                {title_change.reason}
              </p>
            )}
          </SectionCard>
        )}

        {/* Card 3 — Keywords Added */}
        {keywords_added.length > 0 && (
          <SectionCard icon="✨" title={`Keywords Added (${keywords_added.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {keywords_added.map((kw, i) => (
                <div key={i}>
                  <Pill>{kw.keyword}</Pill>
                  {(kw.added_where || kw.reason) && (
                    <p style={{ color: "#6B7FA3", fontSize: 11, fontStyle: "italic", marginTop: 4, lineHeight: 1.5, fontFamily: "'DM Mono', monospace" }}>
                      {kw.added_where && <span>{kw.added_where}</span>}
                      {kw.added_where && kw.reason && <span> · </span>}
                      {kw.reason && <span>{kw.reason}</span>}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Card 4 — Sections Reframed */}
        {sections_reframed.length > 0 && (
          <SectionCard icon="🔄" title={`Sections Reframed (${sections_reframed.length})`}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {sections_reframed.map((item, i) => (
                <div key={i} style={{ borderLeft: "2px solid #1E2D40", paddingLeft: 12 }}>
                  {item.section && (
                    <p style={{ fontSize: 12, fontWeight: 700, color: "#CBD5E1", fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>
                      {item.section}
                    </p>
                  )}
                  {item.change && (
                    <p style={{ fontSize: 12, color: "#8899A6", lineHeight: 1.5, fontFamily: "'DM Mono', monospace", marginBottom: 3 }}>
                      {item.change}
                    </p>
                  )}
                  {item.reason && (
                    <p style={{ fontSize: 11, color: "#6B7FA3", fontStyle: "italic", lineHeight: 1.5, fontFamily: "'DM Mono', monospace" }}>
                      {item.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Card 5 — Removed / De-emphasized */}
        {removed_or_deemphasized.length > 0 && (
          <SectionCard icon="📉" title={`De-emphasized (${removed_or_deemphasized.length})`} fullWidth={keywords_added.length === 0 && sections_reframed.length === 0}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {removed_or_deemphasized.map((item, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#F59E0B", fontSize: 12, marginTop: 1, flexShrink: 0 }}>▸</span>
                  <div>
                    {item.item && (
                      <p style={{ fontSize: 12, color: "#FFD166", fontFamily: "'DM Mono', monospace", fontWeight: 600, marginBottom: 2 }}>
                        {item.item}
                      </p>
                    )}
                    {item.reason && (
                      <p style={{ fontSize: 11, color: "#6B7FA3", fontStyle: "italic", lineHeight: 1.5, fontFamily: "'DM Mono', monospace" }}>
                        {item.reason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

      </div>

      {/* Collapsible raw diff */}
      <div style={{ marginTop: 20 }}>
        <button
          onClick={() => setDiffOpen(o => !o)}
          style={{
            background: "transparent",
            border: `1px solid ${BORDER}`,
            color: "#4B5A70",
            borderRadius: 8,
            padding: "8px 16px",
            fontSize: 12,
            cursor: "pointer",
            fontFamily: "'DM Mono', monospace",
            display: "flex",
            alignItems: "center",
            gap: 6,
            transition: "color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = ACCENT; }}
          onMouseLeave={e => { e.currentTarget.style.color = "#4B5A70"; e.currentTarget.style.borderColor = BORDER; }}
        >
          <span style={{ fontSize: 10, transform: diffOpen ? "rotate(180deg)" : "none", display: "inline-block", transition: "transform 0.2s" }}>▼</span>
          {diffOpen ? "Hide line-by-line diff" : "Show line-by-line diff"}
        </button>
        {diffOpen && (
          <div style={{ marginTop: 12 }}>
            <DiffView original={original} tailored={tailored} />
          </div>
        )}
      </div>
    </div>
  );
}
