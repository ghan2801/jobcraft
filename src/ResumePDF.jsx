import { Document, Page, Text, View, StyleSheet, Link, Font } from "@react-pdf/renderer";

// Register a TTF font with full Unicode support so "•" renders correctly.
// Helvetica (built-in PDF font) uses WinAnsi encoding where U+2022 maps to the
// wrong glyph ("Ë"). An embedded TTF font fixes this permanently.
Font.register({
  family: "DejaVu",
  fonts: [
    { src: "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans.ttf" },
    { src: "https://cdn.jsdelivr.net/npm/dejavu-fonts-ttf@2.37.3/ttf/DejaVuSans-Bold.ttf", fontWeight: "bold" },
  ],
});

const F = "DejaVu";

const styles = StyleSheet.create({
  page: {
    fontFamily: F,
    fontSize: 10,
    color: "#1A1A1A",
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 50,
    paddingRight: 50,
    lineHeight: 1.4,
  },

  // ── Header ──────────────────────────────────────────────
  name: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 18,
    color: "#0D0D0D",
    marginBottom: 3,
  },
  jobTitle: {
    fontFamily: F,
    fontSize: 12,
    color: "#333333",
    marginBottom: 5,
  },
  contactText: {
    fontFamily: F,
    fontSize: 9,
    color: "#444444",
    lineHeight: 1.4,
  },
  contactLink: {
    color: "#1155CC",
    textDecoration: "underline",
  },
  headerGap: {
    marginBottom: 16,
  },

  // ── Section headers ──────────────────────────────────────
  sectionWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 10,
    color: "#0D0D0D",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sectionRule: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#0D0D0D",
    marginBottom: 8,
  },

  // ── Experience entries ───────────────────────────────────
  companyName: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 11,
    color: "#0D0D0D",
    marginTop: 8,
    marginBottom: 1,
  },
  titleDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  entryTitle: {
    fontFamily: F,
    fontWeight: "bold",
    fontSize: 10,
    color: "#1A1A1A",
    flex: 1,
  },
  entryDate: {
    fontFamily: F,
    fontSize: 10,
    color: "#555555",
    textAlign: "right",
  },

  // ── Bullets ──────────────────────────────────────────────
  bulletRow: {
    flexDirection: "row",
    marginBottom: 6,
    paddingLeft: 8,
  },
  bulletChar: {
    fontFamily: F,
    fontSize: 10,
    color: "#1A1A1A",
    width: 12,
    lineHeight: 1.4,
  },
  bulletText: {
    fontFamily: F,
    fontSize: 10,
    color: "#1A1A1A",
    flex: 1,
    lineHeight: 1.4,
  },

  // ── Generic body text ────────────────────────────────────
  bodyText: {
    fontFamily: F,
    fontSize: 10,
    color: "#1A1A1A",
    marginBottom: 3,
    lineHeight: 1.4,
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────────

function isBulletLine(s) {
  return /^[-•*]/.test(s.trim()) || /^\d+[.)]\s/.test(s.trim());
}

function hasDate(s) {
  return /\b(19|20)\d{2}\b/.test(s) || /\bpresent\b/i.test(s) || /\bcurrent\b/i.test(s);
}

function hasContactMarker(s) {
  return /@/.test(s) || /\+?\d[\d\s\-().]{6,}/.test(s) ||
    /linkedin\.com/i.test(s) || /github\.com/i.test(s) || /^https?:\/\//i.test(s);
}

/**
 * Extract a date range from the end of a string.
 * Returns { date, rest } where rest is the string with the date removed.
 */
function extractDate(s) {
  // Parenthesised date: "something (2019 – Present)"
  const paren = s.match(/\s*\(([^)]*(?:19|20)\d{2}[^)]*)\)\s*$/);
  if (paren) {
    return {
      date: paren[1].trim(),
      rest: s.slice(0, s.lastIndexOf("(")).replace(/[-–,\s]+$/, "").trim(),
    };
  }
  // Trailing date: "..., 2019 – 2023" or "... 2019"
  const trail = s.match(/[,\s–-]+((?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}(?:\s*[-–]\s*(?:(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+)?(?:19|20)\d{2}|[Pp]resent|[Cc]urrent))?)\s*$/);
  if (trail) {
    return {
      date: trail[1].trim(),
      rest: s.slice(0, s.length - trail[0].length).trim(),
    };
  }
  return { date: "", rest: s.trim() };
}

/**
 * Parse a single-line entry header into { title, company, date }.
 * Handles: "Title – Company (Date)", "Company – Title, Date", "Title (Date)"
 */
