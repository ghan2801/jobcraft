// src/ResumeHTML.jsx
// Converts a plain-text resume into a complete HTML string for browser preview + print-to-PDF.
//
// Pipeline:
//   STEP 1  splitSections()   – split raw text into named buckets by section header
//   STEP 2  parseHeader()     – extract name, title, city/phone/email/linkedin
//   STEP 3  parseExperience() – state machine: company → role+date → bullets
//   STEP 4  parseEducation()  – blank-line groups; flush on year/Present
//   STEP 5  render*()         – each bucket → HTML string
//   STEP 6  generateResumeHTML() – assemble final HTML document

// ─── HTML escape ──────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Bullet helpers ───────────────────────────────────────────────────────────
// Recognises: ○ ◦ • ‣ ⁃  and ASCII  -  *

function isBulletLine(str) {
  // U+25CB ○  U+25E6 ◦  U+2022 •  U+2023 ‣  U+2043 ⁃
  // U+2013 –  U+2014 —  (en/em-dash used as bullet by many AI models)
  return /^[\u2022\u25CB\u25E6\u2023\u2043\u2013\u2014\-*]/.test(str.trim()) ||
    /^\d+[.)]\s/.test(str.trim());
}

function stripBullet(str) {
  return str.trim()
    .replace(/^[\u2022\u25CB\u25E6\u2023\u2043\u2013\u2014\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "");
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
// Matches date ranges at END of a line, e.g.
//   01/2025–Present   10/2021–12/2024   Jul 2020 – Present

const DATE_RANGE_RE = new RegExp(
  "(" +
  // MM/YYYY[sep]MM/YYYY or MM/YYYY[sep]Present
  "\\d{1,2}\\/\\d{4}\\s*[\\-\u2013\u2014]\\s*(?:\\d{1,2}\\/\\d{4}|[Pp]resent|[Cc]urrent)" +
  // plain MM/YYYY
  "|\\d{1,2}\\/\\d{4}" +
  // Month YYYY[sep]Month YYYY or Month YYYY[sep]Present
  "|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{4}" +
    "(?:\\s*[\\-\u2013\u2014]\\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{4}|[Pp]resent|[Cc]urrent))?" +
  ")\\s*$",
  "i"
);

function hasDate(str) {
  return DATE_RANGE_RE.test(str);
}

// Splits "Sr. Analytics Manager (Consultant) 01/2025–Present"
// → { role: "Sr. Analytics Manager (Consultant)", date: "01/2025 – Present" }
function extractRoleDate(line) {
  const m = line.match(DATE_RANGE_RE);
  if (!m) return { role: line.trim(), date: "" };
  const date = m[1].trim().replace(/\s*[\-\u2013\u2014]\s*/g, " \u2013 ");
  const role = line.slice(0, line.length - m[0].length).trim();
  return { role, date };
}

// ─── STEP 1: Split raw text into named section buckets ────────────────────────

const SECTION_PATTERNS = [
  { key: "summary",      re: /^(executive summary|professional summary|summary|profile|objective|career objective)$/i },
  { key: "competencies", re: /^(core competencies|key competencies|competencies)$/i },
  { key: "experience",   re: /^(professional experience|work experience|experience|employment history|employment)$/i },
  { key: "education",    re: /^(education|academic background|academic qualifications)$/i },
  { key: "skills",       re: /^(technical skills|technical proficiency|skills|key skills|core skills|technical competencies)$/i },
];

function getSectionKey(line) {
  const t = line.trim().replace(/:$/, "").trim();
  for (const { key, re } of SECTION_PATTERNS) {
    if (re.test(t)) return key;
  }
  return null;
}

// Returns { header, summary, summaryTitle, competencies, competenciesTitle,
//           experience, experienceTitle, education, educationTitle,
//           skills, skillsTitle }
// Each value is an array of raw lines (excluding the section header line itself).
function splitSections(text) {
  const bucket = {
    header:             [],
    summary:            [], summaryTitle:      "Professional Summary",
    competencies:       [], competenciesTitle:  "Core Competencies",
    experience:         [], experienceTitle:    "Professional Experience",
    education:          [], educationTitle:     "Education",
    skills:             [], skillsTitle:        "Technical Skills",
  };
  let current = "header";

  for (const raw of text.split("\n")) {
    const key = getSectionKey(raw);
    if (key) {
      current = key;
      // Preserve the original casing of the section header for display
      bucket[`${key}Title`] = raw.trim().replace(/:$/, "").trim();
    } else {
      bucket[current].push(raw);
    }
  }
  return bucket;
}

// ─── STEP 2: Parse header block → name, jobTitle, contact items ───────────────

// Returns true if a line is contact info (not a name/title candidate).
function isContactOnlyLine(raw) {
  const t = raw.trim().replace(/\s*\|\s*$/, "").trim();
  if (!t) return true;
  if (/@/.test(t)) return true;
  if (/\+\d/.test(t)) return true;
  if (/^(MOBILE|PHONE|TEL|EMAIL|ENVELOPE|MAIL|LINKEDIN|GITHUB|TWITTER|GLOBE|FAX|ADDRESS|LOCATION)\b/i.test(t)) return true;
  if (/linkedin\.com|github\.com/i.test(t)) return true;
  if (/^[A-Za-z][A-Za-z\s]+,\s*[A-Za-z][A-Za-z\s]+$/.test(t)) return true;
  return false;
}

function parseHeader(lines) {
  let name = "", jobTitle = "";
  let city = "", phone = "", email = "", linkedin = "";

  for (const raw of lines) {
    const t = raw.trim().replace(/\s*\|\s*$/, "").trim();
    if (!t) continue;

    // --- Extract contact fields (no early `continue` so same line can yield both phone + email) ---

    // Email
    if (!email) {
      const m = t.match(/[\w.+\-]+@[\w.\-]+\.[a-zA-Z]{2,}/);
      if (m) email = m[0];
    }

    // Phone: international format  +CC[sep]digits
    if (!phone) {
      const m = t.match(/\+\d{1,3}[\s\-]?\d[\d\s\-]{6,}/);
      if (m) phone = m[0].trim().replace(/\s+/g, " ");
    }

    // LinkedIn: full URL or "LINKEDIN-IN username"
    if (!linkedin) {
      if (/LINKEDIN/i.test(t) || /linkedin\.com/i.test(t)) {
        const urlM = t.match(/linkedin\.com\/in\/[\w\-]+/i);
        if (urlM) {
          linkedin = urlM[0];
        } else {
          const stripped = t.replace(/^[A-Za-z][A-Za-z\-]+\s+/, "").trim();
          const parts = stripped.split(/\s+/).filter(Boolean);
          const user = parts.find(p => !/^(LINKEDIN|IN)$/i.test(p) && p.length > 1);
          if (user) linkedin = `linkedin.com/in/${user}`;
        }
      }
    }

    // City: "City, Country" or "City, State"
    // Allow optional trailing punctuation and extra words (e.g. "Pune, India.")
    if (!city && /^[A-Za-z][A-Za-z\s]+,\s*[A-Za-z][A-Za-z\s,\.]+$/.test(t)) {
      city = t.replace(/[.,]+$/, "").trim(); // strip trailing punctuation
    }

    // --- Name / jobTitle: first two non-contact lines ---
    if (!isContactOnlyLine(raw)) {
      if (!name)     { name = t;     continue; }
      if (!jobTitle) { jobTitle = t; }
    }
  }

  return {
    name,
    jobTitle,
    contactParts: [city, phone, email, linkedin].filter(Boolean),
  };
}

// ─── STEP 3: Parse experience lines into structured entries ───────────────────
//
// State machine rules (processing one line at a time, blanks skipped):
//   • Bullet line          → append to currentEntry.bullets
//   • Line WITH date       → role+date line; use pendingCompany as company name;
//                            open a fresh currentEntry
//   • Non-bullet, no date  → company/org name; save as pendingCompany and reset
//                            currentEntry so upcoming bullets don't attach to
//                            the previous company

function parseExperience(lines) {
  const entries = [];
  let pendingCompany = "";
  let currentEntry   = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (isBulletLine(trimmed)) {
      // Attach bullet to current entry; create one if we somehow have none
      if (!currentEntry) {
        currentEntry = { company: pendingCompany, role: "", date: "", bullets: [] };
        entries.push(currentEntry);
        pendingCompany = "";
      }
      currentEntry.bullets.push(stripBullet(trimmed));

    } else if (hasDate(trimmed)) {
      // Role + date line: opens a new entry
      const { role, date } = extractRoleDate(trimmed);
      currentEntry = { company: pendingCompany, role, date, bullets: [] };
      entries.push(currentEntry);
      pendingCompany = "";

    } else {
      // Company / org name — hold it until we see the role+date line
      pendingCompany = trimmed;
      currentEntry   = null; // detach so bullets don't leak to previous entry
    }
  }

  return entries;
}

// ─── STEP 4: Parse education lines into entry groups ──────────────────────────
//
// Each entry is a blank-line-delimited group of 1–3 lines:
//   Line 0: University name + optional location
//   Line 1: Degree + date range
//   Line 2+: extra info (rare)
//
// We also flush on a year/Present-bearing line so entries without blank-line
// separation still come out as distinct rows.

function parseEducation(lines) {
  const entries = [];
  let group = [];

  const flush = () => {
    if (group.length) {
      entries.push([...group]);
      group = [];
    }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
    } else {
      group.push(trimmed);
      if (/\b(19|20)\d{2}\b/.test(trimmed) || /\b[Pp]resent\b/.test(trimmed)) {
        flush(); // year-bearing line ends this entry
      }
    }
  }
  flush();

  // Sort most-recent first.
  // "Present" / "In Progress" → 9999 so it always sorts to the top.
  // Otherwise take the largest 4-digit year found anywhere in the entry.
  const entryYear = (g) => {
    const text = g.join(" ");
    if (/\b(present|in progress)\b/i.test(text)) return 9999;
    const found = text.match(/\b(19|20)\d{2}\b/g);
    return found ? Math.max(...found.map(Number)) : 0;
  };
  entries.sort((a, b) => entryYear(b) - entryYear(a));

  return entries;
}

