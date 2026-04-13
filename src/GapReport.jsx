import { useTheme } from "./ThemeContext";

function Pill({ children, color, bg, border: borderColor }) {
  const { theme } = useTheme();
  const c = color || theme.accent;
  return (
    <span style={{
      background: bg || (c + "18"),
      color: c,
      border: `1px solid ${borderColor || (c + "40")}`,
      borderRadius: 20,
      padding: "3px 10px",
      fontSize: 12,
      fontFamily: "'DM Mono', monospace",
      fontWeight: 500,
      display: "inline-block",
    }}>{children}</span>
  );
}

function ImportanceBadge({ importance }) {
  const map = {
    critical: { color: "#FF6B6B", bg: "#FF6B6B18", border: "#FF6B6B40", label: "Critical" },
    moderate: { color: "#F59E0B", bg: "#F59E0B18", border: "#F59E0B40", label: "Moderate" },
    minor:    { color: "#6B7FA3", bg: "#6B7FA318", border: "#6B7FA340", label: "Minor" },
  };
  const s = map[(importance || "minor").toLowerCase()] || map.minor;
  return (
    <span style={{
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      borderRadius: 4, padding: "1px 7px", fontSize: 10,
      fontFamily: "'DM Mono', monospace", fontWeight: 600,
      letterSpacing: "0.05em", textTransform: "uppercase",
    }}>{s.label}</span>
  );
}

function FrequencyDots({ count }) {
  const { theme } = useTheme();
  const max  = Math.min(count, 8);
  const dots = Array.from({ length: max });
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
      {dots.map((_, i) => (
        <span key={i} style={{
          display: "inline-block", width: 8, height: 8,
          background: theme.accent, borderRadius: 2, opacity: 0.85,
        }} />
      ))}
      <span style={{ fontSize: 11, color: theme.textMuted, fontFamily: "'DM Mono', monospace", marginLeft: 4 }}>
        {count}×
      </span>
    </span>
  );
}

function SectionCard({ icon, title, borderColor, children }) {
  const { theme } = useTheme();
  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderLeft: `3px solid ${borderColor}`,
      borderRadius: 12,
      padding: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: theme.textStrong, fontFamily: "'Syne', sans-serif" }}>
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}

const FIT_CONFIG = {
  high:     { label: "Strong Fit ✅",   color: "#00C47A", bg: "#00C47A18", border: "#00C47A40" },
  moderate: { label: "Moderate Fit ⚡", color: "#F59E0B", bg: "#F59E0B18", border: "#F59E0B40" },
  low:      { label: "Weak Fit ⚠️",     color: "#FF6B6B", bg: "#FF6B6B18", border: "#FF6B6B40" },
};

const ACTION_CONFIG = {
  apply_confidently:       { text: "✅ Apply with confidence",                           color: "#00C47A" },
  apply_with_preparation:  { text: "📚 Apply but prepare these gaps first",              color: "#F59E0B" },
  consider_skipping:       { text: "⚠️ Consider roles that better match your profile",   color: "#FF6B6B" },
};

