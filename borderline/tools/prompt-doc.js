// Word-document building blocks shared by the prompt documents (docx-js).
const { Document, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, LevelFormat, AlignmentType, Footer, PageNumber, PageBreak } = require('docx');

const FONT = 'Arial';
const INK = '2A2620', RED = '8A2A22', MUTED = '6A6050', PAPER = 'F2ECDD', LINE = 'C9BFA6';
const p = (text, opts = {}) => new Paragraph({ spacing: { after: 120 }, ...opts, children: [].concat(text).map(t => (typeof t === 'string' ? new TextRun(t) : t)) });
const b = t => new TextRun({ text: t, bold: true });
const h1 = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const h2 = t => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const bullet = (text) => new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 }, children: [].concat(text).map(t => (typeof t === 'string' ? new TextRun(t) : t)) });

const CONTENT_W = 9360; // US Letter with 1" margins
const border = { style: BorderStyle.SINGLE, size: 4, color: LINE };
const borders = { top: border, bottom: border, left: border, right: border };
function table(headers, rows, widths) {
  const cell = (text, w, head) => new TableCell({
    borders, width: { size: w, type: WidthType.DXA },
    shading: head ? { fill: 'E6DCC3', type: ShadingType.CLEAR } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: head, size: 18 })] })],
  });
  return new Table({
    width: { size: CONTENT_W, type: WidthType.DXA }, columnWidths: widths,
    rows: [new TableRow({ tableHeader: true, children: headers.map((h, i) => cell(h, widths[i], true)) }),
      ...rows.map(r => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, widths[i], false)) }))],
  });
}


// one character: name line, details, role, the full prompt in a shaded box
function character(c, n, style) {
  const box = { style: BorderStyle.SINGLE, size: 6, color: LINE, space: 6 };
  return [
    new Paragraph({ keepNext: true, spacing: { before: 240, after: 60 }, children: [new TextRun({ text: `${n}. ${c.name}`, bold: true, size: 26, color: RED })] }),
    new Paragraph({ keepNext: true, spacing: { after: 60 }, children: [new TextRun({ text: c.meta, color: MUTED }), new TextRun({ text: '   File: ', color: MUTED }), new TextRun({ text: c.file, bold: true, font: 'Courier New', size: 19 })] }),
    new Paragraph({ keepNext: true, spacing: { after: 100 }, children: [new TextRun({ text: c.role, italics: true })] }),
    new Paragraph({ keepNext: true, spacing: { after: 40 }, children: [new TextRun({ text: 'PROMPT', bold: true, size: 16, color: MUTED })] }),
    new Paragraph({
      spacing: { after: 160 }, keepLines: true, shading: { fill: PAPER, type: ShadingType.CLEAR },
      border: { top: box, bottom: box, left: box, right: box },
      children: [new TextRun({ text: `${c.prompt} ${style}`, size: 20 })],
    }),
  ];
}


const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

function makeDocument({ title, footer, children }) {
  return new Document({
  creator: 'BORDERLINE', title,
  styles: {
    default: { document: { run: { font: FONT, size: 21, color: INK } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 34, bold: true, font: FONT, color: RED }, paragraph: { spacing: { before: 120, after: 200 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 26, bold: true, font: FONT, color: INK }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] }] },
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: `${footer} · page `, size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED })] })] }) },
    children,
  }],
});
}

module.exports = { FONT, INK, RED, MUTED, PAPER, LINE, p, b, h1, h2, bullet, table, character, pageBreak, makeDocument, Paragraph, TextRun, ShadingType };