// ─── Phrase highlighter ───────────────────────────────────────────────────────
//
// Applied once to the fully-assembled body HTML (not per-section).
// For each phrase it finds and bolds only the FIRST occurrence in the entire
// document, skipping any text inside HTML tags so attributes are never touched.
// Longest phrases are processed first so "reduced effort by 40%" matches before
// a shorter sub-phrase like "40%".

function highlightPhrases(html, phrases) {
  if (!phrases || phrases.length === 0) return html;
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    if (!phrase.trim()) continue;
    // Match the phrase against already-HTML-escaped content
    const escapedPhrase = esc(phrase);
    const rePattern = escapedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Alternation: either an HTML tag (leave intact) or the phrase (bold once)
    let done = false;
    html = html.replace(
      new RegExp(`(<[^>]*>)|${rePattern}`, "g"),
      (match, tag) => {
        if (tag !== undefined) return tag;   // it's an HTML tag — pass through
        if (done) return match;              // already bolded — leave subsequent copies plain
        done = true;
        return `<strong style="font-weight:700;">${match}</strong>`;
      }
    );
  }
  return html;
}

// ─── HTML primitives ──────────────────────────────────────────────────────────

const BULLET_ITEM = (content) =>
  `<div style="display:flex;gap:6px;margin-bottom:3px;padding-left:8px;">` +
  `<span style="font-size:10px;line-height:1.4;flex-shrink:0;">\u2022</span>` +
  `<span style="font-size:10px;line-height:1.4;">${content}</span>` +
  `</div>`;

