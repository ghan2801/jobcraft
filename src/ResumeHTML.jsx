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
    `<span style="display:inline-block;background:rgba(0,229,160,0.12);color:#00E5A0;` +
    `border:1px solid rgba(0,229,160,0.25);border-radius:3px;padding:2px 5px;` +
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
    ${relocationLine ? `<div style="font-size:11px;color:#059669;font-style:italic;font-weight:500;margin-bottom:14px;">${esc(relocationLine)}</div>` : ""}
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
    `<div style="font-size:8px;font-weight:700;text-transform:uppercase;color:#00E5A0;` +
    `letter-spacing:0.1em;margin-bottom:6px;">${esc(title)}</div>` +
    innerHTML +
    `</div>`;

  const mainSection = (title, innerHTML) =>
    `<div style="margin-top:14px;">` +
    `<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#00E5A0;` +
    `letter-spacing:0.1em;margin-bottom:6px;">${esc(title)}</div>` +
    innerHTML +
    `</div>`;

  const skillsContent       = renderSidebarSkills(sections.skills);
  const competenciesContent = renderSidebarList(sections.competencies);

  const sidebarHTML =
    (name     ? `<div style="font-size:16px;font-weight:bold;color:#fff;font-family:Arial,sans-serif;line-height:1.3;margin-bottom:3px;">${esc(name)}</div>` : "") +
    (jobTitle ? `<div style="font-size:10px;color:#00E5A0;font-family:Arial,sans-serif;margin-bottom:10px;">${esc(jobTitle)}</div>` : "") +
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
    roleColor:    "#00E5A0",
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
    `<div style="width:3px;height:14px;background:#00E5A0;border-radius:1px;flex-shrink:0;"></div>` +
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
    roleColor:    "#00E5A0",
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
    ${jobTitle ? `<div style="font-size:14px;color:#00E5A0;font-family:Arial,sans-serif;margin-bottom:8px;">${esc(jobTitle)}</div>` : ""}
    ${contactLine ? `<div style="font-size:11px;color:#94a3b8;font-family:Arial,sans-serif;">${esc(contactLine)}</div>` : ""}
    ${relocationLine ? `<div style="font-size:11px;color:#34d399;font-style:italic;font-weight:500;margin-top:5px;">${esc(relocationLine)}</div>` : ""}
  </div>
  <div style="padding:0.3in 0.75in 0.5in;">
    ${body}
  </div>
</body>
</html>`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function generateResumeHTML(resumeText, profileLocation = "", boldPhrases = [], template = "classic", jobTitleOverride = "") {
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

  const args = { name, jobTitle, inlineContactHTML, contactParts, relocationLine, sections, parsedExperience, parsedEducation, boldPhrases, fileTitle };

  if (template === "modern")    return buildModernDoc(args);
  if (template === "executive") return buildExecutiveDoc(args);
  return buildClassicDoc(args);
}
