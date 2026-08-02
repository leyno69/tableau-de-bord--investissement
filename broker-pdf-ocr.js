const TESSERACT_VERSION = '6.0.1';
const TESSERACT_MODULE = `https://cdn.jsdelivr.net/npm/tesseract.js@${TESSERACT_VERSION}/dist/tesseract.esm.min.js`;
const OCR_LANGUAGES = 'fra+eng';
const MAX_OCR_PAGES = 20;
const OCR_SCALE = 1.8;

let tesseractPromise;

async function loadTesseract() {
  if (!tesseractPromise) tesseractPromise = import(TESSERACT_MODULE);
  return tesseractPromise;
}

function cleanOcrText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function ensureCanvas() {
  if (typeof document === 'undefined') throw new Error('L’OCR local nécessite un navigateur compatible.');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: true });
  if (!context) throw new Error('Le moteur graphique nécessaire à l’OCR est indisponible.');
  return { canvas, context };
}

async function renderPage(page, scale = OCR_SCALE) {
  const viewport = page.getViewport({ scale });
  const { canvas, context } = ensureCanvas();
  canvas.width = Math.max(1, Math.ceil(viewport.width));
  canvas.height = Math.max(1, Math.ceil(viewport.height));
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}

export async function extractPdfTextWithOcr(pdfDocument, { onProgress, maxPages = MAX_OCR_PAGES } = {}) {
  if (!pdfDocument?.numPages || typeof pdfDocument.getPage !== 'function') throw new TypeError('Un document PDF.js valide est requis pour l’OCR.');
  const pageCount = Math.min(pdfDocument.numPages, Math.max(1, Number(maxPages) || MAX_OCR_PAGES));
  const { createWorker } = await loadTesseract();
  const worker = await createWorker(OCR_LANGUAGES, 1);

  const pages = [];
  try {
    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      onProgress?.({ phase: 'render', page: pageNumber, total: pageCount, progress: 0 });
      const page = await pdfDocument.getPage(pageNumber);
      const canvas = await renderPage(page);
      onProgress?.({ phase: 'ocr', page: pageNumber, total: pageCount, progress: 0 });
      const result = await worker.recognize(canvas);
      pages.push(cleanOcrText(result?.data?.text));
      canvas.width = 1;
      canvas.height = 1;
      onProgress?.({ phase: 'ocr', page: pageNumber, total: pageCount, progress: 1 });
    }
  } finally {
    await worker.terminate();
  }

  return {
    text: cleanOcrText(pages.join('\n\n')),
    pageCount: pdfDocument.numPages,
    processedPages: pageCount,
    truncated: pdfDocument.numPages > pageCount,
    mode: 'ocr'
  };
}

function updateImportCopy() {
  if (typeof document === 'undefined') return;
  const dropHint = document.querySelector('label.import-drop small');
  if (dropHint) dropHint.textContent = 'CSV, PDF texte et PDF scannés analysés localement. Vérification obligatoire avant import.';
  const notice = document.querySelector('.pdf-import-notice');
  if (notice) notice.innerHTML = '<strong>Import PDF avec OCR local</strong><br>LEYNOR lit d’abord la couche texte puis utilise la reconnaissance d’image si le document est scanné. Le fichier reste sur cet appareil.';
}

if (typeof document !== 'undefined') {
  new MutationObserver(updateImportCopy).observe(document.documentElement, { childList: true, subtree: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateImportCopy);
  else updateImportCopy();
}

export const OCR_IMPORT_ENGINE = Object.freeze({
  name: 'Tesseract.js',
  version: TESSERACT_VERSION,
  languages: OCR_LANGUAGES,
  maxPages: MAX_OCR_PAGES,
  local: true
});

export { cleanOcrText, updateImportCopy };