const SECTION_BLOCK = (title, innerHTML) =>
  `<div style="margin-top:16px;">` +
  `<div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#000;` +
  `border-bottom:1px solid #333;padding-bottom:2px;margin-bottom:6px;letter-spacing:0.05em;">` +
  `${esc(title)}</div>` +
  innerHTML +
  `</div>`;

// ─── STEP 5: Section renderers ────────────────────────────────────────────────

function renderSummary(lines) {
  return lines.map(raw => {
    const t = raw.trim();
    if (!t) return "";
    if (isBulletLine(t)) return BULLET_ITEM(esc(stripBullet(t)));
    return `<div style="font-size:10px;line-height:1.5;margin-bottom:4px;">${esc(t)}</div>`;
  }).join("");
}

// Bullets with optional bold label before the first colon
function renderBulletSection(lines) {
  return lines.map(raw => {
    const t = raw.trim();
    if (!t) return "";
    if (isBulletLine(t)) {
      const text = stripBullet(t);
      const ci = text.indexOf(":");
      if (ci > 0 && ci < 80) {
        return BULLET_ITEM(
          `<strong>${esc(text.slice(0, ci + 1))}</strong>${esc(text.slice(ci + 1))}`
        );
      }
      return BULLET_ITEM(esc(text));
    }
    return `<div style="font-size:10px;line-height:1.4;margin-bottom:3px;">${esc(t)}</div>`;
  }).join("");
}

