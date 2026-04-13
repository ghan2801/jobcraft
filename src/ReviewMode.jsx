import { useTheme } from "./ThemeContext";

const TYPE_CONFIG = {
  title_change:     { label: "Title Change",     color: "#8B5CF6" },
  keyword_added:    { label: "Keyword Added",    color: "#00C47A" },
  section_reframed: { label: "Section Reframed", color: "#3B82F6" },
  skill_added:      { label: "Skill Added",      color: "#06B6D4" },
};

const RISK_CONFIG = {
  moderate: { label: "⚠ Moderate risk", color: "#F59E0B", bg: "#F59E0B10", border: "#F59E0B40" },
  risky:    { label: "⚠ Risky change",  color: "#FF6B6B", bg: "#FF6B6B10", border: "#FF6B6B40" },
};

function TypeBadge({ type }) {
  const cfg = TYPE_CONFIG[type] || { label: type, color: "#6B7FA3" };
  return (
    <span style={{
      background: cfg.color + "18",
      color: cfg.color,
      border: `1px solid ${cfg.color}40`,
      borderRadius: 4,
      padding: "2px 8px",
      fontSize: 10,
      fontFamily: "'DM Mono', monospace",
      fontWeight: 600,
      letterSpacing: "0.05em",
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    }}>{cfg.label}</span>
  );
}

function ChangeCard({ change, accepted, onToggle }) {
  const { theme } = useTheme();
  const risk     = RISK_CONFIG[(change.risk_level || "").toLowerCase()];
  const showRisk = risk && change.risk_level !== "safe";

  return (
    <div style={{
      background: accepted ? theme.card : theme.cardDeep,
      border: `1px solid ${accepted ? theme.border : (theme.isDark ? "#0F1A28" : theme.border)}`,
      borderRadius: 10,
      padding: 16,
      opacity: accepted ? 1 : 0.55,
      transition: "all 0.2s",
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
        <TypeBadge type={change.type} />
        <p style={{
          flex: 1,
          fontSize: 13,
          color: accepted ? theme.text : theme.textFaint,
          fontFamily: "'Syne', sans-serif",
          fontWeight: 600,
          lineHeight: 1.4,
        }}>{change.description}</p>
        <span style={{
          background: theme.accent + "18",
          color: theme.accent,
          border: `1px solid ${theme.accent}40`,
          borderRadius: 6,
          padding: "2px 8px",
          fontSize: 11,
          fontFamily: "'DM Mono', monospace",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}>+{change.ats_impact} pts</span>
      </div>

      {/* Body */}
      <div style={{ marginBottom: 10 }}>
        {change.type === "title_change" && change.original_text && change.new_text && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "#FF9999", fontFamily: "'DM Mono', monospace", background: "#FF6B6B10", border: "1px solid #FF6B6B30", borderRadius: 6, padding: "3px 10px" }}>
              {change.original_text}
            </span>
            <span style={{ color: theme.textFaint }}>→</span>
            <span style={{ fontSize: 12, color: theme.accent, fontFamily: "'DM Mono', monospace", background: theme.accent + "10", border: `1px solid ${theme.accent}30`, borderRadius: 6, padding: "3px 10px" }}>
              {change.new_text}
            </span>
          </div>
        )}

        {(change.type === "keyword_added" || change.type === "skill_added") && change.new_text && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              background: theme.accent + "18", color: theme.accent, border: `1px solid ${theme.accent}40`,
              borderRadius: 20, padding: "3px 12px", fontSize: 12,
              fontFamily: "'DM Mono', monospace", fontWeight: 500,
            }}>{change.new_text}</span>
            {change.location && (
              <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontStyle: "italic" }}>
                in {change.location}
              </span>
            )}
          </div>
        )}

        {change.type === "section_reframed" && change.location && (
          <p style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", fontStyle: "italic" }}>
            Section: {change.location}
          </p>
        )}

        {showRisk && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6, marginTop: 6,
            background: risk.bg, border: `1px solid ${risk.border}`,
            borderRadius: 6, padding: "4px 10px",
          }}>
            <span style={{ fontSize: 11, color: risk.color, fontFamily: "'DM Mono', monospace" }}>
              {risk.label}
            </span>
            {change.risk_reason && (
              <span style={{ fontSize: 11, color: risk.color, fontFamily: "'DM Mono', monospace", fontStyle: "italic", opacity: 0.85 }}>
                — {change.risk_reason}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Accept / Reject */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => !accepted && onToggle(change.id)}
          style={{
            flex: 1,
            background: accepted ? (theme.accent + "18") : "transparent",
            color: accepted ? theme.accent : theme.textFaint,
            border: `1px solid ${accepted ? (theme.accent + "40") : theme.border}`,
            borderRadius: 6,
            padding: "6px 0",
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 600,
            cursor: accepted ? "default" : "pointer",
            transition: "all 0.15s",
          }}
        >✓ Accept</button>
        <button
          onClick={() => accepted && onToggle(change.id)}
          style={{
            flex: 1,
            background: !accepted ? "#FF6B6B18" : "transparent",
            color: !accepted ? "#FF6B6B" : theme.textFaint,
            border: `1px solid ${!accepted ? "#FF6B6B40" : theme.border}`,
            borderRadius: 6,
            padding: "6px 0",
            fontSize: 12,
            fontFamily: "'DM Mono', monospace",
            fontWeight: 600,
            cursor: !accepted ? "default" : "pointer",
            transition: "all 0.15s",
          }}
        >✗ Reject</button>
      </div>
    </div>
  );
}

