import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const ACCENT = "#0A7B5E";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1A1A1A",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    lineHeight: 1.5,
  },
  name: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0D0D0D",
    marginBottom: 3,
  },
  contactLine: {
    fontSize: 9,
    color: "#444444",
    marginBottom: 2,
    lineHeight: 1.4,
  },
  headerDivider: {
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    marginTop: 10,
    marginBottom: 14,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    marginBottom: 5,
  },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  sectionUnderline: {
    borderBottomWidth: 0.75,
    borderBottomColor: "#CCCCCC",
    marginBottom: 7,
  },
  bodyText: {
    fontSize: 10,
    color: "#1A1A1A",
    marginBottom: 3,
    lineHeight: 1.5,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bulletChar: {
    fontSize: 10,
    color: "#1A1A1A",
    marginRight: 6,
    lineHeight: 1.5,
    width: 8,
  },
  bulletText: {
    fontSize: 10,
    color: "#1A1A1A",
    flex: 1,
    lineHeight: 1.5,
  },
  entryHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0D0D0D",
    marginBottom: 1,
    lineHeight: 1.5,
  },
  entrySubtitle: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 4,
    lineHeight: 1.5,
  },
});

function parseResume(text) {
  const lines = text.split("\n").map((l) => l.trimEnd());

  const sectionKeywords = [
    "experience",
    "work experience",
    "employment history",
    "employment",
    "skills",
    "technical skills",
    "core competencies",
    "education",
    "summary",
    "professional summary",
    "objective",
    "projects",
    "certifications",
    "achievements",
    "awards",
    "publications",
    "languages",
    "interests",
    "volunteer",
  ];

  function isSectionHeader(line) {
    const t = line.trim().toLowerCase().replace(/[:\-–]/g, "").trim();
    return sectionKeywords.some((k) => t === k || t.startsWith(k));
  }

  // First non-empty line is the name
  let nameIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { nameIndex = i; break; }
  }

  const name = nameIndex >= 0 ? lines[nameIndex].trim() : "";
  const contactLines = [];
  const sections = [];
  let i = nameIndex + 1;

  // Collect contact lines until the first section header
  while (i < lines.length) {
    const l = lines[i].trim();
    if (isSectionHeader(lines[i])) break;
    if (l) contactLines.push(l);
    i++;
  }

  // Collect sections
  while (i < lines.length) {
    if (isSectionHeader(lines[i])) {
      sections.push({ title: lines[i].trim().replace(/:$/, ""), lines: [] });
    } else {
      if (sections.length > 0) {
        sections[sections.length - 1].lines.push(lines[i]);
      }
    }
    i++;
  }

  return { name, contactLines, sections };
}

function renderSectionBody(bodyLines) {
  // Trim trailing blank lines
  while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) {
    bodyLines = bodyLines.slice(0, -1);
  }

  const isBullet = (s) => /^[-*]/.test(s) || /^\d+[.)]\s/.test(s);
  const isUnindented = (raw) => !raw.startsWith(" ") && !raw.startsWith("\t");

  // Returns index of next non-empty line, or -1
  const nextNonEmpty = (lines, from) => {
    for (let k = from; k < lines.length; k++) {
      if (lines[k].trim()) return k;
    }
    return -1;
  };

  const nodes = [];
  let j = 0;

  while (j < bodyLines.length) {
    const raw = bodyLines[j];
    const trimmed = raw.trim();

    if (!trimmed) { j++; continue; }

    if (isBullet(trimmed)) {
      // Bullet point — use plain hyphen to avoid encoding issues with •
      const text = trimmed.replace(/^[-*]\s*/, "").replace(/^\d+[.)]\s*/, "");
      nodes.push(
        <View key={j} style={styles.bulletRow}>
          <Text style={styles.bulletChar}>-</Text>
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      );
      j++;
      continue;
    }

    if (isUnindented(raw)) {
      // Check what follows to decide how to render this line
      const nextIdx = nextNonEmpty(bodyLines, j + 1);
      const nextRaw = nextIdx >= 0 ? bodyLines[nextIdx] : "";
      const nextTrimmed = nextRaw.trim();
      const nextIsBullet = nextTrimmed && isBullet(nextTrimmed);
      const nextIsUnindented = nextRaw && isUnindented(nextRaw);

      // If line contains a separator, split into header + subtitle on one entry
      if (/[–|]/.test(trimmed) || (trimmed.includes(" - ") && trimmed.split(" - ").length === 2)) {
        const parts = trimmed.split(/\s*[–|]\s*|\s+-\s+/);
        nodes.push(<Text key={j} style={styles.entryHeader}>{parts[0].trim()}</Text>);
        if (parts.length > 1) {
          nodes.push(
            <Text key={`${j}-sub`} style={styles.entrySubtitle}>{parts.slice(1).join(" - ")}</Text>
          );
        }
        j++;
        continue;
      }

      // No separator: if followed by bullets → standalone entry header
      // If followed by another short unindented line (e.g. institution + date on next line) → header + subtitle
      if (nextIsBullet || !nextTrimmed) {
        nodes.push(<Text key={j} style={styles.entryHeader}>{trimmed}</Text>);
        j++;
        continue;
      }

      if (nextIsUnindented && !isBullet(nextTrimmed) && nextTrimmed.length < 80) {
        // Treat current line as entry header, next as subtitle (handles split education dates)
        nodes.push(<Text key={j} style={styles.entryHeader}>{trimmed}</Text>);
        nodes.push(<Text key={`${j}-sub`} style={styles.entrySubtitle}>{nextTrimmed}</Text>);
        j = nextIdx + 1;
        continue;
      }

      // Default: plain body text
      nodes.push(<Text key={j} style={styles.bodyText}>{trimmed}</Text>);
      j++;
      continue;
    }

    // Indented line → body text
    nodes.push(<Text key={j} style={styles.bodyText}>{trimmed}</Text>);
    j++;
  }

  return nodes;
}

export function ResumePDF({ resumeText }) {
  const { name, contactLines, sections } = parseResume(resumeText);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {name ? <Text style={styles.name}>{name}</Text> : null}

        {contactLines.map((line, i) => (
          <Text key={i} style={styles.contactLine}>{line}</Text>
        ))}

        <View style={styles.headerDivider} />

        {sections.map((sec, si) => (
          <View key={si} style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeader}>{sec.title}</Text>
              <View style={styles.sectionUnderline} />
            </View>
            {renderSectionBody(sec.lines)}
          </View>
        ))}
      </Page>
    </Document>
  );
}