function renderExperience(entries) {
  return entries.map(({ company, role, date, bullets }) => {
    // Use explicit • glyph in a flex div — more reliable than list-style in print
    const bulletsHTML = bullets.length
      ? `<div style="margin-top:4px;">` +
        bullets.map(b =>
          `<div style="display:flex;margin-bottom:4px;">` +
          `<span style="margin-right:8px;color:#444;flex-shrink:0;">\u2022</span>` +
          `<span style="font-size:10px;line-height:1.4;color:#222;">${esc(b)}</span>` +
          `</div>`
        ).join("") +
        `</div>`
      : "";

    return (
      `<div style="margin-bottom:12px;">` +
      (company
        ? `<div style="font-size:12px;font-weight:bold;color:#000;margin-bottom:2px;">${esc(company)}</div>`
        : "") +
      ((role || date)
        ? `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;">` +
          `<span style="font-size:10px;font-weight:bold;color:#222;">${esc(role)}</span>` +
          (date ? `<span style="font-size:10px;color:#666;">${esc(date)}</span>` : "") +
          `</div>`
        : "") +
      bulletsHTML +
      `</div>`
    );
  }).join("");
}

function renderEducation(entries) {
  return entries.map(group => {
    if (!group.length) return "";

    if (group.length === 1) {
      // Single line: split on | or – if present, else show as-is
      const { role: deg, date } = extractRoleDate(group[0]);
      const display = esc(deg) + (date ? ` <span style="color:#666;">(${esc(date)})</span>` : "");
      return `<div style="font-size:10px;line-height:1.6;margin-bottom:6px;">${display}</div>`;
    }

    // group[0] = university + optional location
    // group[1] = degree + date range
    // Format: "Degree — University (Date)"
    const university = group[0];
    const { role: degree, date } = extractRoleDate(group[1]);
    // Any extra lines (group[2+]) are silently appended to university for completeness
    const uniLabel = [university, ...group.slice(2)].join(", ");

    return (
      `<div style="font-size:10px;line-height:1.6;margin-bottom:6px;">` +
      `<strong>${esc(degree)}</strong>` +
      (uniLabel ? ` \u2014 ${esc(uniLabel)}` : "") +       // — University
      (date ? ` <span style="color:#666;">(${esc(date)})</span>` : "") +
      `</div>`
    );
  }).join("");
}

// ─── STEP 6: Assemble the full HTML document ──────────────────────────────────

