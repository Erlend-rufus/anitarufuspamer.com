// Plassholdere fra designprototypen (docs/design/prototype).
// Brukes bare når "plassholdere": true i content/site.json.
// Ekte innhold i content/*.json går alltid foran: et felt fylles bare når det er tomt.
// Fjernes helt ved å sette "plassholdere": false (og eventuelt slette src/plassholder/ og denne filen).

const F = "/plassholder/fjord.webp";
const V = "/plassholder/vindu.webp";
const G = "/plassholder/gul-vegg.webp";
const ROM = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
const META = "Teknikk · mål · år";

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

export function site(s) {
  s.heroWorks = (s.heroWorks || []).map((w, i) => {
    const out = { ...w };
    fill(out, "title", `Verktittel ${ROM[i]}`);
    if (!out.technique && !out.size && !out.year) out.metaText = META;
    return out;
  });
  fill(s, "instagram", "@brukernavn");
  fill(s, "portraitsText", "Tekst om portrettene kommer.");
  s.about = { ...s.about };
  if (!s.about.portrait) s.about.portraitLabel = "Portrett av Anita";
  s.instagramPosts = [
    [F, .379, .461, 2.2, "Nytt arbeid på veggen.", "11. okt"],
    [V, .297, .423, 2.6, "Detalj fra verket.", "6. okt"],
    [G, .216, .855, 3.0, "Fra atelieret.", "29. sep"],
    [G, .17, .43, 3.4, "Skisser til neste serie.", "22. sep"],
    [F, .198, .78, 2.8, "Installasjonsbilde.", "15. sep"],
    [V, .587, .51, 4, "Fra åpningen.", "9. sep"],
  ].map((o) => ({ crop: crop(o[0], o[1], o[2], o[3], 1), caption: o[4], date: o[5] }));
  return s;
}

const BAND_CROPS = [[F, .4, .47, 1.3], [V, .3, .45, 1.8], [G, .5, .85, 1.6], [F, .2, .78, 2.0], [V, .6, .5, 1.6], [G, .17, .45, 2.2]];
const HEIGHTS = [170, 200, 170, 200, 180, 200, 170, 200, 190, 170, 200, 180];
// Første utstilling: utsnitt av verk. Øvrige: grå flater.  [bilde, cx, cy, zoom, sideforhold, bredde]
const FIRST_WORKS = [[F, .379, .461, 2.2, .72, 520], [V, .297, .423, 2.6, 1.36, 760], [G, .216, .855, 3.0, 1.5, 600], [V, .587, .51, 10, .302, 220]];
const OTHER_WORKS = [[.8, 480], [1.3, 640], [1, 420]];

export function exhibitions(list) {
  return list.map((ex, i) => {
    const out = { ...ex };
    fill(out, "place", "—");
    fill(out, "period", "—");
    fill(out, "text", "Tekst om utstillingen kommer.");
    if (!out.heroImage) out.heroLabel = "Utstillingsbilde";
    if (!out.heroImage && !(out.works || []).some((w) => w.image)) {
      const o = BAND_CROPS[i % 6];
      out.thumbCrop = crop(o[0], o[1], o[2], o[3], 440 / (HEIGHTS[i % 12] - 70));
    }
    if (!(out.works || []).length) {
      out.works = (i === 0 ? FIRST_WORKS : OTHER_WORKS).map((o, k) => ({
        title: `Verktittel ${ROM[k]}`,
        metaLines: ["Teknikk", "Mål", "År"],
        ...(i === 0
          ? { crop: crop(o[0], o[1], o[2], o[3], o[4]), aspect: o[4], width: o[5] }
          : { label: "Bilde av verk", aspect: o[0], width: o[1] }),
      }));
    }
    return out;
  });
}

const PORTRAIT_CROPS = [[V, .297, .423, 3.4, .8], [V, .93, .426, 4.5, .75], [V, .589, .508, 3.2, .8], [G, .2, .47, 3.0, .75], [V, .138, .89, 3.6, .8], [G, .576, .446, 3.6, .75], [G, .82, .59, 3.2, .8], [G, .3, .86, 2.6, .75], [F, .379, .461, 2.4, .8]];

export function portraits(list) {
  if (list.length) return list;
  return PORTRAIT_CROPS.map((o, i) => ({
    title: `Portrett ${ROM[i]}`,
    metaText: META,
    crop: crop(o[0], o[1], o[2], o[3], o[4]),
    aspect: o[4],
  }));
}
