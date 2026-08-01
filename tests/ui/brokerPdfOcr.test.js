import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const pdf = await readFile(new URL('../../broker-pdf-import.js', import.meta.url), 'utf8');
const ocr = await readFile(new URL('../../broker-pdf-ocr.js', import.meta.url), 'utf8');

test('scanned PDFs fall back to local OCR only when text layer is unusable', () => {
  assert.match(pdf, /hasUsableText\(textLayer\.text\)/);
  assert.match(pdf, /extractPdfTextWithOcr\(document, options\)/);
  assert.match(pdf, /phase: 'ocr-start'/);
  assert.match(pdf, /mode === 'ocr' \? 'pdf-ocr' : 'pdf'/);
});

test('OCR is local, bilingual and bounded for mobile memory safety', () => {
  assert.match(ocr, /tesseract\.js@\$\{TESSERACT_VERSION\}/);
  assert.match(ocr, /OCR_LANGUAGES = 'fra\+eng'/);
  assert.match(ocr, /MAX_OCR_PAGES = 20/);
  assert.match(ocr, /Math\.min\(pdfDocument\.numPages/);
  assert.match(ocr, /worker\.terminate\(\)/);
  assert.match(ocr, /local: true/);
});

test('OCR renders pages through PDF.js canvas and reports page progress', () => {
  assert.match(ocr, /page\.getViewport/);
  assert.match(ocr, /page\.render\(\{ canvasContext: context, viewport \}\)\.promise/);
  assert.match(ocr, /worker\.recognize\(canvas\)/);
  assert.match(ocr, /phase: 'ocr', page: pageNumber/);
});

test('import UI states that scanned PDFs are supported without uploading the file', () => {
  assert.match(ocr, /PDF scannés analysés localement/);
  assert.match(ocr, /Le fichier reste sur cet appareil/);
  assert.match(ocr, /MutationObserver\(updateImportCopy\)/);
});
