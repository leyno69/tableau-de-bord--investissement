function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${field} doit être une chaîne non vide.`);
  }
  return value.trim();
}

function safeText(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '?')
    .replace(/([\\()])/g, '\\$1');
}

function normalizeSections(sections) {
  if (!Array.isArray(sections) || sections.length === 0) {
    throw new TypeError('sections doit contenir au moins une section.');
  }
  return sections.map((section, sectionIndex) => {
    const title = requiredText(section?.title, `sections[${sectionIndex}].title`);
    if (!Array.isArray(section?.lines) || section.lines.length === 0) {
      throw new TypeError(`sections[${sectionIndex}].lines doit contenir au moins une ligne.`);
    }
    return Object.freeze({
      title,
      lines: Object.freeze(section.lines.map((line, lineIndex) => requiredText(line, `sections[${sectionIndex}].lines[${lineIndex}]`)))
    });
  });
}

export function createPremiumReport({ title, generatedAt, methodology, sections, assumptions = [], limitations = [] }) {
  const report = {
    title: requiredText(title, 'title'),
    generatedAt: requiredText(generatedAt, 'generatedAt'),
    methodology: requiredText(methodology, 'methodology'),
    sections: Object.freeze(normalizeSections(sections)),
    assumptions: Object.freeze(assumptions.map((value, index) => requiredText(value, `assumptions[${index}]`))),
    limitations: Object.freeze(limitations.map((value, index) => requiredText(value, `limitations[${index}]`)))
  };
  return Object.freeze(report);
}

function reportLines(report) {
  const lines = [report.title, `Date : ${report.generatedAt}`, '', 'Méthodologie', report.methodology, ''];
  for (const section of report.sections) {
    lines.push(section.title, ...section.lines.map(line => `- ${line}`), '');
  }
  if (report.assumptions.length) lines.push('Hypothèses', ...report.assumptions.map(line => `- ${line}`), '');
  if (report.limitations.length) lines.push('Limites', ...report.limitations.map(line => `- ${line}`), '');
  lines.push('LEYNOR AI compare des scénarios et ne prédit pas les rendements futurs.');
  return lines;
}

function pageContent(lines) {
  const commands = ['BT', '/F1 11 Tf', '50 790 Td', '14 TL'];
  lines.forEach((line, index) => {
    if (index > 0) commands.push('T*');
    commands.push(`(${safeText(line)}) Tj`);
  });
  commands.push('ET');
  return commands.join('\n');
}

export function buildPremiumPdf(reportInput) {
  const report = createPremiumReport(reportInput);
  const allLines = reportLines(report);
  const chunks = [];
  for (let index = 0; index < allLines.length; index += 48) chunks.push(allLines.slice(index, index + 48));

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  const pageIds = chunks.map((_, index) => 4 + index * 2);
  objects.push(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] >>`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  chunks.forEach((lines, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`);
    const stream = pageContent(lines);
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10, '0')} 00000 n \n`; });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

export function downloadPremiumPdf(report, filename = 'rapport-leynor-ai.pdf', environment = globalThis) {
  const bytes = buildPremiumPdf(report);
  if (!environment.Blob || !environment.URL?.createObjectURL || !environment.document?.createElement) {
    throw new Error('Le téléchargement PDF n’est pas disponible dans cet environnement.');
  }
  const blob = new environment.Blob([bytes], { type: 'application/pdf' });
  const url = environment.URL.createObjectURL(blob);
  const anchor = environment.document.createElement('a');
  anchor.href = url;
  anchor.download = requiredText(filename, 'filename');
  anchor.rel = 'noopener';
  anchor.click();
  environment.URL.revokeObjectURL(url);
  return Object.freeze({ filename: anchor.download, size: bytes.byteLength, mimeType: 'application/pdf' });
}