export default function ReviewMode({
  reviewableChanges,
  acceptedChanges,
  setAcceptedChanges,
  originalAtsScore,
  atsScore,
  onApplyChoices,
  loading,
}) {
  const { theme } = useTheme();

  if (!reviewableChanges || reviewableChanges.length === 0) {
    return (
      <div style={{ color: theme.textFaint, fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center", padding: "32px 0" }}>
        No reviewable changes available.
      </div>
    );
  }

  const rejectedImpact = reviewableChanges.reduce((sum, c) => {
    return acceptedChanges.has(c.id) ? sum : sum + (c.ats_impact || 0);
  }, 0);
  const liveScore    = Math.max(0, Math.min(100, (atsScore || 0) - rejectedImpact));
  const acceptedCount = reviewableChanges.filter(c => acceptedChanges.has(c.id)).length;

  function toggleChange(id) {
    setAcceptedChanges(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      {/* Score header */}
      <div style={{
        background: theme.background,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        marginBottom: 16,
      }}>
        <div>
          <p style={{ fontSize: 10, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>
            ESTIMATED ATS SCORE
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>
              {originalAtsScore ?? "—"}%
            </span>
            <span style={{ color: theme.textFaint }}>→</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: theme.accent, fontFamily: "'DM Mono', monospace" }}>
              {liveScore}%
            </span>
            {liveScore !== atsScore && (
              <span style={{ fontSize: 11, color: "#F59E0B", fontFamily: "'DM Mono', monospace", background: "#F59E0B18", border: "1px solid #F59E0B40", borderRadius: 6, padding: "1px 8px" }}>
                live preview
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setAcceptedChanges(new Set(reviewableChanges.map(c => c.id)))}
            style={{ background: theme.accent + "18", color: theme.accent, border: `1px solid ${theme.accent}40`, borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace", fontWeight: 600 }}
          >Accept All</button>
          <button
            onClick={() => setAcceptedChanges(new Set())}
            style={{ background: "transparent", color: theme.textMuted, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "5px 12px", fontSize: 11, cursor: "pointer", fontFamily: "'DM Mono', monospace" }}
          >Reject All</button>
        </div>
      </div>

      {/* Change cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {reviewableChanges.map(change => (
          <ChangeCard
            key={change.id}
            change={change}
            accepted={acceptedChanges.has(change.id)}
            onToggle={toggleChange}
          />
        ))}
      </div>

      {/* Sticky action bar */}
      <div style={{
        position: "sticky",
        bottom: 0,
        background: theme.cardAlt,
        border: `1px solid ${theme.border}`,
        borderRadius: 10,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        zIndex: 10,
      }}>
        <div>
          <p style={{ fontSize: 12, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginBottom: 2 }}>
            <span style={{ color: theme.accent, fontWeight: 700 }}>{acceptedCount}</span> of {reviewableChanges.length} changes accepted
          </p>
          <p style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: theme.text }}>
            Estimated ATS: <span style={{ color: theme.accent, fontWeight: 700 }}>{liveScore}%</span>
          </p>
        </div>
        <button
          onClick={() => onApplyChoices(acceptedChanges)}
          disabled={loading || acceptedCount === 0}
          style={{
            background: acceptedCount > 0 && !loading ? theme.accent : theme.border,
            color: acceptedCount > 0 && !loading ? theme.background : theme.textFaint,
            border: "none",
            borderRadius: 10,
            padding: "11px 24px",
            fontSize: 14,
            fontWeight: 700,
            cursor: acceptedCount > 0 && !loading ? "pointer" : "not-allowed",
            fontFamily: "'Syne', sans-serif",
            transition: "all 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? "Regenerating…" : "Apply My Choices →"}
        </button>
      </div>
    </div>
  );
}
