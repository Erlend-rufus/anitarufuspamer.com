// Plassholdere fra designprototypen (docs/design/prototype).
// Brukes bare når "plassholdere": true i content/site.json.
// Ekte innhold i content/*.json går alltid foran: et felt fylles bare når det er tomt.
// Fjernes helt ved å sette "plassholdere": false (og eventuelt slette src/plassholder/ og denne filen).

const F = "/plassholder/fjord.webp";
const V = "/plassholder/vindu.webp";
const G = "/plassholder/gul-vegg.webp";
const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const TXT = {
  no: {
    work: "Verktittel", meta: "Teknikk · mål · år", handle: "@brukernavn", portraitsText: "Tekst om portrettene kommer.",
    portraitOf: "Portrett av Anita", place: "—", exText: "Tekst om utstillingen kommer.", view: "Utstillingsbilde",
    lines: ["Teknikk", "Mål", "År"], imageOf: "Bilde av verk", portrait: "Portrett",
    posts: [["Nytt arbeid på veggen.", "11. okt"], ["Detalj fra verket.", "6. okt"], ["Fra atelieret.", "29. sep"], ["Skisser til neste serie.", "22. sep"], ["Installasjonsbilde.", "15. sep"], ["Fra åpningen.", "9. sep"]],
  },
  en: {
    work: "Work title", meta: "Technique · size · year", handle: "@username", portraitsText: "Text about the portraits coming soon.",
    portraitOf: "Portrait of Anita", place: "—", exText: "Text about the exhibition coming soon.", view: "Exhibition view",
    lines: ["Technique", "Size", "Year"], imageOf: "Image of work", portrait: "Portrait",
    posts: [["New work on the wall.", "11 Oct"], ["Detail from the work.", "6 Oct"], ["From the studio.", "29 Sep"], ["Sketches for the next series.", "22 Sep"], ["Installation view.", "15 Sep"], ["From the opening.", "9 Sep"]],
  },
};

// Samme utsnittsformel som prototypen: viser punktet (cx, cy) i et 1920×1279-bilde med zoom Z i en flate med sideforhold asp.
export function crop(src, cx, cy, Z, asp) {
  const r = 1279 / 1920;
  const z = Math.max(Z, 1.02, 1.02 / (asp * r));
  const cl = (v) => Math.max(0, Math.min(1, v));
  const px = cl((0.5 - cx * z) / (1 - z));
  const py = cl((1 / (2 * asp) - cy * z * r) / (1 / asp - z * r));
  return `background-image:url(${src});background-size:${(z * 100).toFixed(1)}% auto;background-position:${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%;background-repeat:no-repeat;background-color:#ECECEA`;
}

const fill = (obj, key, value) => { if (!obj[key]) obj[key] = value; };

export function site(s, lang = "no") {
  const t = TXT[lang];
  s.heroWorks = (s.heroWorks || []).map((w, i) => {
    const out = { ...w };
    fill(out, "title", `${t.work} ${ROM[i]}`);
    if (!out.technique && !out.size && !out.year) out.metaText = t.meta;
    return out;
  });
  fill(s, "instagram", t.handle);
  fill(s, "portraitsText", t.portraitsText);
  s.about = { ...s.about };
  if (!s.about.portrait) s.about.portraitLabel = t.portraitOf;
  const G_ = [[F, .379, .461, 2.2], [V, .297, .423, 2.6], [G, .216, .855, 3.0], [G, .17, .43, 3.4], [F, .198, .78, 2.8], [V, .587, .51, 4]];
  s.instagramPosts = G_.map((o, i) => ({ crop: crop(o[0], o[1], o[2], o[3], 1), caption: t.posts[i][0], date: t.posts[i][1] }));
  return s;
}

const BAND_CROPS = [[F, .4, .47, 1.3], [V, .3, .45, 1.8], [G, .5, .85, 1.6], [F, .2, .78, 2.0], [V, .6, .5, 1.6], [G, .17, .45, 2.2]];
const HEIGHTS = [170, 200, 170, 200, 180, 200, 170, 200, 190, 170, 200, 180];
// Første utstilling: utsnitt av verk. Øvrige: grå flater.  [bilde, cx, cy, zoom, sideforhold, bredde]
const FIRST_WORKS = [[F, .379, .461, 2.2, .72, 520], [V, .297, .423, 2.6, 1.36, 760], [G, .216, .855, 3.0, 1.5, 600], [V, .587, .51, 10, .302, 220]];
const OTHER_WORKS = [[.8, 480], [1.3, 640], [1, 420]];

export function exhibitions(list, lang = "no") {
  const t = TXT[lang];
  return list.map((ex, i) => {
    const out = { ...ex };
    fill(out, "place", t.place);
    fill(out, "period", t.place);
    if (!out.text) { out.text = t.exText; out.textPlaceholder = true; }
    if (!out.heroImage) out.heroLabel = t.view;
    if (!out.heroImage && !(out.works || []).some((w) => w.image)) {
      const o = BAND_CROPS[i % 6];
      out.thumbCrop = crop(o[0], o[1], o[2], o[3], 440 / (HEIGHTS[i % 12] - 70));
    }
    if (!(out.works || []).length) {
      out.works = (i === 0 ? FIRST_WORKS : OTHER_WORKS).map((o, k) => ({
        title: `${t.work} ${ROM[k]}`,
        metaLines: t.lines,
        ...(i === 0
          ? { crop: crop(o[0], o[1], o[2], o[3], o[4]), aspect: o[4], width: o[5] }
          : { label: t.imageOf, aspect: o[0], width: o[1] }),
      }));
    }
    return out;
  });
}

const PORTRAIT_CROPS = [[V, .297, .423, 3.4, .8], [V, .93, .426, 4.5, .75], [V, .589, .508, 3.2, .8], [G, .2, .47, 3.0, .75], [V, .138, .89, 3.6, .8], [G, .576, .446, 3.6, .75], [G, .82, .59, 3.2, .8], [G, .3, .86, 2.6, .75], [F, .379, .461, 2.4, .8]];

export function portraits(list, lang = "no") {
  const t = TXT[lang];
  if (list.length) return list;
  return PORTRAIT_CROPS.map((o, i) => ({
    title: `${t.portrait} ${ROM[i]}`,
    metaText: t.meta,
    crop: crop(o[0], o[1], o[2], o[3], o[4]),
    aspect: o[4],
  }));
}