function parseEntryHeader(line) {
  const { date, rest } = extractDate(line);
  // Split on em-dash, en-dash, or " | " to find title vs company
  const parts = rest.split(/\s*[–—|]\s*/);
  if (parts.length >= 2) {
    return { title: parts[0].trim(), company: parts.slice(1).join(" – ").trim(), date };
  }
  return { title: rest.trim(), company: "", date };
}

// ─── Resume parser ─────────────────────────────────────────────────────────────

function parseResume(text) {
  const lines = text.split("\n").map((l) => l.trimEnd());

  const SECTION_KW = [
    "experience", "work experience", "professional experience",
    "employment history", "employment",
    "skills", "technical skills", "core competencies",
    "education", "academic background",
    "summary", "professional summary", "profile",
    "objective", "career objective",
    "projects", "key projects",
    "certifications", "achievements", "awards",
    "publications", "languages", "interests", "volunteer",
  ];

  function isSectionHeader(line) {
    const t = line.trim().toLowerCase().replace(/[:\-–—]/g, "").trim();
    return SECTION_KW.some((k) => t === k || t === k + "s");
  }

  // Skip leading blank lines
  let i = 0;
  while (i < lines.length && !lines[i].trim()) i++;
  if (i >= lines.length) return { name: "", jobTitle: "", contactItems: [], sections: [] };

  // Line 1: name (part before first "|"), remaining |-parts are contact items
  const firstLineParts = lines[i].trim().split("|").map((p) => p.trim());
  const name = firstLineParts[0];
  const contactItems = firstLineParts.slice(1).filter(Boolean);
  i++;

  let jobTitle = "";

  // Remaining pre-section lines → job title and/or contact items
  while (i < lines.length && !isSectionHeader(lines[i])) {
    const trimmed = lines[i].trim();
    if (trimmed) {
      if (hasContactMarker(trimmed) || (trimmed.includes("|") && trimmed.split("|").some((p) => hasContactMarker(p.trim())))) {
        // It's a contact line — split by | and collect
        trimmed.split("|").forEach((p) => { const t = p.trim(); if (t) contactItems.push(t); });
      } else if (!jobTitle) {
        // First non-contact line = job title
        jobTitle = trimmed;
      } else {
        // Extra pre-section text — treat as contact
        contactItems.push(trimmed);
      }
    }
    i++;
  }

  // Collect sections
  const sections = [];
  while (i < lines.length) {
    if (isSectionHeader(lines[i])) {
      sections.push({ title: lines[i].trim().replace(/:$/, ""), lines: [] });
    } else if (sections.length > 0) {
      sections[sections.length - 1].lines.push(lines[i]);
    }
    i++;
  }

  return { name, jobTitle, contactItems, sections };
}

// ─── Contact row renderer ──────────────────────────────────────────────────────

function ContactRow({ items }) {
  return (
    <Text style={styles.contactText}>
      {items.map((item, idx) => {
        const isLinkedIn = /linkedin\.com/i.test(item) || /^LinkedIn:/i.test(item);
        const clean = item.replace(/^LinkedIn:\s*/i, "").trim();
        const href = isLinkedIn
          ? (clean.startsWith("http") ? clean : `https://${clean.replace(/^\/+/, "")}`)
          : "";
        return (
          <Text key={idx}>
            {idx > 0 ? <Text style={{ color: "#888888" }}> | </Text> : null}
            {isLinkedIn
              ? <Link src={href} style={styles.contactLink}>{clean}</Link>
              : <Text>{clean}</Text>}
          </Text>
        );
      })}
    </Text>
  );
}

// ─── Section body renderers ────────────────────────────────────────────────────

