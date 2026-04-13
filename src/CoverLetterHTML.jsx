// src/CoverLetterHTML.jsx
// Converts plain-text cover letter into a complete HTML string for browser preview + print-to-PDF.

function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Convert plain text (double-newline-separated paragraphs) to HTML paragraphs.
// Single newlines within a paragraph become <br> tags.
function textToHTML(text) {
  return text
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => {
      const inner = para
        .split("\n")
        .map(line => esc(line))
        .join("<br>");
      return `<p style="margin:0 0 16px 0;">${inner}</p>`;
    })
    .join("");
}

export function generateCoverLetterHTML(coverLetterText, candidateName = "") {
  const title = candidateName
    ? `${esc(candidateName)} \u2013 Cover Letter`
    : "Cover Letter";

  const bodyHTML = textToHTML(coverLetterText);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @page { margin: 1in; size: Letter; }
    @media print {
      .print-banner { display: none !important; }
      @page { margin: 1in; }
      body { -webkit-print-color-adjust: exact; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #fff;
      color: #111;
      font-family: Georgia, "Times New Roman", serif;
      font-size: 12px;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="print-banner" style="
    background: #EBF5FF;
    border: 1px solid #3B82F6;
    border-radius: 6px;
    padding: 12px 20px;
    font-family: Arial, sans-serif;
    font-size: 13px;
    color: #1E40AF;
    margin: 16px auto;
    max-width: 750px;
  ">
    <div style="font-weight: bold; margin-bottom: 6px;">&#128196; To download as PDF (Chrome recommended):</div>
    <ol style="margin: 0; padding-left: 20px; line-height: 1.8;">
      <li>Press <strong>Cmd+P</strong> (Mac) or <strong>Ctrl+P</strong> (Windows)</li>
      <li>Set <strong>Destination</strong> &rarr; <strong>Save as PDF</strong></li>
      <li>Click <strong>More Settings</strong></li>
      <li>Turn <strong>OFF</strong> &ldquo;Headers and Footers&rdquo; &larr; <em>important</em></li>
      <li>Set <strong>Margins</strong> &rarr; <strong>None</strong></li>
      <li>Click <strong>Save</strong></li>
    </ol>
  </div>

  <div style="
    max-width: 750px;
    margin: 0 auto;
    padding: 0.6in;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 12px;
    line-height: 1.8;
    color: #111;
  ">
    ${bodyHTML}
  </div>
</body>
</html>`;
}
