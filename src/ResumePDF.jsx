import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const ACCENT = "#0A7B5E";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#1A1A1A",
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 52,
    lineHeight: 1.5,
  },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0D0D0D",
    marginBottom: 4,
  },
  contactLine: {
    fontSize: 9,
    color: "#444444",
    marginBottom: 2,
  },
  divider: {
    borderBottomWidth: 1.5,
    borderBottomColor: ACCENT,
    marginTop: 12,
    marginBottom: 12,
  },
  thinDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: "#CCCCCC",
    marginTop: 10,
    marginBottom: 10,
  },
  sectionHeader: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: ACCENT,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  bodyText: {
    fontSize: 10,
    color: "#1A1A1A",
    marginBottom: 3,
    lineHeight: 1.6,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
  },
  bullet: {
    fontSize: 10,
    color: "#1A1A1A",
    marginRight: 6,
    lineHeight: 1.6,
  },
  bulletText: {
    fontSize: 10,
    color: "#1A1A1A",
    flex: 1,
    lineHeight: 1.6,
  },
  entryHeader: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0D0D0D",
    marginBottom: 1,
  },
  entrySubtitle: {
    fontSize: 9,
    color: "#555555",
    marginBottom: 4,
  },
  section: {
    marginBottom: 14,
  },
});

function parseResume(text) {
  const lines = text.split("\n").map((l) => l.trimEnd());

  const sectionKeywords = [
    "experience",
    "work experience",
    "employment",
    "skills",
    "technical skills",
    "education",
    "summary",
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

  // First non-empty line is name; next few lines (before first section) are contact
  let nameIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim()) { nameIndex = i; break; }
  }

  const name = nameIndex >= 0 ? lines[nameIndex].trim() : "";
  const contactLines = [];
  const sections = []; // { title, lines[] }
  let i = nameIndex + 1;

  // Collect contact lines until first section header
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

  const nodes = [];
  let j = 0;
  while (j < bodyLines.length) {
    const raw = bodyLines[j];
    const trimmed = raw.trim();

    if (!trimmed) {
      j++;
      continue;
    }

    // Bullet point: starts with -, •, *, or number.
    if (/^[-•*]/.test(trimmed) || /^\d+[.)]\s/.test(trimmed)) {
      const text = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "");
      nodes.push(
        <View key={j} style={styles.bulletRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.bulletText}>{text}</Text>
        </View>
      );
    } else if (!raw.startsWith(" ") && !raw.startsWith("\t") && trimmed.length > 0) {
      // Check if next non-empty line is indented or a bullet — treat current as entry header
      let k = j + 1;
      while (k < bodyLines.length && !bodyLines[k].trim()) k++;
      const nextIsBulletOrIndented =
        k < bodyLines.length &&
        (/^[-•*]/.test(bodyLines[k].trim()) ||
          bodyLines[k].startsWith(" ") ||
          bodyLines[k].startsWith("\t") ||
          /^\d+[.)]\s/.test(bodyLines[k].trim()));

      if (nextIsBulletOrIndented || /[–\-|]/.test(trimmed)) {
        // Split on – or | to separate company/title from date
        const parts = trimmed.split(/\s*[–\-|]\s*/);
        nodes.push(
          <Text key={j} style={styles.entryHeader}>{parts[0].trim()}</Text>
        );
        if (parts.length > 1) {
          nodes.push(
            <Text key={`${j}-sub`} style={styles.entrySubtitle}>
              {parts.slice(1).join(" – ")}
            </Text>
          );
        }
      } else {
        nodes.push(
          <Text key={j} style={styles.bodyText}>{trimmed}</Text>
        );
      }
    } else {
      nodes.push(
        <Text key={j} style={styles.bodyText}>{trimmed}</Text>
      );
    }
    j++;
  }
  return nodes;
}

export function ResumePDF({ resumeText }) {
  const { name, contactLines, sections } = parseResume(resumeText);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Name */}
        {name ? <Text style={styles.name}>{name}</Text> : null}

        {/* Contact info */}
        {contactLines.map((line, i) => (
          <Text key={i} style={styles.contactLine}>{line}</Text>
        ))}

        <View style={styles.divider} />

        {/* Sections */}
        {sections.map((sec, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionHeader}>{sec.title}</Text>
            <View style={styles.thinDivider} />
            {renderSectionBody(sec.lines)}
          </View>
        ))}
      </Page>
    </Document>
  );
}
