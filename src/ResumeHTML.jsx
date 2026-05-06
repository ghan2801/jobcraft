// src/ResumeHTML.jsx
// Converts plain-text resume into a complete HTML document for browser preview + print-to-PDF.
// Supports three templates: 'classic', 'modern', 'executive'
//
// Pipeline (shared across templates):
//   STEP 1  splitSections()   – split raw text into named buckets by section header
//   STEP 2  parseHeader()     – extract name, title, city/phone/email/linkedin
//   STEP 3  parseExperience() – state machine: company → role+date → bullets
//   STEP 4  parseEducation()  – blank-line groups; flush on year/Present
//   STEP 5  render*()         – each bucket → HTML string
//   STEP 6  build*Doc()       – assemble final HTML for chosen template

// ─── HTML escape ──────────────────────────────────────────────────────────────

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Markdown → HTML cleanup ─────────────────────────────────────────────────
// Converts **text** patterns (injected by AI) into <strong> tags.
// Applied to assembled section HTML before phrase highlighting.

const cleanMarkdown = (text) => {
  if (!text) return '';
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
};

// ─── Resume text cleanup ─────────────────────────────────────────────────────
// Fixes AI-introduced corruptions (duplicated company names, etc.)
// Applied to the raw resume text before any parsing.

const cleanResumeText = (text) => {
  if (!text) return '';
  // Fix known Avalara-style corruptions first (most specific → least specific)
  text = text.replace(/AvalaraAvalaraAvalara/gi, 'Avalara');
  text = text.replace(/AvalaraAvalara/gi, 'Avalara');
  text = text.replace(/AvalaraAnalytics/gi, 'Avalara');
  // Generic fix: remove immediately-adjacent duplicate words (e.g. "AvalaraAvalara").
  // Require 4+ chars per word so short repeated-syllable names like "Tata" are not mangled.
  text = text.replace(/\b(\w{4,})\1\b/gi, '$1');
  return text;
};

// Strips non-ASCII characters (Cyrillic, stray Unicode, etc.) that creep in
// from AI output. Applied to every line before processing.
const sanitizeText = (text) => {
  if (!text) return '';
  return text
    .replace(/[^\x00-\x7F\u2022\u00B7\u2013\u2014]/g, '') // Keep ASCII + bullets + en/em-dash
    .replace(/\s+/g, ' ')
    .trim();
};

// Cleans company names extracted by the parser.
// Strips non-ASCII noise, embedded date patterns, and trailing role-title words
// that the AI sometimes merges onto the company line (e.g. "Avalara Lead").
function cleanCompanyName(str) {
  return str
    .replace(/[^\x00-\x7F\u2022\u00B7]/g, '')   // Remove non-ASCII (Cyrillic, etc.)
    // Strip any date and everything that follows it (safety net for mis-parsed lines)
    .replace(/\s*\d{1,2}\/\d{4}.*$/, '')
    .replace(/\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}.*$/i, '')
    // Strip trailing role-title words the AI sometimes appends to the company name
    .replace(/\s+(?:Lead|Manager|Analyst|Engineer|Director|VP|Head|Senior|Sr|Jr|Associate|Consultant|Specialist|Coordinator|Executive|Officer|Developer|Architect|Scientist|Supervisor)$/i, '')
    .replace(/[\s.|–—\u00B7\u2022]+$/, '')        // Strip trailing: space, period, pipe, dashes
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Bullet helpers ───────────────────────────────────────────────────────────

function isBulletLine(str) {
  return /^[\u2022\u25CB\u25E6\u2023\u2043\u2013\u2014\-*]/.test(str.trim()) ||
    /^\d+[.)]\s/.test(str.trim());
}

function stripBullet(str) {
  return str.trim()
    .replace(/^[\u2022\u25CB\u25E6\u2023\u2043\u2013\u2014\-*]\s*/, "")
    .replace(/^\d+[.)]\s*/, "");
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

const DATE_RANGE_RE = new RegExp(
  "(" +
  "\\d{1,2}\\/\\d{4}\\s*[\\-\u2013\u2014]\\s*(?:\\d{1,2}\\/\\d{4}|[Pp]resent|[Cc]urrent)" +
  "|\\d{1,2}\\/\\d{4}" +
  "|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{4}" +
    "(?:\\s*[\\-\u2013\u2014]\\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\.?\\s+\\d{4}|[Pp]resent|[Cc]urrent))?" +
  ")\\s*$",
  "i"
);

function hasDate(str) {
  return DATE_RANGE_RE.test(str);
}

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
    const line = sanitizeText(raw);
    const key = getSectionKey(line);
    if (key) {
      current = key;
      bucket[`${key}Title`] = line.replace(/:$/, "").trim();
    } else {
      bucket[current].push(line);
    }
  }
  return bucket;
}

// ─── STEP 2: Parse header block → name, jobTitle, contact items ───────────────

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

function isRelocationLine(raw) {
  return /open to relocat|available immediately/i.test(raw);
}

function parseHeader(lines) {
  let name = "", jobTitle = "", relocationLine = "";
  let city = "", phone = "", email = "", linkedin = "";

  for (const raw of lines) {
    const t = raw.trim().replace(/\s*\|\s*$/, "").trim();
    if (!t) continue;

    // Detect relocation line before name/jobTitle assignment so it isn't
    // mistakenly used as the candidate's job title.
    if (isRelocationLine(t)) {
      relocationLine = t;
      continue;
    }

    if (!email) {
      const m = t.match(/[\w.+\-]+@[\w.\-]+\.[a-zA-Z]{2,}/);
      if (m) email = m[0];
    }

    if (!phone) {
      const m = t.match(/\+\d{1,3}[\s\-]?\d[\d\s\-]{6,}/);
      if (m) phone = m[0].trim().replace(/\s+/g, " ");
    }

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

    if (!city && /^[A-Za-z][A-Za-z\s]+,\s*[A-Za-z][A-Za-z\s,\.]+$/.test(t)) {
      city = t.replace(/[.,]+$/, "").trim();
    }

    if (!isContactOnlyLine(raw)) {
      if (!name)     { name = t;     continue; }
      if (!jobTitle) { jobTitle = t; }
    }
  }

  return {
    name,
    jobTitle,
    contactParts: [city, phone, email, linkedin].filter(Boolean),
    relocationLine,
  };
}

// ─── STEP 3: Parse experience lines into structured entries ───────────────────
//
// Two-pass approach:
//   Pass 1 – lookahead: a line is a "company header" when the very next
//            non-blank line contains a date.  This correctly captures the
//            first company even when there is no blank line before it.
//   Pass 2 – state machine: company → role+date → bullets.
//            Any non-company, non-date, non-bullet line inside an active
//            entry is a bullet whose leading character was stripped by
//            sanitizeText (e.g. ○ or an un-preserved dash).

