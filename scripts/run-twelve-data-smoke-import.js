import { writeFile } from 'node:fs/promises';
import { runTwelveDataSmokeImport } from '../market-data/TwelveDataSmokeImport.js';

const symbol = process.env.TWELVEDATA_SMOKE_SYMBOL ?? 'AAPL';
const endDate = process.env.TWELVEDATA_SMOKE_END_DATE ?? new Date().toISOString().slice(0, 10);
const startDate = process.env.TWELVEDATA_SMOKE_START_DATE
  ?? new Date(Date.parse(`${endDate}T00:00:00Z`) - 14 * 86_400_000).toISOString().slice(0, 10);
const outputPath = process.env.TWELVEDATA_SMOKE_OUTPUT ?? 'artifacts/twelve-data-smoke-report.json';

try {
  const report = await runTwelveDataSmokeImport({
    symbol,
    startDate,
    endDate,
    interval: '1day',
    outputSize: 5,
  });
  await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    configured: true,
    providerId: report.providerId,
    symbol: report.symbol,
    recordCount: report.recordCount,
    fingerprint: report.fingerprint,
    temporalAuditPassed: report.temporalAuditPassed,
    externallyValidated: false,
    productionReady: false,
  }));
} catch (error) {
  console.error(JSON.stringify({
    configured: Boolean(process.env.TWELVEDATA_API_KEY),
    error: error instanceof Error ? error.message : 'unknown error',
    secretValueExposed: false,
  }));
  process.exitCode = 1;
}
