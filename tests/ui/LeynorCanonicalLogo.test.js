import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');

test('LEYNOR uses approved classic and premium canonical SVG assets', async () => {
  const [brand, logo, manifest, classicIcon, maskableIcon, premiumIcon, serviceWorker] = await Promise.all([
    read('leynor-brand.js'),
    read('leynor-logo.js'),
    read('manifest.webmanifest'),
    read('icons/leynor-icon.svg'),
    read('icons/leynor-maskable.svg'),
    read('icons/leynor-laboratory-premium.svg'),
    read('service-worker.js')
  ]);

  assert.match(brand, /import '\.\/leynor-logo\.js'/);
  assert.match(logo, /CLASSIC_LOGO_PATH = '\.\/icons\/leynor-icon\.svg'/);
  assert.match(logo, /PREMIUM_LOGO_PATH = '\.\/icons\/leynor-laboratory-premium\.svg'/);
  assert.match(logo, /premium: true/);
  assert.match(logo, /\.brand-mark/);
  assert.match(logo, /\.ai-orb/);
  assert.match(logo, /\.leynor-presence-core/);
  assert.match(manifest, /"src": "\.\/icons\/leynor-icon\.svg"/);
  assert.match(manifest, /"src": "\.\/icons\/leynor-maskable\.svg"/);
  assert.match(classicIcon, /L bleu saphir prolongé par une courbe dorée vers deux étoiles/);
  assert.match(maskableIcon, /Icône adaptative LEYNOR bleu saphir et or/);
  assert.match(premiumIcon, /Laboratoire Premium/);
  assert.match(serviceWorker, /leynor-laboratory-premium\.svg/);
});

test('logo motion matches approved idle and active behavior with accessibility support', async () => {
  const css = await read('leynor-logo.css');
  assert.match(css, /leynor-idle-twinkle 12s/);
  assert.match(css, /leynor-ai-breathe/);
  assert.match(css, /data-presence="listening"/);
  assert.match(css, /data-presence="thinking"/);
  assert.match(css, /data-presence="speaking"/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /animation: none !important/);
});