function parseExperience(lines) {
  // Pass 1: identify company-header line indices
  const companyIdx = new Set();
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t || isBulletLine(t) || hasDate(t)) continue;
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].trim()) continue;           // skip blanks
      if (hasDate(lines[j].trim())) companyIdx.add(i);
      break;                                     // only look at immediate next non-blank
    }
  }

  // Pass 2: build entries
  const entries = [];
  let pendingCompany = "";
  let currentEntry   = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (companyIdx.has(i)) {
      pendingCompany = cleanCompanyName(trimmed);
      currentEntry   = null;
    } else if (hasDate(trimmed)) {
      const { role, date } = extractRoleDate(trimmed);
      currentEntry = { company: pendingCompany, role, date, bullets: [] };
      entries.push(currentEntry);
      pendingCompany = "";
    } else if (isBulletLine(trimmed)) {
      if (!currentEntry) {
        currentEntry = { company: pendingCompany, role: "", date: "", bullets: [] };
        entries.push(currentEntry);
        pendingCompany = "";
      }
      currentEntry.bullets.push(stripBullet(trimmed));
    } else if (currentEntry) {
      // Non-company, non-date, non-bullet inside an active entry:
      // the leading bullet character was stripped – treat as bullet body.
      currentEntry.bullets.push(trimmed);
    }
    // else: orphan line before any entry – ignore
  }

  return entries;
}

// ─── STEP 4: Parse education lines into entry groups ──────────────────────────

function parseEducation(lines) {
  const entries = [];
  let group = [];

  const flush = () => {
    if (group.length) { entries.push([...group]); group = []; }
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
    } else {
      group.push(trimmed);
      if (/\b(19|20)\d{2}\b/.test(trimmed) || /\b[Pp]resent\b/.test(trimmed)) flush();
    }
  }
  flush();

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
// Highlights ALL occurrences of each phrase within a single HTML section string.
// Skips content inside HTML tags. Longer phrases are matched first to avoid
// partial overlap (e.g. "Product Management" before "Management").
// Applied per-section before cleanMarkdown so ** markers don't fragment matches.

// usedSet (optional Set) tracks which phrases have already been bolded
// somewhere in the document.  Pass the same Set to every section so each
// phrase is bolded only on its first occurrence.
function applyPhraseHighlighting(html, phrases, usedSet) {
  if (!phrases || phrases.length === 0) return html;
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  for (const phrase of sorted) {
    if (!phrase.trim()) continue;
    const key = phrase.toLowerCase();
    if (usedSet && usedSet.has(key)) continue;   // already bolded in an earlier section
    const escapedPhrase = esc(phrase);
    const rePattern = escapedPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let found = false;
    html = html.replace(
      new RegExp(`(<[^>]*>)|${rePattern}`, "gi"),
      (match, tag) => {
        if (tag !== undefined) return tag;
        found = true;
        return `<strong style="font-weight:700;">${match}</strong>`;
      }
    );
    if (usedSet && found) usedSet.add(key);
  }
  return html;
}

// Convenience: highlight then convert markdown bold in one pass.
const highlight = (html, phrases, usedSet) =>
  cleanMarkdown(applyPhraseHighlighting(html, phrases, usedSet));

// ─── Print instructions banner (shared) ──────────────────────────────────────

const PRINT_BANNER = `<div class="print-banner" style="background:#EBF5FF;border:1px solid #3B82F6;border-radius:6px;padding:12px 20px;font-family:Arial,sans-serif;font-size:13px;color:#1E40AF;margin:16px auto;max-width:750px;">
  <div style="font-weight:bold;margin-bottom:6px;">&#128196; To download as PDF (Chrome recommended):</div>
  <ol style="margin:0;padding-left:20px;line-height:1.8;">
    <li>Press <strong>Cmd+P</strong> (Mac) or <strong>Ctrl+P</strong> (Windows)</li>
    <li>Set <strong>Destination</strong> &rarr; <strong>Save as PDF</strong></li>
    <li>Click <strong>More Settings</strong></li>
    <li>Turn <strong>OFF</strong> &ldquo;Headers and Footers&rdquo; &larr; <em>important</em></li>
    <li>Set <strong>Margins</strong> &rarr; <strong>None</strong></li>
    <li>Click <strong>Save</strong></li>
  </ol>
</div>`;

// ─── Shared content renderers ─────────────────────────────────────────────────

function renderSummary(lines, textStyle) {
  const ts = textStyle || "font-size:10px;line-height:1.5;margin-bottom:4px;";
  return lines.map(raw => {
    const t = raw.trim();
    if (!t) return "";
    if (isBulletLine(t)) {
      return `<div style="display:flex;gap:6px;margin-bottom:3px;padding-left:8px;">` +
        `<span style="font-size:10px;line-height:1.4;flex-shrink:0;">\u2022</span>` +
        `<span style="${ts}">${esc(stripBullet(t))}</span></div>`;
    }
    return `<div style="${ts}">${esc(t)}</div>`;
  }).join("");
}

function renderBulletSection(lines, textStyle) {
  const ts = textStyle || "font-size:10px;line-height:1.4;";
  return lines.map(raw => {
    const t = raw.trim();
    if (!t) return "";
    if (isBulletLine(t)) {
      const text = stripBullet(t);
      const ci = text.indexOf(":");
      if (ci > 0 && ci < 80) {
        return `<div style="display:flex;gap:6px;margin-bottom:3px;padding-left:8px;">` +
          `<span style="font-size:10px;line-height:1.4;flex-shrink:0;">\u2022</span>` +
          `<span style="${ts}"><strong>${esc(text.slice(0, ci + 1))}</strong>${esc(text.slice(ci + 1))}</span></div>`;
      }
      return `<div style="display:flex;gap:6px;margin-bottom:3px;padding-left:8px;">` +
        `<span style="font-size:10px;line-height:1.4;flex-shrink:0;">\u2022</span>` +
        `<span style="${ts}">${esc(text)}</span></div>`;
    }
    return `<div style="${ts};margin-bottom:3px;">${esc(t)}</div>`;
  }).join("");
}

// ─── Core Competencies two-column table ───────────────────────────────────────
// Parses lines of the form "Category: skill1, skill2, skill3" and lays them out
// as a two-column table. Falls back to renderBulletSection for plain lists.

function renderCompetenciesTable(lines, textStyle) {
  const ts = textStyle || "font-size:9.5px;line-height:1.6;";

  const pairs = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    const text = isBulletLine(t) ? stripBullet(t) : t;
    const colonIdx = text.indexOf(":");
    if (colonIdx > 0 && colonIdx < 70) {
      pairs.push({ category: text.slice(0, colonIdx).trim(), skills: text.slice(colonIdx + 1).trim() });
    } else {
      pairs.push({ category: "", skills: text });
    }
  }

  if (pairs.length === 0) return "";

  // Use table layout only when most entries have an explicit category label
  const categorised = pairs.filter(p => p.category).length;
  if (categorised < Math.ceil(pairs.length / 2)) {
    return renderBulletSection(lines, textStyle);
  }

  const mid = Math.ceil(pairs.length / 2);
  const left  = pairs.slice(0, mid);
  const right = pairs.slice(mid);

  const cell = (p) => {
    if (!p) return `<td></td>`;
    const cat  = p.category ? `<strong>${esc(p.category)}:</strong> ` : "";
    return `<td style="vertical-align:top;padding:2px 10px 4px 0;${ts}">${cat}${esc(p.skills)}</td>`;
  };

  const rows = left.map((lp, i) => `<tr>${cell(lp)}${cell(right[i])}</tr>`).join("");

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:4px;">${rows}</table>`;
}

