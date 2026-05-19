/* Build AI_Time_Meter_Proposal.docx from AI_Time_Meter_Proposal.md.
   Hand-rolled markdown→docx for the structures we used:
   #/##/### headings, **bold**, *italic*, - bullets, | tables |, ---, prose. */
const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, LevelFormat, PageOrientation,
  Table, TableRow, TableCell, BorderStyle, WidthType, ShadingType,
  TabStopType, TabStopPosition,
  ImageRun,
} = require('docx');

const SCREENSHOT_DIR = '/Users/admin/Downloads/scope-creator-ai/.claude/worktrees/great-banach/docs/extracted/AI_Time_Meter_screens';
const SCREENSHOT_RE = /^!\[\[screenshot:([^|\]]+)\|([^\]]+)\]\]$/;

const NAVY = '0A2463';
const GOLD = '8A6B1F';
const SLATE = '6B7885';
const ICE  = 'F0F3F6';
const HEADER_FILL = '1F3864';

const MD_PATH  = '/Users/admin/Downloads/scope-creator-ai/.claude/worktrees/great-banach/docs/extracted/AI_Time_Meter_Proposal.md';
const OUT_PRIMARY = '/Users/admin/Downloads/scope-creator-ai/.claude/worktrees/great-banach/docs/extracted/AI_Time_Meter_Proposal.docx';
const OUT_DESKTOP = '/Users/admin/Desktop/AI_Time_Meter_Proposal.docx';

const md = fs.readFileSync(MD_PATH, 'utf8');

/* Inline parser — splits a string into TextRun[] handling **bold** and *italic*.
   Order matters: detect ** before *. */
function inlineRuns(str) {
  const out = [];
  let i = 0;
  while (i < str.length) {
    if (str.startsWith('**', i)) {
      const close = str.indexOf('**', i + 2);
      if (close > -1) {
        out.push(new TextRun({ text: str.slice(i + 2, close), bold: true }));
        i = close + 2;
        continue;
      }
    }
    if (str[i] === '*') {
      const close = str.indexOf('*', i + 1);
      if (close > -1) {
        out.push(new TextRun({ text: str.slice(i + 1, close), italics: true }));
        i = close + 1;
        continue;
      }
    }
    if (str[i] === '`') {
      const close = str.indexOf('`', i + 1);
      if (close > -1) {
        out.push(new TextRun({ text: str.slice(i + 1, close), font: 'Consolas' }));
        i = close + 1;
        continue;
      }
    }
    // plain run until next special
    let j = i;
    while (j < str.length && str[j] !== '*' && str[j] !== '`') j++;
    if (j > i) out.push(new TextRun({ text: str.slice(i, j) }));
    if (j === i) { out.push(new TextRun({ text: str[i] })); j = i + 1; }
    i = j;
  }
  return out;
}

/* Parse the markdown into a list of block tokens: { kind, ... }. */
function tokenize(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    // table block — line starts with `|`, next line is `|---|---|`
    if (line.startsWith('|') && i + 1 < lines.length && /^\|[\s|:-]+\|$/.test(lines[i + 1].trim())) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i]);
        i++;
      }
      const header = rows[0];
      const dataRows = rows.slice(2); // skip header + separator
      const headerCells = splitRow(header);
      const bodyCells = dataRows.map(splitRow);
      out.push({ kind: 'table', header: headerCells, body: bodyCells });
      continue;
    }
    if (line.startsWith('# ')) { out.push({ kind: 'h1', text: line.slice(2).trim() }); i++; continue; }
    if (line.startsWith('## ')) { out.push({ kind: 'h2', text: line.slice(3).trim() }); i++; continue; }
    if (line.startsWith('### ')) { out.push({ kind: 'h3', text: line.slice(4).trim() }); i++; continue; }
    if (line.startsWith('#### ')) { out.push({ kind: 'h4', text: line.slice(5).trim() }); i++; continue; }
    if (line.trim() === '---') { out.push({ kind: 'hr' }); i++; continue; }
    {
      const m = line.match(SCREENSHOT_RE);
      if (m) {
        out.push({ kind: 'screenshot', file: m[1], caption: m[2] });
        i++;
        continue;
      }
    }
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        let item = lines[i].slice(2);
        i++;
        // continuation lines (indent or wrap) — usually plain
        while (i < lines.length && lines[i].startsWith('  ') && !lines[i].startsWith('  - ')) {
          item += ' ' + lines[i].trim();
          i++;
        }
        items.push(item);
      }
      out.push({ kind: 'ul', items });
      continue;
    }
    if (line.trim() === '') { out.push({ kind: 'blank' }); i++; continue; }
    // paragraph: gather contiguous non-empty, non-special lines
    const paraLines = [];
    while (i < lines.length && lines[i].trim() !== ''
           && !lines[i].startsWith('#') && !lines[i].startsWith('- ')
           && !lines[i].startsWith('|') && lines[i].trim() !== '---') {
      paraLines.push(lines[i]);
      i++;
    }
    out.push({ kind: 'p', text: paraLines.join(' ') });
  }
  return out;
}

