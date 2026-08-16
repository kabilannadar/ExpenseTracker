#!/usr/bin/env node
/**
 * update_locales.js
 * -----------------
 * All-in-one i18n maintenance script. Run locally before pushing.
 * 
 * Steps:
 *   1. Scan all JSX files and extract static UI strings.
 *   2. Detect if any NEW strings were added to en.json.
 *   3. If changes detected → run `python scripts/translate_locales.py`.
 *   4. Compile all locale JSONs into frontend/src/utils/locales.js.
 * 
 * Usage:
 *   node scripts/update_locales.js
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─── CONFIG ────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const PAGES_DIR    = path.join(ROOT, 'frontend/src/pages');
const COMPS_DIR    = path.join(ROOT, 'frontend/src/components');
const EN_JSON      = path.join(ROOT, 'frontend/src/locales/en.json');
const LOCALES_DIR  = path.join(ROOT, 'frontend/src/locales');
const LOCALES_OUT  = path.join(ROOT, 'frontend/src/utils/locales.js');

// ─── STEP 1 — EXTRACT LABELS ───────────────────────────────────────────────
console.log('\n📝  Step 1: Scanning JSX files for static UI strings...');

const regexes = [
  /<[^>]+>([^<{\n\r\t]+)<\/[^>]+>/g,
  /['"]([A-Z][a-zA-Z0-9\s!?,.%()&''/\-]{2,120}|[a-zA-Z0-9!?,.%()&''/\-]+\s[a-zA-Z0-9\s!?,.%()&''/\-]{1,120})['"]/g,
  /placeholder="([^"]+)"/g,
  /title="([^"]+)"/g,
];

const SKIP_PATTERNS = [
  /^var\(/, /^--/, /px$/, /#[0-9a-fA-F]{3,6}/, /rgba?\(/, /^[0-9.\s]+$/,
  /^linear-gradient/, /^radial-gradient/, /\{/, /\}/, /^import\s/,
  /^from\s/, /^\.\//,
];

function shouldSkip(text) {
  return SKIP_PATTERNS.some(rx => rx.test(text));
}

function cleanText(text) {
  const cleaned = text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&times;/g, '').trim();
  if (!cleaned || cleaned.length < 2 || !/[a-zA-Z]/.test(cleaned)) return null;
  if (shouldSkip(cleaned)) return null;
  return cleaned;
}

const found = new Set();

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  regexes.forEach(re => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(content)) !== null) {
      const t = cleanText(m[1]);
      if (t && !t.includes('{') && !t.includes('}')) found.add(t);
    }
  });
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walkDir(full);
    else if (file.endsWith('.jsx')) scanFile(full);
  }
}

walkDir(PAGES_DIR);
walkDir(COMPS_DIR);
console.log(`   Found ${found.size} unique UI strings across all JSX files.`);

// ─── STEP 2 — DETECT CHANGES ───────────────────────────────────────────────
console.log('\n🔍  Step 2: Detecting new strings vs existing en.json...');

const enData = JSON.parse(fs.readFileSync(EN_JSON, 'utf8'));
if (!enData.ui) enData.ui = {};

const before = Object.keys(enData.ui).length;
let added = 0;

for (const str of found) {
  const alreadyInOtherSection =
    Object.values(enData.nav    || {}).includes(str) ||
    Object.values(enData.common || {}).includes(str) ||
    Object.values(enData.headers || {}).includes(str);

  if (!alreadyInOtherSection && !(str in enData.ui)) {
    enData.ui[str] = str;
    added++;
  }
}

if (added > 0) {
  fs.writeFileSync(EN_JSON, JSON.stringify(enData, null, 2), 'utf8');
  console.log(`   Added ${added} new string(s) to en.json (${before} -> ${before + added} total).`);
} else {
  console.log('   No new strings detected. en.json is up to date.');
}

// ─── STEP 3 — TRANSLATE (only if changes exist) ────────────────────────────
if (added > 0) {
  console.log('\n🌐  Step 3: Translating new strings...');
  try {
    execSync('python scripts/translate_locales.py', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    console.log('   Translation complete.');
  } catch (e) {
    console.error('   Translation failed:', e.message);
    process.exit(1);
  }
} else {
  console.log('\n   Step 3: Skipping translation -- no new strings to translate.');
}

// ─── STEP 4 — COMPILE locales.js ───────────────────────────────────────────
console.log('\n📦  Step 4: Compiling locale JSONs into locales.js...');

const files = fs.readdirSync(LOCALES_DIR).filter(f => f.endsWith('.json'));
let out = 'export const locales = {\n';
for (const file of files) {
  const lang    = path.basename(file, '.json');
  const content = fs.readFileSync(path.join(LOCALES_DIR, file), 'utf8');
  out += `  ${lang}: ${content.trim()},\n`;
}
out += '};\n';

fs.writeFileSync(LOCALES_OUT, out, 'utf8');
console.log(`   locales.js compiled (${files.length} languages).`);

// ─── DONE ──────────────────────────────────────────────────────────────────
console.log('\nDone! Locales are up to date and compiled.\n');