export function generateResumeHTML(resumeText, profileLocation = "", boldPhrases = []) {
  const sections = splitSections(resumeText);

  // Header
  const { name, jobTitle, contactParts: rawContactParts } = parseHeader(sections.header);

  // If profileLocation is provided, use it as the city (replacing any auto-detected city)
  const cityRegex = /^[A-Za-z][A-Za-z\s]+,\s*[A-Za-z]/;
  const contactParts = profileLocation
    ? [profileLocation, ...rawContactParts.filter(p => !cityRegex.test(p))]
    : rawContactParts;

  const contactHTML = contactParts.map((item, idx) => {
    const trimmed = item.trim();
    const isLinkedIn = /linkedin\.com/i.test(trimmed);
    const href = isLinkedIn
      ? (trimmed.startsWith("http") ? trimmed : `https://${trimmed}`)
      : "";
    const content = isLinkedIn
      ? `<a href="${esc(href)}" style="color:#1155CC;text-decoration:underline;">${esc(trimmed)}</a>`
      : esc(trimmed);
    return (idx > 0 ? `<span style="color:#AAA;margin:0 5px;">|</span>` : "") + content;
  }).join("");

  // Section bodies — renderers produce plain escaped HTML; phrase highlighting
  // is applied in a single pass over the fully assembled body below so that
  // each phrase is bolded only on its first occurrence across the entire document.
  const summaryHTML      = renderSummary(sections.summary);
  const competenciesHTML = renderBulletSection(sections.competencies);
  const experienceHTML   = renderExperience(parseExperience(sections.experience));
  const educationHTML    = renderEducation(parseEducation(sections.education));
  const skillsHTML       = renderBulletSection(sections.skills);

  // Assemble body, then apply phrase highlights in one pass over the full HTML
  const rawBody = [
    summaryHTML.trim()      && SECTION_BLOCK(sections.summaryTitle,      summaryHTML),
    competenciesHTML.trim() && SECTION_BLOCK(sections.competenciesTitle,  competenciesHTML),
    experienceHTML.trim()   && SECTION_BLOCK(sections.experienceTitle,    experienceHTML),
    educationHTML.trim()    && SECTION_BLOCK(sections.educationTitle,     educationHTML),
    skillsHTML.trim()       && SECTION_BLOCK(sections.skillsTitle,        skillsHTML),
  ].filter(Boolean).join("");

  const body = highlightPhrases(rawBody, boldPhrases);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(name)} \u2013 Resume</title>
  <style>
    @page { margin: 0.55in; size: A4; }
    @media print {
      .print-banner { display: none !important; }
      @page { margin: 0.55in; }
      .resume-content { padding: 0 !important; }
      body { -webkit-print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #000; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  <div class="print-banner" style="background:#EBF5FF;border:1px solid #3B82F6;border-radius:6px;padding:12px 20px;font-family:Arial,sans-serif;font-size:13px;color:#1E40AF;margin:16px auto;max-width:750px;">
    <div style="font-weight:bold;margin-bottom:6px;">&#128196; To download as PDF (Chrome recommended):</div>
    <ol style="margin:0;padding-left:20px;line-height:1.8;">
      <li>Press <strong>Cmd+P</strong> (Mac) or <strong>Ctrl+P</strong> (Windows)</li>
      <li>Set <strong>Destination</strong> &rarr; <strong>Save as PDF</strong></li>
      <li>Click <strong>More Settings</strong></li>
      <li>Turn <strong>OFF</strong> &ldquo;Headers and Footers&rdquo; &larr; <em>important</em></li>
      <li>Set <strong>Margins</strong> &rarr; <strong>None</strong></li>
      <li>Click <strong>Save</strong></li>
    </ol>
  </div>
  <div class="resume-content" style="max-width:750px;margin:0 auto;padding:0.6in;">
    ${name     ? `<div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#000;margin-bottom:4px;">${esc(name)}</div>` : ""}
    ${jobTitle ? `<div style="font-family:Arial,sans-serif;font-size:14px;color:#444;margin-bottom:6px;">${esc(jobTitle)}</div>` : ""}
    ${contactHTML ? `<div style="font-size:11px;color:#666;font-family:Arial,sans-serif;margin-bottom:14px;">${contactHTML}</div>` : ""}
    <hr style="border:none;border-top:1px solid #CCC;margin-bottom:0;" />
    ${body}
  </div>
</body>
</html>`;
}
