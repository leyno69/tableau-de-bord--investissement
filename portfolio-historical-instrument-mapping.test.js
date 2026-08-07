import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defineHistoricalInstrumentMapping,
  auditMappingForWindow,
} from './portfolio-historical-instrument-mapping.js';

test('un instrument exact ne peut pas être rejoué avant sa date de création', () => {
  const mapping = {
    sourceTicker: 'ETF1',
    sourcePresetId: 'beginner',
    historicalSeriesId: 'series-etf1',
    mappingMode: 'exact-instrument',
    instrumentInceptionDate: '2020-01-02',
  };
  assert.deepEqual(auditMappingForWindow(mapping, '2019-12-31'), {
    admissible: false,
    blocker: 'window-predates-instrument-inception',
  });
});

test('un instrument exact est admissible après sa création', () => {
  const mapping = {
    sourceTicker: 'ETF1',
    sourcePresetId: 'beginner',
    historicalSeriesId: 'series-etf1',
    mappingMode: 'exact-instrument',
    instrumentInceptionDate: '2020-01-02',
  };
  assert.deepEqual(auditMappingForWindow(mapping, '2020-01-02'), {
    admissible: true,
    blocker: null,
    warning: null,
  });
});

test('un proxy doit être explicitement identifié et reste signalé comme non identique', () => {
  const mapping = defineHistoricalInstrumentMapping({
    sourceTicker: 'ETF1',
    sourcePresetId: 'beginner',
    historicalSeriesId: 'series-proxy-world',
    mappingMode: 'explicit-proxy',
    instrumentInceptionDate: '1990-01-02',
    proxyIdentity: 'broad-world-index-total-return',
    proxyRationale: 'Représenter l’exposition économique avant création de l’instrument, sans prétendre reconstruire l’ETF.',
  });
  const audit = auditMappingForWindow(mapping, '2000-01-03');
  assert.equal(audit.admissible, true);
  assert.equal(audit.warning, 'proxy-not-identical-to-original-instrument');
});

test('un proxy sans justification est refusé', () => {
  assert.throws(() => defineHistoricalInstrumentMapping({
    sourceTicker: 'ETF1', sourcePresetId: 'beginner', historicalSeriesId: 'x',
    mappingMode: 'explicit-proxy', instrumentInceptionDate: '1990-01-02',
    proxyIdentity: 'world-index', proxyRationale: '',
  }), /proxyRationale/);
});
