const PDFJS_VERSION = '6.1.200';
const PDFJS_MODULE = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`;
const PDFJS_WORKER = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

let pdfjsPromise;

async function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(PDFJS_MODULE).then(module => {
      module.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return module;
    });
  }
  return pdfjsPromise;
}

function normalizeSpaces(value) {
  return String(value || '').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
}

function parseNumber(value) {
  if (value == null || value === '') return NaN;
  const cleaned = String(value)
    .replace(/\s/g, '')
    .replace(/[€$£]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.')
    .replace(/[^0-9+\-.]/g, '');
  const number = Number(cleaned);
  return Number.isFinite(number) ? number : NaN;
}

function normalizeDate(value) {
  const european = String(value || '').match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
  if (european) {
    const year = european[3].length === 2 ? `20${european[3]}` : european[3];
    return `${year}-${european[2].padStart(2, '0')}-${european[1].padStart(2, '0')}`;
  }
  const iso = String(value || '').match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  return iso ? `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}` : '';
}

function inferOperation(text) {
  const value = text.toLocaleLowerCase('fr');
  if (/\b(achat|buy|bought|acquisition|purchase|exécuté achat|ordre d'achat)\b/.test(value)) return 'buy';
  if (/\b(vente|sell|sold|cession|sale|exécuté vente|ordre de vente)\b/.test(value)) return 'sell';
  if (/\b(dividende|dividend|distribution|coupon|intérêt|interest)\b/.test(value)) return 'cashflow';
  if (/\b(dépôt|depot|deposit|versement|retrait|withdrawal|cash transfer|virement)\b/.test(value)) return 'cashflow';
  if (/\b(solde espèces|cash balance|solde du compte|available cash)\b/.test(value)) return 'cash';
  return 'unknown';
}

function findIsin(text) {
  return text.match(/\b[A-Z]{2}[A-Z0-9]{9}\d\b/i)?.[0]?.toUpperCase() || '';
}

function findCurrency(text) {
  if (/\bUSD\b|\$/.test(text)) return 'USD';
  if (/\bGBP\b|£/.test(text)) return 'GBP';
  if (/\bCHF\b/.test(text)) return 'CHF';
  return 'EUR';
}

function findTicker(text) {
  const explicit = text.match(/(?:ticker|symbole|symbol|code valeur)\s*[:\-]?\s*([A-Z][A-Z0-9.\-]{1,15})/i)?.[1];
  return explicit?.toUpperCase() || '';
}

function extractLabelValue(text, labels) {
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:\\-]?\\s*([^\\n]{1,100})`, 'i');
  return normalizeSpaces(text.match(pattern)?.[1] || '');
}

function extractNumericValue(text, labels) {
  const pattern = new RegExp(`(?:${labels.join('|')})\\s*[:\\-]?\\s*([+\\-]?[0-9][0-9 .,'’]*)(?:\\s*(?:EUR|USD|GBP|CHF|€|\\$|£))?`, 'i');
  return parseNumber(text.match(pattern)?.[1]);
}

function splitIntoCandidates(text) {
  const normalized = text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n');
  const blocks = normalized.split(/\n\s*\n|(?=\b(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|20\d{2}-\d{1,2}-\d{1,2})\b)/g)
    .map(normalizeSpaces)
    .filter(block => block.length >= 16);
  return blocks.length ? blocks : [normalizeSpaces(normalized)];
}

function parseCandidate(block, index, context) {
  const operation = inferOperation(block);
  const date = normalizeDate(block);
  const isin = findIsin(block);
  const ticker = findTicker(block);
  const currency = findCurrency(block);
  const quantity = extractNumericValue(block, ['quantité', 'quantite', 'quantity', 'qty', 'nombre de titres', 'parts', 'shares']);
  let avgPrice = extractNumericValue(block, ['prix unitaire', 'cours exécuté', 'cours', 'prix', 'price', 'unit price', 'prix d.exécution', 'execution price']);
  const amount = extractNumericValue(block, ['montant total', 'net amount', 'montant', 'amount', 'total', 'valeur', 'proceeds']);
  const cash = extractNumericValue(block, ['solde espèces', 'cash balance', 'solde du compte', 'available cash']);
  const fees = extractNumericValue(block, ['frais', 'fees', 'commission', 'courtage', 'brokerage']);
  const rawName = extractLabelValue(block, ['instrument', 'titre', 'actif', 'produit', 'security', 'asset', 'nom', 'description']);
  const name = rawName || isin || ticker || `Opération PDF ${index + 1}`;
  if (!Number.isFinite(avgPrice) && Number.isFinite(amount) && Number.isFinite(quantity) && quantity !== 0) avgPrice = Math.abs(amount / quantity);

  const messages = [];
  if (!date) messages.push('date absente');
  if (operation === 'unknown') messages.push('opération non reconnue');
  if (operation === 'buy' || operation === 'sell') {
    if (!isin && !ticker && !rawName) messages.push('actif non identifié');
    if (!Number.isFinite(quantity) || quantity <= 0) messages.push('quantité absente');
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) messages.push('prix absent');
  }
  if (operation === 'cash' && !Number.isFinite(cash) && !Number.isFinite(amount)) messages.push('solde absent');

  return {
    id: `pdf_${context.broker}_${context.fileName}_${index}_${date}_${isin || ticker || name}`.replace(/\s+/g, '_'),
    source: { broker: context.broker, fileName: context.fileName, row: index + 1, format: 'pdf' },
    date,
    operation,
    name,
    ticker,
    isin,
    type: '',
    quantity,
    avgPrice,
    amount,
    cash: Number.isFinite(cash) ? cash : (operation === 'cash' && Number.isFinite(amount) ? amount : NaN),
    fees: Number.isFinite(fees) ? fees : 0,
    currency,
    duplicate: false,
    status: { level: messages.length ? 'error' : 'ok', messages }
  };
}

export function parseBrokerPdfText(text, context = {}) {
  const safeContext = { broker: context.broker || 'generic', fileName: context.fileName || 'document.pdf' };
  return splitIntoCandidates(text)
    .map((block, index) => parseCandidate(block, index, safeContext))
    .filter(row => row.operation !== 'unknown' || row.isin || row.ticker || Number.isFinite(row.amount));
}

export async function extractPdfText(file, { onProgress } = {}) {
  if (!(file instanceof Blob)) throw new TypeError('Un fichier PDF valide est requis.');
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data, useWorkerFetch: false, isEvalSupported: false });
  const document = await loadingTask.promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const lines = [];
    let currentY = null;
    let currentLine = [];
    for (const item of content.items) {
      const y = Math.round(item.transform?.[5] || 0);
      if (currentY !== null && Math.abs(y - currentY) > 3) {
        lines.push(currentLine.join(' '));
        currentLine = [];
      }
      currentY = y;
      currentLine.push(item.str);
    }
    if (currentLine.length) lines.push(currentLine.join(' '));
    pages.push(lines.map(normalizeSpaces).filter(Boolean).join('\n'));
    onProgress?.({ page: pageNumber, total: document.numPages });
  }
  return { text: pages.join('\n\n'), pageCount: document.numPages };
}

export async function parseBrokerPdf(file, context = {}, options = {}) {
  const extracted = await extractPdfText(file, options);
  const rows = parseBrokerPdfText(extracted.text, { ...context, fileName: context.fileName || file.name });
  return { ...extracted, rows };
}

export const PDF_IMPORT_ENGINE = Object.freeze({ name: 'Mozilla PDF.js', version: PDFJS_VERSION });