export default function GapReport({ gapReport, originalAtsScore, atsScore }) {
  const { theme } = useTheme();

  if (!gapReport) {
    return (
      <div style={{ color: theme.textFaint, fontSize: 13, fontFamily: "'DM Mono', monospace", textAlign: "center", padding: "32px 0" }}>
        No gap report available.
      </div>
    );
  }

  const {
    original_score_reason,
    strong_matches          = [],
    keywords_added          = [],
    skills_still_missing    = [],
    job_fit_score,
    job_fit_reason,
    recommended_action,
  } = gapReport;

  const fitKey  = (job_fit_score || "").toLowerCase();
  const fit     = FIT_CONFIG[fitKey] || FIT_CONFIG.moderate;
  const actionKey = recommended_action || "";
  const action    = ACTION_CONFIG[actionKey] || { text: actionKey, color: theme.textMuted };

  const pts = (originalAtsScore != null && atsScore != null)
    ? atsScore - originalAtsScore
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* Job Fit Assessment (top card) */}
      <div style={{
        background: theme.card,
        border: `1px solid ${theme.border}`,
        borderLeft: `3px solid ${fit.color}`,
        borderRadius: 12,
        padding: 20,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 16,
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 15 }}>🎯</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: theme.textStrong, fontFamily: "'Syne', sans-serif" }}>
              Job Fit Assessment
            </span>
          </div>
          <div style={{ marginBottom: 8 }}>
            <span style={{
              background: fit.bg, color: fit.color,
              border: `1px solid ${fit.border}`,
              borderRadius: 20, padding: "4px 14px",
              fontSize: 13, fontFamily: "'DM Mono', monospace", fontWeight: 700,
              display: "inline-block",
            }}>{fit.label}</span>
          </div>
          {job_fit_reason && (
            <p style={{ color: theme.textMuted, fontSize: 12, lineHeight: 1.6, fontFamily: "'DM Mono', monospace", maxWidth: 480, marginBottom: 10 }}>
              {job_fit_reason}
            </p>
          )}
          {action.text && (
            <p style={{ color: action.color, fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
              {action.text}
            </p>
          )}
        </div>
        {pts !== null && (
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: theme.textMuted, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", marginBottom: 6 }}>ATS SCORE</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: "#FF6B6B", fontFamily: "'DM Mono', monospace" }}>{originalAtsScore}%</span>
              <span style={{ color: theme.textFaint }}>→</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: theme.accent, fontFamily: "'DM Mono', monospace" }}>{atsScore}%</span>
              <span style={{ fontSize: 12, color: "#FFD166", fontFamily: "'DM Mono', monospace", background: "#FFD16618", border: "1px solid #FFD16640", borderRadius: 6, padding: "2px 8px" }}>
                +{pts} pts
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Why score was low */}
      {original_score_reason && (
        <SectionCard icon="📊" title="Why Your Original Score Was Low" borderColor="#F59E0B">
          <p style={{ color: theme.text, fontSize: 13, lineHeight: 1.7, fontFamily: "'DM Mono', monospace" }}>
            {original_score_reason}
          </p>
        </SectionCard>
      )}

      {/* Strong matches */}
      {strong_matches.length > 0 && (
        <SectionCard icon="✅" title="Skills You Already Had" borderColor="#00C47A">
          <p style={{ color: theme.textMuted, fontSize: 11, fontFamily: "'DM Mono', monospace", marginBottom: 10, fontStyle: "italic" }}>
            These carried your base score
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {strong_matches.map((s, i) => (
              <Pill key={i}>{s}</Pill>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Keywords added */}
      {keywords_added.length > 0 && (
        <SectionCard icon="✨" title={`Keywords Added to Resume (${keywords_added.length})`} borderColor={theme.accent}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {keywords_added.map((kw, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", justifyContent: "space-between",
                flexWrap: "wrap", gap: 8,
                borderBottom: i < keywords_added.length - 1 ? `1px solid ${theme.border}` : "none",
                paddingBottom: i < keywords_added.length - 1 ? 12 : 0,
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Pill>{kw.keyword}</Pill>
                    {kw.frequency_in_jd != null && <FrequencyDots count={kw.frequency_in_jd} />}
                  </div>
                  {kw.added_where && (
                    <p style={{ color: theme.textMuted, fontSize: 11, fontFamily: "'DM Mono', monospace", fontStyle: "italic" }}>
                      Added to: {kw.added_where}
                    </p>
                  )}
                </div>
                <span style={{
                  background: theme.accent + "18", color: theme.accent,
                  border: `1px solid ${theme.accent}40`, borderRadius: 6,
                  padding: "2px 10px", fontSize: 11,
                  fontFamily: "'DM Mono', monospace", fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>Added ✅</span>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Skills still missing */}
      {skills_still_missing.length > 0 && (
        <SectionCard icon="⚠️" title={`Skills Still Missing (${skills_still_missing.length})`} borderColor="#F59E0B">
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {skills_still_missing.map((item, i) => (
              <div key={i} style={{
                borderBottom: i < skills_still_missing.length - 1 ? `1px solid ${theme.border}` : "none",
                paddingBottom: i < skills_still_missing.length - 1 ? 14 : 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: theme.text, fontFamily: "'DM Mono', monospace" }}>
                    {item.skill}
                  </span>
                  <ImportanceBadge importance={item.importance} />
                  {item.frequency_in_jd != null && <FrequencyDots count={item.frequency_in_jd} />}
                </div>
                {item.reason && (
                  <p style={{ color: theme.textMuted, fontSize: 11, fontStyle: "italic", lineHeight: 1.5, fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>
                    {item.reason}
                  </p>
                )}
                {(item.importance || "").toLowerCase() === "critical" && (
                  <p style={{ color: "#F59E0B", fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 600 }}>
                    ↳ Prepare this before your interview
                  </p>
                )}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

    </div>
  );
}
