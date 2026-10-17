// Bygger innholdet for ett språk ("no" eller "en") fra content/*.json.
// Norsk er hovedspråket. Engelsk bruker felt med «En»-endelse eller en `en`-blokk der de finnes,
// og faller ellers tilbake til norsk. Verktitler og eksisterende norske tekster endres aldri her.
import { readFileSync } from "node:fs";
import * as ph from "./plassholdere.js";

const read = (f) => JSON.parse(readFileSync(f, "utf8"));
export const UI = read("content/ui.json");

// Teknikkord til engelsk (brukes bare på engelsk side, og bare når `techniqueEn` ikke er satt).
const TECH = [
  [/\bkullstift\b/gi, "charcoal pencil"], [/\bkritt\b/gi, "chalk"], [/\bkull\b/gi, "charcoal"],
  [/\bolje\b/gi, "oil"], [/\bakryl\b/gi, "acrylic"], [/\bgull\b/gi, "gold"], [/\bkobber\b/gi, "copper"],
  [/\bsølv\b/gi, "silver"], [/\bog\b/gi, "and"],
];
const techEn = (s) => (s ? TECH.reduce((acc, [re, en]) => acc.replace(re, en), s).replace(/^./, (c) => c.toUpperCase()) : s);

// Alt-tekster laget av importskriptet: «Tittel, teknikk. Fra utstillingen X» og «Fra utstillingen X, bilde N».
function altEn(alt, exTitle) {
  if (!alt) return alt;
  let m = alt.match(/^(.*)\. Fra utstillingen (.*)$/);
  if (m) {
    const [head, ...rest] = m[1].split(", ");
    const tail = rest.length ? ", " + TECH.reduce((acc, [re, en]) => acc.replace(re, en), rest.join(", ")) : "";
    return `${head}${tail}. From the exhibition ${exTitle}`;
  }
  m = alt.match(/^Fra utstillingen (.*), bilde (\d+)$/);
  if (m) return `From the exhibition ${exTitle}, image ${m[2]}`;
  m = alt.match(/^Fra utstillingen (.*)$/);
  if (m) return `From the exhibition ${exTitle}`;
  return alt;
}

export function build(lang) {
  const en = lang === "en";
  const ui = { ...UI[lang], js: { ...UI[lang].js, menu: UI[lang].menu, menuClose: UI[lang].menuClose } };
  let site = read("content/site.json");
  let list = read("content/exhibitions.json");
  let portraits = read("content/portraits.json");
  const usePh = !!site.plassholdere;

  if (en) {
    const e = site.en || {};
    site = { ...site, ...e, about: { ...site.about, ...(e.about || {}) } };
    list = list.map((ex) => {
      const title = ex.titleEn || ex.title;
      return {
        ...ex,
        title,
        text: ex.textEn || ex.text,
        heroAlt: ex.heroAltEn || altEn(ex.heroAlt, title),
        works: (ex.works || []).map((w) => ({
          ...w,
          technique: w.techniqueEn || techEn(w.technique),
          alt: w.altEn || altEn(w.alt, title),
        })),
      };
    });
    portraits = portraits.map((p) => ({ ...p, technique: p.techniqueEn || techEn(p.technique), alt: p.altEn || p.alt }));
    site.heroWorks = (site.heroWorks || []).map((w) => ({ ...w, technique: w.techniqueEn || techEn(w.technique), alt: w.altEn || w.alt }));
  }
  delete site.en;

  if (usePh) {
    site = ph.site(site, lang);
    list = ph.exhibitions(list, lang);
    portraits = ph.portraits(portraits.filter((p) => p.image), lang);
  } else {
    portraits = portraits.filter((p) => p.image);
  }

  const base = en ? "/en/exhibitions/" : "/utstillinger/";
  const slugs = read("content/exhibitions.json").map((x) => x.slug);
  const n = list.length;
  const pair = (slug) => ({ url: `${base}${slug}/` });
  const exhibitions = list.map((ex, i) => ({
    ...ex,
    index: i,
    depth: i * 8,
    url: `${base}${ex.slug}/`,
    urlNo: `/utstillinger/${ex.slug}/`,
    urlEn: `/en/exhibitions/${ex.slug}/`,
    works: (ex.works || []).filter((w) => w.image || w.crop || w.label),
    prev: { title: list[(i - 1 + n) % n].title, ...pair(slugs[(i - 1 + n) % n]) },
    next: { title: list[(i + 1) % n].title, ...pair(slugs[(i + 1) % n]) },
  }));

  return { lang, ui, site, exhibitions, portraits };
}