function splitRow(line) {
  return line.split('|').slice(1, -1).map(c => c.trim());
}

const TOKENS = tokenize(md);

/* Emit docx-js paragraphs for the tokens. */
const children = [];

const border = { style: BorderStyle.SINGLE, size: 4, color: 'B0B7C0' };
const cellBorders = { top: border, bottom: border, left: border, right: border };

function tablePara(tok) {
  const ncols = tok.header.length;
  const tableWidth = 9360; // US Letter content width
  const colWidth = Math.floor(tableWidth / ncols);
  const colWidths = new Array(ncols).fill(colWidth);

  function makeRow(cells, isHeader) {
    return new TableRow({
      children: cells.map((cellText, idx) => new TableCell({
        borders: cellBorders,
        width: { size: colWidths[idx], type: WidthType.DXA },
        shading: isHeader ? { fill: HEADER_FILL, type: ShadingType.CLEAR, color: 'auto' } : undefined,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          spacing: { before: 0, after: 0 },
          children: isHeader
            ? [new TextRun({ text: cellText, bold: true, color: 'FFFFFF', size: 20, font: 'Arial' })]
            : inlineRuns(cellText),
        })],
      })),
    });
  }
  return new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [makeRow(tok.header, true), ...tok.body.map(r => makeRow(r, false))],
  });
}

let listSeq = 0;

for (let idx = 0; idx < TOKENS.length; idx++) {
  const tok = TOKENS[idx];
  switch (tok.kind) {
    case 'h1':
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 360, after: 200 },
        children: [new TextRun({ text: tok.text, bold: true, size: 36, color: NAVY, font: 'Arial' })],
      }));
      break;
    case 'h2':
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 320, after: 160 },
        children: [new TextRun({ text: tok.text, bold: true, size: 28, color: NAVY, font: 'Arial' })],
      }));
      break;
    case 'h3':
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: tok.text, bold: true, size: 22, color: NAVY, font: 'Arial' })],
      }));
      break;
    case 'h4':
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 180, after: 100 },
        children: [new TextRun({ text: tok.text, bold: true, size: 20, color: NAVY, font: 'Arial' })],
      }));
      break;
    case 'p':
      children.push(new Paragraph({
        spacing: { before: 100, after: 100, line: 320 },
        children: inlineRuns(tok.text),
      }));
      break;
    case 'ul':
      for (const item of tok.items) {
        children.push(new Paragraph({
          numbering: { reference: 'bullets', level: 0 },
          spacing: { before: 40, after: 40, line: 300 },
          children: inlineRuns(item),
        }));
      }
      break;
    case 'hr':
      children.push(new Paragraph({
        spacing: { before: 120, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'C9CDD3', space: 1 } },
        children: [new TextRun({ text: '' })],
      }));
      break;
    case 'table':
      children.push(tablePara(tok));
      children.push(new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: '' })] }));
      break;
    case 'screenshot': {
      const fp = path.join(SCREENSHOT_DIR, tok.file);
      if (!fs.existsSync(fp)) {
        children.push(new Paragraph({
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: `[missing screenshot: ${tok.file}]`, italics: true, color: SLATE })],
        }));
        break;
      }
      const ext = path.extname(fp).slice(1).toLowerCase();
      const buf = fs.readFileSync(fp);
      // Source is 2880x1706 retina. Render at 600x355 px (preserves aspect).
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 80 },
        children: [new ImageRun({
          type: ext === 'jpg' ? 'jpeg' : ext,
          data: buf,
          transformation: { width: 600, height: 355 },
          altText: { title: tok.caption.slice(0, 60), description: tok.caption, name: tok.file },
        })],
      }));
      // Caption — italic, centered, slate
      children.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 200 },
        children: [new TextRun({ text: tok.caption, italics: true, color: SLATE, size: 18 })],
      }));
      break;
    }
    case 'blank':
      // collapse — paragraph spacing handles it
      break;
  }
}

const doc = new Document({
  creator: 'YourAI / Arjun Sharma',
  title: 'AI-Time Meter — Proposal',
  description: 'Proposal and design reference for the YourAI AI-time meter.',
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 36, bold: true, color: NAVY },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 28, bold: true, color: NAVY },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 22, bold: true, color: NAVY },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
      { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 20, bold: true, color: NAVY },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 3 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '•',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } },
        }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT_PRIMARY, buf);
  fs.writeFileSync(OUT_DESKTOP, buf);
  console.log('Wrote', OUT_PRIMARY, '(' + buf.length + ' bytes)');
  console.log('Wrote', OUT_DESKTOP);
}).catch(err => { console.error(err); process.exit(1); });
