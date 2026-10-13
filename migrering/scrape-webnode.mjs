// Henter alle sider, tekster og bilder fra dagens Webnode-side.
// Krever Node 18 eller nyere (innebygd fetch). Ingen pakker å installere.
// Kjør:  node scrape-webnode.mjs
// Resultat i ./scrape-output/: images/, pages/, manifest.json

import { mkdir, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const ORIGIN = 'https://www.anitarufuspamer.com';
const OUT = 'scrape-output';
const SEEDS = ['/', '/mitt-arbeid/', '/om-meg/', '/kontakt/',
  '/1-til-1-gyldeprisen-kunsthall/', '/alt-mellom-himmel-og-jord/', '/varslipp/', '/alt-jeg-ikke/',
  '/de-5-elementer/', '/vandreutstilling/', '/get-it-for-cheap/', '/min-vei-til-master/',
  '/a2019/', '/dyreriket/', '/mitt-arbeid/midt-i-jungelen/', '/mitt-arbeid/hostfarger/'];
const NAV = ['Forside', 'Mitt arbeid', 'Om meg', 'Kontakt', 'Vis mer', 'Meny', 'Anita Rufus Pamer'];
const CDN = /https?:\/\/[a-z0-9-]+\.clvaw-cdnwnd\.com\/[^"'\s)<>\\]+/gi;
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|svg)(\?|$)/i;
const UA = { 'User-Agent': 'Mozilla/5.0 (migrering av egen nettside)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exists = (p) => access(p).then(() => true, () => false);

// Webnode legger en størrelsesmappe (f.eks. /700/) foran filnavnet. Uten den får vi originalen.
const toOriginal = (u) => u.replace(/(\/\d+-[0-9a-f]+)\/\d+(?:x\d+)?\//, '$1/');

const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n));

const cleanName = (name) => decodeURIComponent(name)
  .toLowerCase().replace(/æ/g, 'ae').replace(/ø/g, 'o').replace(/å/g, 'a')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

const pageSlug = (p) => p.replace(/^\/|\/$/g, '').replace(/\//g, '--') || 'forside';

async function get(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow' });
  if (!res.ok) throw new Error(res.status + ' ' + url);
  return res;
}

function textBlocks(html) {
  const body = html.replace(/<(script|style|noscript|svg|nav|header|footer)\b[\s\S]*?<\/\1>/gi, '');
  const out = [];
  const re = /<(h[1-4]|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m;
  while ((m = re.exec(body))) {
    const t = decode(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (t && !NAV.includes(t) && !out.includes(t)) out.push(t);
  }
  return out;
}

function pageImages(html) {
  const found = new Map(); // original-url -> {seen, alt}
  const add = (u, alt) => {
    u = u.replace(/[,;]+$/, '');
    if (!IMG_EXT.test(u)) return;
    const o = toOriginal(u);
    if (!found.has(o)) found.set(o, { seen: u, alt: alt || '' });
    else if (alt && !found.get(o).alt) found.get(o).alt = alt;
  };
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const alt = decode((tag.match(/\balt="([^"]*)"/i) || [])[1] || '');
    for (const u of tag.match(CDN) || []) add(u, alt);
  }
  for (const u of html.match(CDN) || []) add(u, '');
  return found;
}

function internalLinks(html) {
  const out = new Set();
  for (const m of html.matchAll(/href="([^"#?]+)"/gi)) {
    let h = m[1];
    if (h.startsWith(ORIGIN)) h = h.slice(ORIGIN.length);
    if (!h.startsWith('/') || h.startsWith('//') || /\.[a-z0-9]{2,4}$/i.test(h)) continue;
    out.add(h.endsWith('/') ? h : h + '/');
  }
  return out;
}

const usedNames = new Set();
async function saveImage(entry, folder) {
  const base = cleanName(path.basename(new URL(entry.original).pathname));
  let name = base, n = 2;
  while (usedNames.has(folder + '/' + name)) name = base.replace(/(\.[a-z0-9]+)$/, `-${n++}$1`);
  usedNames.add(folder + '/' + name);
  const dir = path.join(OUT, 'images', folder);
  await mkdir(dir, { recursive: true });
  const dest = path.join(dir, name);
  let usedUrl = null;
  for (const u of [entry.original, entry.seen]) {
    try {
      const res = await get(u);
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      usedUrl = u; break;
    } catch { /* prøv neste */ }
  }
  return { file: path.join('images', folder, name), downloadedFrom: usedUrl };
}

async function main() {
  await mkdir(path.join(OUT, 'pages'), { recursive: true });
  const queue = [...SEEDS], seen = new Set(), pages = [], failed = [];
  try {
    const xml = await (await get(ORIGIN + '/sitemap.xml')).text();
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) queue.push(new URL(m[1]).pathname);
  } catch { console.log('Fant ikke sitemap.xml, fortsetter med lenkene på sidene.'); }

  const downloaded = new Map(); // original-url -> filsti
  while (queue.length && pages.length < 80) {
    let p = queue.shift();
    p = p.endsWith('/') ? p : p + '/';
    if (seen.has(p)) continue;
    seen.add(p);
    let html;
    try { html = await (await get(ORIGIN + p)).text(); } catch (e) { failed.push(String(e)); console.log('FEIL', p); continue; }
    for (const l of internalLinks(html)) if (!seen.has(l)) queue.push(l);

    const title = decode((html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s*::.*$/, '').trim();
    const slug = pageSlug(p);
    const images = [];
    for (const [original, info] of pageImages(html)) {
      if (!downloaded.has(original)) {
        const r = await saveImage({ original, seen: info.seen }, slug);
        downloaded.set(original, r);
        await sleep(120);
      }
      const r = downloaded.get(original);
      images.push({ file: r.file, alt: info.alt, original, downloadedFrom: r.downloadedFrom });
    }
    const page = { path: p, slug, title, text: textBlocks(html), images };
    pages.push(page);
    await writeFile(path.join(OUT, 'pages', slug + '.json'), JSON.stringify(page, null, 2));
    console.log(p.padEnd(40), images.length + ' bilder', page.text.length + ' tekstblokker');
    if (!images.length) console.log('  ADVARSEL: ingen bilder funnet. Siden kan lastes med JavaScript, se README-migrering.md');
    await sleep(150);
  }
  await writeFile(path.join(OUT, 'manifest.json'), JSON.stringify({ origin: ORIGIN, scrapedAt: new Date().toISOString(), pages, failed }, null, 2));
  const total = [...downloaded.values()].filter((d) => d.downloadedFrom).length;
  console.log(`\nFerdig: ${pages.length} sider, ${total} bilder. Se ${OUT}/manifest.json`);
  if (failed.length) console.log('Feilet:', failed.join('\n'));
}
main();