function renderBullet(text, key) {
  return (
    <View key={key} style={styles.bulletRow}>
      <Text style={styles.bulletChar}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

/**
 * Experience section: detects "Title – Company (Date)" or two-line
 * "Company\nTitle | Date" patterns and renders company bold + title/date row.
 */
function renderExperience(bodyLines) {
  const nodes = [];
  let j = 0;
  let entryIndex = 0;

  while (j < bodyLines.length) {
    const raw = bodyLines[j];
    const trimmed = raw.trim();

    if (!trimmed) { j++; continue; }

    if (isBulletLine(trimmed)) {
      const text = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "");
      nodes.push(renderBullet(text, `b-${j}`));
      j++;
      continue;
    }

    // Non-bullet unindented line
    const { title, company, date } = parseEntryHeader(trimmed);

    if (company) {
      // "Title – Company (Date)" — one combined line
      if (entryIndex > 0) nodes.push(<View key={`gap-${j}`} style={{ marginTop: 2 }} />);
      nodes.push(<Text key={`co-${j}`} style={styles.companyName}>{company}</Text>);
      nodes.push(
        <View key={`td-${j}`} style={styles.titleDateRow}>
          <Text style={styles.entryTitle}>{title}</Text>
          {date ? <Text style={styles.entryDate}>{date}</Text> : null}
        </View>
      );
      entryIndex++;
      j++;
      continue;
    }

    if (!company && date) {
      // "Title, Date" or "Title (Date)" — no separate company
      nodes.push(
        <View key={`td-${j}`} style={styles.titleDateRow}>
          <Text style={styles.entryTitle}>{title}</Text>
          <Text style={styles.entryDate}>{date}</Text>
        </View>
      );
      j++;
      continue;
    }

    // No date, no separator — could be a standalone company name.
    // Peek at next non-empty line: if it has a date, treat this as company + that as title/date.
    let k = j + 1;
    while (k < bodyLines.length && !bodyLines[k].trim()) k++;
    const nextTrimmed = k < bodyLines.length ? bodyLines[k].trim() : "";

    if (nextTrimmed && !isBulletLine(nextTrimmed) && hasDate(nextTrimmed)) {
      // Two-line format: company on this line, title+date on next
      if (entryIndex > 0) nodes.push(<View key={`gap-${j}`} style={{ marginTop: 2 }} />);
      nodes.push(<Text key={`co-${j}`} style={styles.companyName}>{title}</Text>);
      const next = parseEntryHeader(nextTrimmed);
      nodes.push(
        <View key={`td-${j}-n`} style={styles.titleDateRow}>
          <Text style={styles.entryTitle}>{next.title || next.company}</Text>
          {next.date ? <Text style={styles.entryDate}>{next.date}</Text> : null}
        </View>
      );
      entryIndex++;
      j = k + 1;
      continue;
    }

    // Fallback: render as bold company/header line
    if (entryIndex > 0) nodes.push(<View key={`gap-${j}`} style={{ marginTop: 2 }} />);
    nodes.push(<Text key={`hd-${j}`} style={styles.companyName}>{title}</Text>);
    entryIndex++;
    j++;
  }

  return nodes;
}

/**
 * Education section: collect consecutive non-bullet lines and join them
 * onto a single line (Degree, University, Year), so dates never break awkwardly.
 */
function renderEducation(bodyLines) {
  const nodes = [];
  let j = 0;
  let pending = [];

  const flushPending = (key) => {
    if (pending.length) {
      nodes.push(<Text key={key} style={styles.bodyText}>{pending.join("  |  ")}</Text>);
      pending = [];
    }
  };

  while (j < bodyLines.length) {
    const raw = bodyLines[j];
    const trimmed = raw.trim();

    if (!trimmed) {
      flushPending(`edu-flush-${j}`);
      j++;
      continue;
    }

    if (isBulletLine(trimmed)) {
      flushPending(`edu-flush-b-${j}`);
      const text = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "");
      nodes.push(renderBullet(text, `edu-b-${j}`));
    } else {
      pending.push(trimmed);
    }
    j++;
  }
  flushPending("edu-end");

  return nodes;
}

/**
 * Generic renderer used for Skills, Summary, Certifications, etc.
 */
function renderGeneric(bodyLines) {
  const nodes = [];
  bodyLines.forEach((raw, j) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (isBulletLine(trimmed)) {
      const text = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "");
      nodes.push(renderBullet(text, `g-${j}`));
    } else {
      nodes.push(<Text key={j} style={styles.bodyText}>{trimmed}</Text>);
    }
  });
  return nodes;
}

function renderSection(sec) {
  const t = sec.title.toLowerCase();
  if (/experience|employment|work/.test(t)) return renderExperience(sec.lines);
  if (/education|academic/.test(t)) return renderEducation(sec.lines);
  return renderGeneric(sec.lines);
}

// ─── Main component ────────────────────────────────────────────────────────────

export function ResumePDF({ resumeText }) {
  const { name, jobTitle, contactItems, sections } = parseResume(resumeText);

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* ── Header ── */}
        {name ? <Text style={styles.name}>{name}</Text> : null}
        {jobTitle ? <Text style={styles.jobTitle}>{jobTitle}</Text> : null}
        {contactItems.length > 0 ? <ContactRow items={contactItems} /> : null}
        <View style={styles.headerGap} />

        {/* ── Sections ── */}
        {sections.map((sec, i) => (
          <View key={i}>
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionTitle}>{sec.title}</Text>
              <View style={styles.sectionRule} />
            </View>
            {renderSection(sec)}
          </View>
        ))}

      </Page>
    </Document>
  );
}