// opts: { companyStyle, roleColor, dateColor, bulletColor, textColor, hFn }
// hFn (optional): called with esc(bulletText) for each bullet — use to apply
// per-bullet phrase highlighting so keywords are bolded inside bullet spans.
function renderExperience(entries, opts = {}) {
  const companyStyle = opts.companyStyle || "font-size:12px;font-weight:bold;color:#000;margin-bottom:2px;";
  const roleColor    = opts.roleColor    || "#222";
  const dateColor    = opts.dateColor    || "#666";
  const bulletColor  = opts.bulletColor  || "#444";
  const textColor    = opts.textColor    || "#222";
  const hFn          = opts.hFn          || null;

  return entries.map(({ company, role, date, bullets }) => {
    const bulletsHTML = bullets.length
      ? `<div style="margin-top:4px;">` +
        bullets.map(b => {
          const content = hFn ? hFn(esc(b)) : esc(b);
          return `<div style="display:flex;margin-bottom:4px;">` +
            `<span style="margin-right:8px;color:${bulletColor};flex-shrink:0;">\u2022</span>` +
            `<span style="font-size:10px;line-height:1.4;color:${textColor};">${content}</span>` +
            `</div>`;
        }).join("") +
        `</div>`
      : "";

    return (
      `<div style="margin-bottom:12px;">` +
      (company ? `<div style="${companyStyle}">${esc(company)}</div>` : "") +
      ((role || date)
        ? `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;">` +
          `<span style="font-size:10px;font-weight:bold;color:${roleColor};">${esc(role)}</span>` +
          (date ? `<span style="font-size:10px;color:${dateColor};">${esc(date)}</span>` : "") +
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
      const { role: deg, date } = extractRoleDate(group[0]);
      const display = esc(deg) + (date ? ` <span style="color:#666;">(${esc(date)})</span>` : "");
      return `<div style="font-size:10px;line-height:1.6;margin-bottom:6px;">${display}</div>`;
    }

    const university = group[0];
    const { role: degree, date } = extractRoleDate(group[1]);
    const uniLabel = [university, ...group.slice(2)].join(", ");

    return (
      `<div style="font-size:10px;line-height:1.6;margin-bottom:6px;">` +
      `<strong>${esc(degree)}</strong>` +
      (uniLabel ? ` \u2014 ${esc(uniLabel)}` : "") +
      (date ? ` <span style="color:#666;">(${esc(date)})</span>` : "") +
      `</div>`
    );
  }).join("");
}

// ─── Modern sidebar renderers ─────────────────────────────────────────────────

// Extracts individual skill tokens and renders as accent-colour pills
function renderSidebarSkills(lines) {
  const skills = [];
  for (const raw of lines) {
    const t = raw.trim();
    if (!t) continue;
    const text = isBulletLine(t) ? stripBullet(t) : t;
    text.split(/[,\u2022]+/).forEach(s => {
      const skill = s.trim();
      if (skill) skills.push(skill);
    });
  }
  return skills.map(s =>
    `<span style="display:inline-block;background:rgba(59,130,246,0.12);color:#3B82F6;` +
    `border:1px solid rgba(59,130,246,0.25);border-radius:3px;padding:2px 5px;` +
    `font-size:8px;margin:1px;font-family:Arial,sans-serif;">${esc(s)}</span>`
  ).join("");
}

// Renders competencies/other sidebar lists as small light-gray items
function renderSidebarList(lines) {
  return lines.map(raw => {
    const t = raw.trim();
    if (!t) return "";
    const text = isBulletLine(t) ? stripBullet(t) : t;
    return `<div style="font-size:9px;color:#aaa;line-height:1.7;font-family:Arial,sans-serif;">${esc(text)}</div>`;
  }).filter(Boolean).join("");
}

// ─── Template: CLASSIC ────────────────────────────────────────────────────────

function buildClassicDoc({ name, jobTitle, inlineContactHTML, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle }) {

  const sectionBlock = (title, innerHTML) =>
    `<div style="margin-top:14px;">` +
    `<div style="font-size:11px;font-weight:bold;text-transform:uppercase;color:#000;` +
    `font-family:Georgia,serif;border-bottom:1.5px solid #333;padding-bottom:3px;` +
    `margin-bottom:8px;letter-spacing:0.06em;">${esc(title)}</div>` +
    innerHTML +
    `</div>`;

  // used – shared across non-experience sections (deduplicates within summary/skills/etc.)
  // hFn  – no Set: each bullet highlights all phrases independently so every
  //         bullet that contains a keyword gets it bolded, not just the first.
  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (escapedText) =>
    applyPhraseHighlighting(cleanMarkdown(escapedText), boldPhrases);

  const summaryHTML      = h(renderSummary(sections.summary));
  const competenciesHTML = h(renderCompetenciesTable(sections.competencies));
  const experienceHTML   = cleanMarkdown(renderExperience(parsedExperience, { hFn }));
  const educationHTML    = h(renderEducation(parsedEducation));
  const skillsHTML       = h(renderBulletSection(sections.skills));

  const body = [
    summaryHTML.trim()      && sectionBlock(sections.summaryTitle,      summaryHTML),
    competenciesHTML.trim() && sectionBlock(sections.competenciesTitle,  competenciesHTML),
    experienceHTML.trim()   && sectionBlock(sections.experienceTitle,    experienceHTML),
    educationHTML.trim()    && sectionBlock(sections.educationTitle,     educationHTML),
    skillsHTML.trim()       && sectionBlock(sections.skillsTitle,        skillsHTML),
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0.75in; size: A4; }
    @media print {
      .print-banner { display: none !important; }
      @page { margin: 0.75in; }
      .resume-content { padding: 0 !important; }
      body { -webkit-print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #000; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${PRINT_BANNER}
  <div class="resume-content" style="max-width:750px;margin:0 auto;padding:0.6in;">
    ${name     ? `<div style="font-family:Georgia,serif;font-size:22px;font-weight:bold;color:#000;margin-bottom:4px;">${esc(name)}</div>` : ""}
    ${jobTitle ? `<div style="font-family:Arial,sans-serif;font-size:14px;color:#444;margin-bottom:6px;">${esc(jobTitle)}</div>` : ""}
    ${inlineContactHTML ? `<div style="font-size:11px;color:#666;font-family:Arial,sans-serif;margin-bottom:${relocationLine ? "4px" : "14px"};">${inlineContactHTML}</div>` : ""}
    ${relocationLine ? `<div style="font-size:11px;color:#2563EB;font-style:italic;font-weight:500;margin-bottom:14px;">${esc(relocationLine)}</div>` : ""}
    <hr style="border:none;border-top:1.5px solid #CCC;margin-bottom:0;" />
    ${body}
  </div>
</body>
</html>`;
}

// ─── Template: MODERN ────────────────────────────────────────────────────────

function buildModernDoc({ name, jobTitle, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle }) {

  const sidebarSection = (title, innerHTML) =>
    `<div style="margin-top:14px;border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">` +
    `<div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#3B82F6;` +
    `letter-spacing:0.1em;margin-bottom:6px;">${esc(title)}</div>` +
    innerHTML +
    `</div>`;

  const mainSection = (title, innerHTML) =>
    `<div style="margin-top:14px;">` +
    `<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#3B82F6;` +
    `letter-spacing:0.1em;margin-bottom:6px;">${esc(title)}</div>` +
    innerHTML +
    `</div>`;

  const skillsContent       = renderSidebarSkills(sections.skills);
  const competenciesContent = renderSidebarList(sections.competencies);

  const sidebarHTML =
    (name     ? `<div style="font-size:16px;font-weight:bold;color:#fff;font-family:Arial,sans-serif;line-height:1.3;margin-bottom:3px;">${esc(name)}</div>` : "") +
    (jobTitle ? `<div style="font-size:10px;color:#3B82F6;font-family:Arial,sans-serif;margin-bottom:10px;">${esc(jobTitle)}</div>` : "") +
    (contactParts.length
      ? `<div style="border-top:1px solid rgba(255,255,255,0.1);padding-top:10px;">` +
        contactParts.map(p =>
          `<div style="font-size:9px;color:#aaa;line-height:1.8;font-family:Arial,sans-serif;word-break:break-all;">${esc(p)}</div>`
        ).join("") +
        (relocationLine ? `<div style="font-size:9px;color:#34d399;font-style:italic;font-weight:500;margin-top:5px;line-height:1.5;">${esc(relocationLine)}</div>` : "") +
        `</div>`
      : "") +
    (skillsContent       ? sidebarSection(sections.skillsTitle,        skillsContent)       : "") +
    (competenciesContent.trim() ? sidebarSection(sections.competenciesTitle, competenciesContent) : "");

  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (escapedText) =>
    applyPhraseHighlighting(cleanMarkdown(escapedText), boldPhrases);

  const summaryHTML    = h(renderSummary(sections.summary,   "font-size:10px;line-height:1.5;margin-bottom:4px;color:#333;"));
  const experienceHTML = cleanMarkdown(renderExperience(parsedExperience, {
    companyStyle: "font-size:11px;font-weight:bold;color:#111;margin-bottom:2px;",
    roleColor:    "#3B82F6",
    dateColor:    "#888",
    bulletColor:  "#666",
    textColor:    "#333",
    hFn,
  }));
  const educationHTML  = h(renderEducation(parsedEducation));

  const mainBody = [
    summaryHTML.trim()    && mainSection(sections.summaryTitle,    summaryHTML),
    experienceHTML.trim() && mainSection(sections.experienceTitle, experienceHTML),
    educationHTML.trim()  && mainSection(sections.educationTitle,  educationHTML),
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0.3in; size: A4; }
    @media print {
      .print-banner { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #000; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${PRINT_BANNER}
  <table style="width:100%;max-width:780px;margin:0 auto;border-collapse:collapse;table-layout:fixed;">
    <colgroup>
      <col style="width:200px;" />
      <col />
    </colgroup>
    <tr>
      <td style="background:#1a1a2e;vertical-align:top;padding:24px 14px;word-break:break-word;">
        ${sidebarHTML}
      </td>
      <td style="background:#fff;vertical-align:top;padding:24px 22px;">
        ${mainBody}
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Template: EXECUTIVE ─────────────────────────────────────────────────────

function buildExecutiveDoc({ name, jobTitle, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle }) {

  const sectionBlock = (title, innerHTML) =>
    `<div style="margin-top:16px;">` +
    `<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;">` +
    `<div style="width:3px;height:14px;background:#3B82F6;border-radius:1px;flex-shrink:0;"></div>` +
    `<span style="font-size:10px;font-weight:700;text-transform:uppercase;color:#1E293B;letter-spacing:0.07em;">${esc(title)}</span>` +
    `</div>` +
    innerHTML +
    `</div>`;

  const contactLine = contactParts.join("  \u00B7  ");

  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (escapedText) =>
    applyPhraseHighlighting(cleanMarkdown(escapedText), boldPhrases);

  const summaryHTML      = h(renderSummary(sections.summary,    "font-size:10px;line-height:1.55;margin-bottom:4px;color:#374151;"));
  const competenciesHTML = h(renderCompetenciesTable(sections.competencies, "font-size:9.5px;line-height:1.6;color:#374151;"));
  const experienceHTML   = cleanMarkdown(renderExperience(parsedExperience, {
    companyStyle: "font-size:12px;font-weight:bold;color:#0F172A;margin-bottom:2px;",
    roleColor:    "#3B82F6",
    dateColor:    "#64748b",
    bulletColor:  "#475569",
    textColor:    "#374151",
    hFn,
  }));
  const educationHTML    = h(renderEducation(parsedEducation));
  const skillsHTML       = h(renderBulletSection(sections.skills, "font-size:10px;line-height:1.4;color:#374151;"));

  const body = [
    summaryHTML.trim()      && sectionBlock(sections.summaryTitle,      summaryHTML),
    competenciesHTML.trim() && sectionBlock(sections.competenciesTitle,  competenciesHTML),
    experienceHTML.trim()   && sectionBlock(sections.experienceTitle,    experienceHTML),
    educationHTML.trim()    && sectionBlock(sections.educationTitle,     educationHTML),
    skillsHTML.trim()       && sectionBlock(sections.skillsTitle,        skillsHTML),
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0; size: A4; }
    @media print {
      .print-banner { display: none !important; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #000; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${PRINT_BANNER}
  <div style="background:#1E293B;padding:28px 0.75in;-webkit-print-color-adjust:exact;print-color-adjust:exact;">
    ${name     ? `<div style="font-size:24px;font-weight:bold;color:#fff;font-family:Arial,sans-serif;margin-bottom:5px;">${esc(name)}</div>` : ""}
    ${jobTitle ? `<div style="font-size:14px;color:#3B82F6;font-family:Arial,sans-serif;margin-bottom:8px;">${esc(jobTitle)}</div>` : ""}
    ${contactLine ? `<div style="font-size:11px;color:#94a3b8;font-family:Arial,sans-serif;">${esc(contactLine)}</div>` : ""}
    ${relocationLine ? `<div style="font-size:11px;color:#34d399;font-style:italic;font-weight:500;margin-top:5px;">${esc(relocationLine)}</div>` : ""}
  </div>
  <div style="padding:0.3in 0.75in 0.5in;">
    ${body}
  </div>
</body>
</html>`;
}

// ─── Shared helpers for regional templates ────────────────────────────────────

function formatDOB(dateStr, countryCode) {
  if (!dateStr) return "";
  // dateStr is YYYY-MM-DD from <input type="date">
  // Parse as local date to avoid UTC offset shifting the day
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  const date = new Date(y, m - 1, d);
  if (isNaN(date)) return dateStr;
  if (countryCode === "DE") return date.toLocaleDateString("de-DE");          // DD.MM.YYYY
  if (countryCode === "SG") return date.toLocaleDateString("en-SG");          // DD/MM/YYYY
  return date.toLocaleDateString("en-GB");                                     // DD/MM/YYYY
}

const REGIONAL_PRINT_BANNER = `<div class="print-banner" style="background:#EBF5FF;border:1px solid #3B82F6;border-radius:6px;padding:12px 20px;font-family:Arial,sans-serif;font-size:13px;color:#1E40AF;margin:16px auto;max-width:780px;">
  <div style="font-weight:bold;margin-bottom:6px;">&#128196; To save as PDF (Chrome recommended): Cmd+P / Ctrl+P &rarr; Save as PDF &rarr; More Settings &rarr; Turn OFF &ldquo;Headers and Footers&rdquo; &rarr; Margins: None &rarr; Save</div>
</div>`;

function regionalSection(title, innerHTML, opts = {}) {
  const color   = opts.accentColor || "#1E293B";
  const border  = opts.borderStyle || `2px solid ${color}`;
  return (
    `<div style="margin-top:18px;">` +
    `<div style="font-size:10px;font-weight:700;text-transform:uppercase;color:${color};` +
    `letter-spacing:0.08em;border-bottom:${border};padding-bottom:4px;margin-bottom:8px;">${esc(title)}</div>` +
    innerHTML +
    `</div>`
  );
}

function renderContactLine(parts, sep = " \u00B7 ") {
  return parts.map(p => {
    const t = p.trim();
    if (/linkedin\.com/i.test(t)) {
      const href = t.startsWith("http") ? t : `https://${t}`;
      return `<a href="${esc(href)}" style="color:#1155CC;text-decoration:underline;">${esc(t)}</a>`;
    }
    return esc(t);
  }).join(sep);
}

// ─── Template: UK / IRELAND ───────────────────────────────────────────────────

function buildUKDoc({ name, jobTitle, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle }) {
  const accent = "#1E293B";
  const block  = (title, html) => regionalSection(title, html, { accentColor: accent, borderStyle: `1.5px solid ${accent}` });

  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (t)    => applyPhraseHighlighting(cleanMarkdown(t), boldPhrases);

  const summaryHTML      = h(renderSummary(sections.summary, "font-size:10.5px;line-height:1.6;margin-bottom:5px;color:#222;"));
  const competenciesHTML = h(renderCompetenciesTable(sections.competencies, "font-size:10px;line-height:1.6;color:#222;"));
  const experienceHTML   = cleanMarkdown(renderExperience(parsedExperience, {
    companyStyle: "font-size:11.5px;font-weight:bold;color:#1E293B;margin-bottom:2px;",
    roleColor: "#374151", dateColor: "#666", bulletColor: "#444", textColor: "#333", hFn,
  }));
  const educationHTML    = h(renderEducation(parsedEducation));
  const skillsHTML       = h(renderBulletSection(sections.skills, "font-size:10px;line-height:1.5;color:#333;"));

  const body = [
    summaryHTML.trim()      && block("Professional Profile",   summaryHTML),
    competenciesHTML.trim() && block("Core Competencies",      competenciesHTML),
    experienceHTML.trim()   && block("Professional Experience", experienceHTML),
    educationHTML.trim()    && block("Education",              educationHTML),
    skillsHTML.trim()       && block("Key Skills",             skillsHTML),
  ].filter(Boolean).join("");

  const refsBlock = block("References",
    `<p style="font-size:10px;color:#555;font-style:italic;">Available upon request.</p>`
  );

  const contactLine = renderContactLine(contactParts, " &nbsp;|&nbsp; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0.75in; size: A4; }
    @media print { .print-banner { display: none !important; } body { -webkit-print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${REGIONAL_PRINT_BANNER}
  <div style="max-width:750px;margin:0 auto;padding:0 0.1in;">
    <div style="background:#1E293B;padding:26px 32px;">
      ${name     ? `<div style="font-size:22px;font-weight:bold;color:#fff;letter-spacing:-0.01em;margin-bottom:4px;">${esc(name)}</div>` : ""}
      ${jobTitle ? `<div style="font-size:12px;color:#93c5fd;margin-bottom:10px;">${esc(jobTitle)}</div>` : ""}
      ${contactLine ? `<div style="font-size:10px;color:#94a3b8;line-height:1.8;">${contactLine}</div>` : ""}
      ${relocationLine ? `<div style="font-size:10px;color:#34d399;font-style:italic;margin-top:5px;">${esc(relocationLine)}</div>` : ""}
    </div>
    <div style="display:flex;justify-content:flex-end;padding:6px 0;">
      <span style="font-size:8px;color:#94a3b8;letter-spacing:0.15em;text-transform:uppercase;">Curriculum Vitae</span>
    </div>
    ${body}
    ${refsBlock}
  </div>
</body>
</html>`;
}

// ─── Template: GERMANY (Lebenslauf) ──────────────────────────────────────────

function buildGermanyDoc({ name, jobTitle, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle, avatarUrl, profileData = {}, countryCode = "DE" }) {
  const accent = "#000";
  const today  = new Date().toLocaleDateString("de-DE");

  // Helper: render a table row only if value is non-empty
  const row = (label, value) => {
    if (!value || !value.toString().trim()) return "";
    return `<tr><td style="font-size:10px;color:#555;padding:3px 0;width:180px;">${esc(label)}:</td><td style="font-size:10px;padding:3px 0;">${esc(value.toString())}</td></tr>`;
  };

  // Extract address & phone/email for personal details
  const addressLine  = contactParts.find(p => /,/.test(p) && !/@/.test(p) && !/linkedin/i.test(p)) || "";
  const phoneLine    = contactParts.find(p => /\+/.test(p)) || "";
  const emailLine    = contactParts.find(p => /@/.test(p)) || "";
  const linkedinLine = contactParts.find(p => /linkedin/i.test(p)) || "";

  const block = (title, html) => regionalSection(title, html, { accentColor: accent, borderStyle: "1.5px solid #333" });

  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (t)    => applyPhraseHighlighting(cleanMarkdown(t), boldPhrases);

  const summaryHTML   = h(renderSummary(sections.summary,      "font-size:10px;line-height:1.55;margin-bottom:4px;"));
  const skillsHTML    = h(renderBulletSection(sections.skills, "font-size:10px;line-height:1.5;"));
  const competHTML    = h(renderCompetenciesTable(sections.competencies, "font-size:10px;"));
  const educationHTML = h(renderEducation(parsedEducation));

  // German-style tabular experience: date left | content right
  const experienceRows = parsedExperience.map(({ company, role, date, bullets }) => {
    const bulletsHTML = bullets.length
      ? bullets.map(b => {
          const content = hFn ? hFn(esc(b)) : esc(b);
          return `<div style="display:flex;margin-bottom:3px;"><span style="margin-right:6px;flex-shrink:0;">&bull;</span><span style="font-size:10px;line-height:1.4;">${content}</span></div>`;
        }).join("")
      : "";
    return (
      `<tr style="vertical-align:top;border-bottom:1px solid #f0f0f0;">` +
      `<td style="width:110px;padding:6px 12px 10px 0;font-size:10px;color:#555;white-space:nowrap;flex-shrink:0;">${esc(date)}</td>` +
      `<td style="padding:6px 0 10px;">` +
      (company ? `<div style="font-size:11px;font-weight:bold;color:#000;margin-bottom:1px;">${esc(company)}</div>` : "") +
      (role    ? `<div style="font-size:10px;color:#333;margin-bottom:4px;font-style:italic;">${esc(role)}</div>` : "") +
      bulletsHTML +
      `</td></tr>`
    );
  }).join("");

  const educBlock = parsedEducation.map(group => {
    if (!group.length) return "";
    const uni = group[0];
    const { role: deg, date } = group.length > 1 ? extractRoleDate(group[1]) : { role: "", date: "" };
    return (
      `<tr style="vertical-align:top;border-bottom:1px solid #f0f0f0;">` +
      `<td style="width:110px;padding:6px 12px 10px 0;font-size:10px;color:#555;white-space:nowrap;">${esc(date)}</td>` +
      `<td style="padding:6px 0 10px;">` +
      (deg ? `<div style="font-size:11px;font-weight:bold;">${esc(deg)}</div>` : "") +
      (uni ? `<div style="font-size:10px;color:#555;">${esc(uni)}</div>` : "") +
      `</td></tr>`
    );
  }).join("");

  // Photo block
  const photoBlock = avatarUrl
    ? `<img src="${esc(avatarUrl)}" style="width:105px;height:140px;object-fit:cover;display:block;border:1px solid #ddd;" alt="Bewerbungsfoto" />`
    : `<div style="width:105px;height:140px;border:2px dashed #bbb;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#fafafa;">
        <div style="font-size:8px;color:#999;text-align:center;padding:6px;line-height:1.5;">Bewerbungs&shy;foto</div>
       </div>`;

  // Persönliche Daten — only show rows that have data
  const pdRows = [
    row("Geburtsdatum",      formatDOB(profileData.date_of_birth, countryCode)),
    row("Staatsangehörigkeit", profileData.nationality),
    row("Familienstand",     profileData.marital_status && profileData.marital_status !== "Prefer not to say" ? profileData.marital_status : ""),
    row("Adresse",           addressLine),
  ].join("");
  const persoenlicheDaten = pdRows
    ? `<div style="margin-bottom:18px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #333;padding-bottom:4px;margin-bottom:10px;">Persönliche Daten</div>
        <table style="border-collapse:collapse;width:100%;">${pdRows}</table>
       </div>`
    : "";

  // Sprachen — use profile languages if available, else omit
  const langs = Array.isArray(profileData.languages) ? profileData.languages : [];
  const sprachen = langs.length > 0
    ? `<div style="margin-top:18px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #333;padding-bottom:4px;margin-bottom:8px;">Sprachen</div>
        <div style="font-size:10px;color:#444;line-height:1.8;">
          ${langs.map(l => `<span style="margin-right:18px;"><strong>${esc(l.name)}</strong>: ${esc(l.level)}</span>`).join("")}
        </div>
       </div>`
    : "";

  // Signature city: prefer profileData.signature_city, then first part of addressLine, then blank line
  const sigCity = profileData.signature_city || (addressLine ? addressLine.split(",")[0].trim() : "");

  const bodyHtml = [
    summaryHTML.trim()  && block("Profil", summaryHTML),
    experienceRows      && `<div style="margin-top:18px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #333;padding-bottom:4px;margin-bottom:0;">Berufserfahrung</div><table style="width:100%;border-collapse:collapse;">${experienceRows}</table></div>`,
    educBlock           && `<div style="margin-top:18px;"><div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1.5px solid #333;padding-bottom:4px;margin-bottom:0;">Ausbildung</div><table style="width:100%;border-collapse:collapse;">${educBlock}</table></div>`,
    skillsHTML.trim()   && block("Kenntnisse", skillsHTML),
    competHTML.trim()   && block("Weitere Fähigkeiten", competHTML),
  ].filter(Boolean).join("");

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0.75in; size: A4; }
    @media print { .print-banner { display: none !important; } body { -webkit-print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${REGIONAL_PRINT_BANNER}
  <div style="max-width:750px;margin:0 auto;padding:0 0.1in;">

    <!-- Header row: name/contact left, photo right -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;padding-top:8px;">
      <div style="flex:1;padding-right:20px;">
        <div style="font-size:9px;text-transform:uppercase;letter-spacing:0.15em;color:#555;margin-bottom:8px;">Lebenslauf</div>
        ${name     ? `<div style="font-size:22px;font-weight:bold;color:#000;margin-bottom:4px;">${esc(name)}</div>` : ""}
        ${jobTitle ? `<div style="font-size:12px;color:#333;margin-bottom:10px;">${esc(jobTitle)}</div>` : ""}
        <div style="font-size:10px;color:#555;line-height:1.8;">
          ${addressLine  ? `<div>${esc(addressLine)}</div>`  : ""}
          ${phoneLine    ? `<div>${esc(phoneLine)}</div>`    : ""}
          ${emailLine    ? `<div>${esc(emailLine)}</div>`    : ""}
          ${linkedinLine ? `<div>${esc(linkedinLine)}</div>` : ""}
        </div>
      </div>
      <div style="flex-shrink:0;">${photoBlock}</div>
    </div>

    <hr style="border:none;border-top:2px solid #000;margin-bottom:14px;" />

    ${persoenlicheDaten}

    ${bodyHtml}

    ${sprachen}

    <!-- Signature block -->
    <div style="margin-top:40px;border-top:1px solid #eee;padding-top:20px;">
      <div style="font-size:10px;color:#555;margin-bottom:24px;">${sigCity ? esc(sigCity) + ", den " + today : today}</div>
      <div style="border-bottom:1px solid #555;width:200px;margin-bottom:6px;">&nbsp;</div>
      <div style="font-size:10px;color:#555;">${esc(name)}</div>
    </div>
  </div>
</body>
</html>`;
}

// ─── Template: NETHERLANDS / FINLAND ─────────────────────────────────────────

function buildNLFIDoc({ name, jobTitle, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle, avatarUrl, profileData = {} }) {
  const accent = "#0F5299";
  const block  = (title, html) => regionalSection(title, html, { accentColor: accent, borderStyle: `1.5px solid ${accent}` });

  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (t)    => applyPhraseHighlighting(cleanMarkdown(t), boldPhrases);

  const summaryHTML    = h(renderSummary(sections.summary,   "font-size:10.5px;line-height:1.6;margin-bottom:5px;color:#222;"));
  const competHTML     = h(renderCompetenciesTable(sections.competencies, "font-size:10px;line-height:1.6;"));
  const experienceHTML = cleanMarkdown(renderExperience(parsedExperience, {
    companyStyle: "font-size:11.5px;font-weight:bold;color:#000;margin-bottom:2px;",
    roleColor: "#0F5299", dateColor: "#666", bulletColor: "#444", textColor: "#333", hFn,
  }));
  const educationHTML  = h(renderEducation(parsedEducation));
  const skillsHTML     = h(renderBulletSection(sections.skills, "font-size:10px;line-height:1.5;"));

  const body = [
    summaryHTML.trim()    && block("Professional Summary", summaryHTML),
    competHTML.trim()     && block("Core Competencies",    competHTML),
    experienceHTML.trim() && block("Work Experience",      experienceHTML),
    educationHTML.trim()  && block("Education",            educationHTML),
    skillsHTML.trim()     && block("Skills",               skillsHTML),
  ].filter(Boolean).join("");

  // Build referee cells — show real data if available, placeholder card if not
  function refCell(n) {
    const nm  = profileData[`referee_${n}_name`];
    const ttl = profileData[`referee_${n}_title`];
    const co  = profileData[`referee_${n}_company`];
    const em  = profileData[`referee_${n}_email`];
    const ph  = profileData[`referee_${n}_phone`];
    if (!nm) return null;
    const lines = [
      nm  ? `<div style="font-weight:bold;font-size:10.5px;margin-bottom:3px;">${esc(nm)}</div>` : "",
      ttl ? `<div>${esc(ttl)}</div>` : "",
      co  ? `<div>${esc(co)}</div>` : "",
      em  ? `<div>${esc(em)}</div>` : "",
      ph  ? `<div>${esc(ph)}</div>` : "",
    ].filter(Boolean).join("");
    return `<td style="padding:4px 20px 4px 0;vertical-align:top;font-size:10px;color:#333;line-height:1.7;">${lines}</td>`;
  }

  const r1 = refCell(1);
  const r2 = refCell(2);
  const refsBlock = (r1 || r2)
    ? block("References",
        `<table style="width:100%;border-collapse:collapse;">
          <tr>${r1 || ""}${r2 || ""}</tr>
         </table>`)
    : "";

  const photoBlock = avatarUrl
    ? `<img src="${esc(avatarUrl)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:2px solid #ddd;" alt="Profile" />`
    : "";

  const headerRight = photoBlock
    ? `<div style="flex-shrink:0;margin-left:20px;">${photoBlock}</div>`
    : "";

  const contactLine = renderContactLine(contactParts, " &nbsp;&middot;&nbsp; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0.75in; size: A4; }
    @media print { .print-banner { display: none !important; } body { -webkit-print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${REGIONAL_PRINT_BANNER}
  <div style="max-width:750px;margin:0 auto;padding:0 0.1in;">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:20px 0 14px;border-bottom:3px solid ${accent};margin-bottom:4px;">
      <div style="flex:1;">
        ${name     ? `<div style="font-size:22px;font-weight:bold;color:#0F172A;margin-bottom:3px;">${esc(name)}</div>` : ""}
        ${jobTitle ? `<div style="font-size:12px;color:${accent};margin-bottom:6px;">${esc(jobTitle)}</div>` : ""}
        ${contactLine ? `<div style="font-size:10px;color:#555;line-height:1.7;">${contactLine}</div>` : ""}
        ${relocationLine ? `<div style="font-size:10px;color:#16a34a;font-style:italic;margin-top:4px;">${esc(relocationLine)}</div>` : ""}
      </div>
      ${headerRight}
    </div>
    ${body}
    ${refsBlock}
  </div>
</body>
</html>`;
}

// ─── Template: SINGAPORE ─────────────────────────────────────────────────────

function buildSingaporeDoc({ name, jobTitle, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle, avatarUrl, profileData = {}, countryCode = "SG" }) {
  const accent = "#1a56a0";
  const block  = (title, html) => regionalSection(title, html, { accentColor: accent, borderStyle: `1.5px solid ${accent}` });

  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (t)    => applyPhraseHighlighting(cleanMarkdown(t), boldPhrases);

  const summaryHTML    = h(renderSummary(sections.summary,   "font-size:10.5px;line-height:1.6;margin-bottom:4px;color:#222;"));
  const competHTML     = h(renderCompetenciesTable(sections.competencies, "font-size:10px;"));
  const experienceHTML = cleanMarkdown(renderExperience(parsedExperience, {
    companyStyle: "font-size:11.5px;font-weight:bold;color:#000;margin-bottom:2px;",
    roleColor: accent, dateColor: "#666", bulletColor: "#444", textColor: "#333", hFn,
  }));
  const educationHTML  = h(renderEducation(parsedEducation));
  const skillsHTML     = h(renderBulletSection(sections.skills, "font-size:10px;line-height:1.5;"));

  const body = [
    summaryHTML.trim()    && block("Professional Summary",    summaryHTML),
    competHTML.trim()     && block("Core Competencies",       competHTML),
    experienceHTML.trim() && block("Work Experience",         experienceHTML),
    educationHTML.trim()  && block("Education",               educationHTML),
    skillsHTML.trim()     && block("Skills &amp; Competencies", skillsHTML),
  ].filter(Boolean).join("");

  const photoBlock = avatarUrl
    ? `<img src="${esc(avatarUrl)}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:2px solid #ddd;" alt="Profile" />`
    : `<div style="width:90px;height:90px;border:2px dashed #ccc;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#f8f8f8;"><span style="font-size:9px;color:#aaa;text-align:center;padding:6px;">Photo</span></div>`;

  const contactLine = renderContactLine(contactParts, " &nbsp;|&nbsp; ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0.75in; size: A4; }
    @media print { .print-banner { display: none !important; } body { -webkit-print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${REGIONAL_PRINT_BANNER}
  <div style="max-width:750px;margin:0 auto;padding:0 0.1in;">

    <!-- Header: name left, photo right -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid ${accent};margin-bottom:14px;">
      <div style="flex:1;padding-right:20px;padding-top:6px;">
        ${name     ? `<div style="font-size:22px;font-weight:bold;color:#0F172A;margin-bottom:3px;">${esc(name)}</div>` : ""}
        ${jobTitle ? `<div style="font-size:12px;color:${accent};margin-bottom:8px;">${esc(jobTitle)}</div>` : ""}
        ${contactLine ? `<div style="font-size:10px;color:#555;line-height:1.8;">${contactLine}</div>` : ""}
        ${relocationLine ? `<div style="font-size:10px;color:#16a34a;font-style:italic;margin-top:4px;">${esc(relocationLine)}</div>` : ""}
      </div>
      <div style="flex-shrink:0;">${photoBlock}</div>
    </div>

    ${(() => {
      const nat  = profileData.nationality;
      const dob  = formatDOB(profileData.date_of_birth, countryCode);
      const visa = profileData.visa_status;
      if (!nat && !dob && !visa) return "";
      const td = (label, val) => val
        ? `<tr><td style="padding:3px 0;color:#555;width:160px;font-size:10px;">${esc(label)}:</td><td style="padding:3px 0;font-size:10px;font-weight:500;" colspan="3">${esc(val)}</td></tr>`
        : "";
      return `<div style="margin-bottom:14px;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${accent};margin-bottom:8px;">Personal Particulars</div>
        <table style="width:100%;border-collapse:collapse;">
          ${td("Nationality", nat)}
          ${td("Date of Birth", dob)}
          ${td("Work Pass / PR Status", visa)}
        </table>
      </div>`;
    })()}

    ${body}
  </div>
</body>
</html>`;
}

// ─── Template: AUSTRALIA / NEW ZEALAND ───────────────────────────────────────

function buildAusNZDoc({ name, jobTitle, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle, profileData = {} }) {
  const accent = "#1d4ed8";
  const block  = (title, html) => regionalSection(title, html, { accentColor: accent, borderStyle: `1.5px solid ${accent}` });

  const used = new Set();
  const h    = (html) => highlight(html, boldPhrases, used);
  const hFn  = (t)    => applyPhraseHighlighting(cleanMarkdown(t), boldPhrases);

  const summaryHTML    = h(renderSummary(sections.summary,   "font-size:10.5px;line-height:1.6;margin-bottom:5px;color:#222;"));
  const competHTML     = h(renderCompetenciesTable(sections.competencies, "font-size:10px;line-height:1.6;"));
  const experienceHTML = cleanMarkdown(renderExperience(parsedExperience, {
    companyStyle: "font-size:11.5px;font-weight:bold;color:#000;margin-bottom:2px;",
    roleColor: accent, dateColor: "#666", bulletColor: "#444", textColor: "#333", hFn,
  }));
  const educationHTML  = h(renderEducation(parsedEducation));
  const skillsHTML     = h(renderBulletSection(sections.skills, "font-size:10px;line-height:1.5;"));

  const body = [
    summaryHTML.trim()    && block("Professional Summary",   summaryHTML),
    competHTML.trim()     && block("Key Competencies",       competHTML),
    experienceHTML.trim() && block("Work Experience",        experienceHTML),
    educationHTML.trim()  && block("Education",              educationHTML),
    skillsHTML.trim()     && block("Skills",                 skillsHTML),
  ].filter(Boolean).join("");

  // Build a referee card — real data if available, blank placeholder if name missing
  function refCard(n) {
    const nm  = profileData[`referee_${n}_name`];
    const ttl = profileData[`referee_${n}_title`];
    const co  = profileData[`referee_${n}_company`];
    const ph  = profileData[`referee_${n}_phone`];
    const em  = profileData[`referee_${n}_email`];
    const rel = profileData[`referee_${n}_relationship`];

    if (nm) {
      // Filled card
      const line = (label, val) => val
        ? `<div><span style="color:#888;">${esc(label)}:</span> ${esc(val)}</div>`
        : "";
      return `<div style="flex:1;padding:10px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;min-width:0;">
        <div style="font-size:10px;font-weight:700;color:${accent};margin-bottom:6px;">Referee ${n}</div>
        <div style="font-size:10px;color:#333;line-height:1.8;">
          <div style="font-weight:bold;margin-bottom:2px;">${esc(nm)}</div>
          ${line("Title",        ttl)}
          ${line("Company",      co)}
          ${line("Phone",        ph)}
          ${line("Email",        em)}
          ${line("Relationship", rel)}
        </div>
      </div>`;
    }
    // Blank placeholder card
    return `<div style="flex:1;padding:10px 14px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;min-width:0;">
      <div style="font-size:10px;font-weight:700;color:${accent};margin-bottom:6px;">Referee ${n}</div>
      <div style="font-size:10px;color:#94a3b8;line-height:1.9;">
        <div>Name: <span style="border-bottom:1px solid #cbd5e1;display:inline-block;min-width:130px;">&nbsp;</span></div>
        <div>Title: <span style="border-bottom:1px solid #cbd5e1;display:inline-block;min-width:130px;">&nbsp;</span></div>
        <div>Company: <span style="border-bottom:1px solid #cbd5e1;display:inline-block;min-width:110px;">&nbsp;</span></div>
        <div>Phone: <span style="border-bottom:1px solid #cbd5e1;display:inline-block;min-width:118px;">&nbsp;</span></div>
        <div>Email: <span style="border-bottom:1px solid #cbd5e1;display:inline-block;min-width:120px;">&nbsp;</span></div>
      </div>
    </div>`;
  }

  const refsBlock = block("References",
    `<div style="display:flex;gap:16px;margin-bottom:10px;">${refCard(1)}${refCard(2)}</div>
     <p style="font-size:9px;color:#888;font-style:italic;">Referees should ideally be direct managers or senior colleagues from recent roles.</p>`
  );

  const contactLine = renderContactLine(contactParts, " &nbsp;&middot;&nbsp; ");

  // Work rights / visa status badge
  const visaBadge = profileData.visa_status
    ? `<div style="display:inline-flex;align-items:center;gap:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:3px;padding:3px 9px;margin-top:4px;">
        <span style="font-size:10px;color:${accent};font-weight:600;">Work Rights / Visa:</span>
        <span style="font-size:10px;color:#1e40af;font-weight:500;">${esc(profileData.visa_status)}</span>
       </div>`
    : `<div style="display:inline-flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:3px;padding:3px 9px;margin-top:4px;">
        <span style="font-size:10px;color:#64748b;">Work Rights / Visa Status:</span>
        <span style="font-size:10px;color:#94a3b8;border-bottom:1px solid #cbd5e1;min-width:120px;display:inline-block;">&nbsp;</span>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${esc(fileTitle)}</title>
  <style>
    @page { margin: 0.75in; size: A4; }
    @media print { .print-banner { display: none !important; } body { -webkit-print-color-adjust: exact; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #fff; color: #111; font-family: Arial, sans-serif; }
  </style>
</head>
<body>
  ${REGIONAL_PRINT_BANNER}
  <div style="max-width:750px;margin:0 auto;padding:0 0.1in;">
    <div style="padding:22px 0 16px;border-bottom:3px solid ${accent};margin-bottom:4px;">
      ${name     ? `<div style="font-size:22px;font-weight:bold;color:#0F172A;margin-bottom:3px;">${esc(name)}</div>` : ""}
      ${jobTitle ? `<div style="font-size:12px;color:${accent};margin-bottom:8px;">${esc(jobTitle)}</div>` : ""}
      ${contactLine ? `<div style="font-size:10px;color:#555;line-height:1.8;margin-bottom:4px;">${contactLine}</div>` : ""}
      ${visaBadge}
      ${relocationLine ? `<div style="font-size:10px;color:#16a34a;font-style:italic;margin-top:5px;">${esc(relocationLine)}</div>` : ""}
    </div>
    ${body}
    ${refsBlock}
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateResumeHTML(resumeText, profileLocation = "", boldPhrases = [], template = "classic", jobTitleOverride = "", countryCode = "GLOBAL", countryName = "", docType = "", avatarUrl = "", profileData = {}) {
  // Clean AI-introduced corruptions before any parsing
  const cleanedText = cleanResumeText(resumeText);
  const sections = splitSections(cleanedText);

  // Parse header
  const { name, jobTitle: parsedJobTitle, contactParts: rawContactParts, relocationLine } = parseHeader(sections.header);

  // Apply profileLocation override for city
  const cityRegex = /^[A-Za-z][A-Za-z\s]+,\s*[A-Za-z]/;
  const contactParts = profileLocation
    ? [profileLocation, ...rawContactParts.filter(p => !cityRegex.test(p))]
    : rawContactParts;

  // Inline contact HTML (for Classic — with | separators and LinkedIn hyperlinks)
  const inlineContactHTML = contactParts.map((item, idx) => {
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

  // Pre-parse experience + education (shared across all templates)
  const parsedExperience = parseExperience(sections.experience);
  const parsedEducation  = parseEducation(sections.education);

  // Build the file title used as the <title> tag (determines PDF filename in browser)
  const jobTitle    = parsedJobTitle;
  const titleSlug   = (jobTitleOverride || jobTitle).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
  const nameSlug    = name.replace(/\s+/g, "");
  const tplLabel    = template.charAt(0).toUpperCase() + template.slice(1);
  const fileTitle   = [nameSlug, titleSlug, tplLabel].filter(Boolean).join("_") || "Resume";

  const args = { name, jobTitle, inlineContactHTML, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle, avatarUrl, profileData, countryCode };

  const REGIONAL_CODES = ["GB", "IE", "DE", "NL", "FI", "SG", "AU", "NZ"];
  let html;
  if (countryCode === "GB" || countryCode === "IE") {
    html = buildUKDoc(args);
  } else if (countryCode === "DE") {
    html = buildGermanyDoc({ ...args, avatarUrl, profileData });
  } else if (countryCode === "NL" || countryCode === "FI") {
    html = buildNLFIDoc({ ...args, avatarUrl, profileData });
  } else if (countryCode === "SG") {
    html = buildSingaporeDoc({ ...args, avatarUrl, profileData });
  } else if (countryCode === "AU" || countryCode === "NZ") {
    html = buildAusNZDoc({ ...args, profileData });
  } else {
    if (template === "modern")         html = buildModernDoc(args);
    else if (template === "executive") html = buildExecutiveDoc(args);
    else                               html = buildClassicDoc(args);
  }

  // Inject subtle country format note only for non-regional templates
  if (!REGIONAL_CODES.includes(countryCode) && countryCode && countryCode !== "GLOBAL" && countryName) {
    const footerNote = `<p style="text-align:center;font-size:9px;color:#999;margin-top:20px;font-family:Arial,sans-serif;font-style:italic;">Formatted for ${countryName} · ${docType || "CV"}</p>`;
    html = html.replace("</body>", footerNote + "\n</body>");
  }

  return html;
}
