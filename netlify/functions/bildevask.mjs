// Bildevask: bildene Anita laster opp, rensingen (Claude finner hjørnene) og publiseringen til nettsiden.
// Siden ligger på /bildevask/ og snakker med denne funksjonen på /api/bildevask/*.
//
// Miljøvariabler i Netlify (aldri i repoet):
//   BILDEVASK_KODE     koden Anita skriver inn for å få tilgang
//   ANTHROPIC_API_KEY  nøkkel fra console.anthropic.com (rensingen betales per bilde)
//   GITHUB_TOKEN       fine-grained token, kun dette repoet, tilgang «Contents: Read and write»
//   BILDEVASK_MODEL    valgfri, standard claude-sonnet-5-5
//   GITHUB_REPO        valgfri, standard erlend-rufus/anitarufuspamer.com
//
// Lagring: Netlify Blobs, butikken «bildevask». Nøkler: meta/<id>, orig/<id>, tn/<id>, ren/<id>, rtn/<id>.
import { createHash, timingSafeEqual } from "node:crypto";
import { getStore } from "@netlify/blobs";

// Byttes ut i testene.
export const deps = {
  store: () => getStore({ name: "bildevask", consistency: "strong" }),
  fetch: (...a) => fetch(...a),
};

export const config = { path: "/api/bildevask/*" };

const MAKS_BYTES = 5.5 * 1024 * 1024; // Netlify-funksjoner tar maks 6 MB
const ID = /^[a-f0-9]{16}$/;
const TYPER = new Set(["orig", "tn", "ren", "rtn"]);
const STATUSER = new Set(["klar", "rengjort", "avvist", "godkjent", "feil"]); // «publisert» setter bare serveren
const FELT = new Set(["title", "exhibition", "kommentar", "status", "hjorner", "uendret", "feil", "renW", "renH"]);

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const feil = (status, melding) => json({ feil: melding }, status);

const hash = (s) => createHash("sha256").update(String(s)).digest();
const kodeOk = (req) => {
  const kode = process.env.BILDEVASK_KODE;
  return !!kode && timingSafeEqual(hash(req.headers.get("x-kode") || ""), hash(kode));
};

const slug = (t) =>
  String(t || "").toLowerCase().replace(/æ/g, "ae").replace(/ø/g, "o").replace(/å/g, "a")
    .normalize("NFKD").replace(/[^\x00-\x7f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/* ---------- Metadata ---------- */
async function lesMeta(store, id) { return (await store.get(`meta/${id}`, { type: "json" })) || null; }
async function skrivMeta(store, meta) { await store.setJSON(`meta/${meta.id}`, meta); }
async function alleMeta(store) {
  const { blobs } = await store.list({ prefix: "meta/" });
  const alle = await Promise.all(blobs.map((b) => store.get(b.key, { type: "json" }).catch(() => null)));
  return alle.filter(Boolean).sort((a, b) => (a.lastet || "").localeCompare(b.lastet || ""));
}

/* ---------- Claude: finn hjørnene ---------- */
const NAVN = ["øverst til venstre", "øverst til høyre", "nederst til høyre", "nederst til venstre"];
function prompt(steg, hint) {
  const ekstra = hint ? ` Maleren har gitt denne beskjeden om forrige forsøk: «${String(hint).slice(0, 300)}».` : "";
  if (steg === 1) {
    return "Bildet viser et maleri (eller tegning) fotografert på en vegg, i en utstilling eller på et atelier, ofte på skrå. Finn de fire hjørnene på selve verket: den malte forsiden av lerretet eller platen. Ikke ta med siden av lerretet, veggen, gulvet eller skygger. Hvis verket har ramme, ta med rammens ytterkant." + ekstra +
      "\n\nSvar bare med JSON, uten forklaring: {\"verk\": \"flatt\" eller \"annet\", \"hjorner\": [[x,y],[x,y],[x,y],[x,y]]}. Hjørnene kommer i rekkefølgen " + NAVN.join(", ") +
      ", som brøkdeler mellom 0 og 1 av bildets bredde (x) og høyde (y), sett slik bildet vises. Bruk \"annet\" og tom liste hvis bildet ikke viser ett enkelt flatt, rektangulært verk (for eksempel skulptur, flere verk, eller et helt rom).";
  }
  if (steg === 2) {
    return "Du får fire utsnitt, i denne rekkefølgen: 1) øverst til venstre, 2) øverst til høyre, 3) nederst til høyre, 4) nederst til venstre hjørne av et maleri. I hvert utsnitt ligger hjørnet omtrent midt i bildet. Finn nøyaktig der to kanter av verket møtes (den ytterste malte flaten, eller rammens ytterkant hvis det er en ramme), ikke veggen utenfor." + ekstra +
      "\n\nSvar bare med JSON: {\"hjorner\": [[x,y],[x,y],[x,y],[x,y]]} med brøkdeler mellom 0 og 1 av hvert utsnitts bredde og høyde.";
  }
  return "Bildet viser et ferdig fotografert maleri av kunstneren Anita Rufus Pamer. Skriv en kort alt-tekst på norsk bokmål for blinde lesere: hva bildet viser (motiv, farger, uttrykk), maks 140 tegn. Ikke skriv tittel, teknikk, navn eller kunsthistorie. Svar bare med JSON: {\"alt\": \"...\"}";
}

async function spørClaude(steg, bilder, hint) {
  const nøkkel = process.env.ANTHROPIC_API_KEY;
  if (!nøkkel) throw Object.assign(new Error("ANTHROPIC_API_KEY mangler"), { status: 503 });
  const res = await deps.fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": nøkkel, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.BILDEVASK_MODEL || "claude-sonnet-5-5",
      max_tokens: 400,
      messages: [{ role: "user", content: [
        ...bilder.map((b) => ({ type: "image", source: { type: "base64", media_type: b.type, data: b.data } })),
        { type: "text", text: prompt(steg, hint) },
      ] }],
    }),
  });
  if (!res.ok) throw Object.assign(new Error(`Anthropic svarte ${res.status}`), { status: res.status === 429 ? 429 : 502 });
  const svar = await res.json();
  const tekst = (svar.content || []).map((c) => c.text || "").join("");
  const a = tekst.indexOf("{"), z = tekst.lastIndexOf("}");
  if (a < 0 || z < a) throw Object.assign(new Error("Ugyldig svar"), { status: 502 });
  // modellen skriver av og til «.5» i stedet for «0.5»
  return JSON.parse(tekst.slice(a, z + 1).replace(/([\[,:\s])\.(\d)/g, "$10.$2"));
}

/* ---------- GitHub: legg godkjente bilder inn i repoet ---------- */
async function gh(path, opts = {}) {
  const repo = process.env.GITHUB_REPO || "erlend-rufus/anitarufuspamer.com";
  const res = await deps.fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "bildevask", ...(opts.body ? { "Content-Type": "application/json" } : {}) },
  });
  if (res.status === 404 && opts.ok404) return null;
  if (!res.ok) throw Object.assign(new Error(`GitHub ${opts.method || "GET"} ${path}: ${res.status}`), { status: res.status });
  return res.json();
}
const lesFil = async (path, branch) => {
  const f = await gh(`/contents/${path}?ref=${branch}`, { ok404: true });
  return f ? Buffer.from(f.content, "base64").toString("utf8") : null;
};

async function publiserAlt() {
  const store = deps.store();
  const klare = (await alleMeta(store)).filter((m) => m.status === "godkjent");
  if (!klare.length) return { antall: 0 };
  if (!process.env.GITHUB_TOKEN) throw Object.assign(new Error("GITHUB_TOKEN mangler"), { status: 503 });
  const branch = "main";

  // alt-tekst først (kan ta tid, og trenger ikke GitHub)
  for (const m of klare) {
    try {
      const { data, metadata } = await store.getWithMetadata(`ren/${m.id}`, { type: "arrayBuffer" });
      const r = await spørClaude(3, [{ type: metadata?.type || "image/webp", data: Buffer.from(data).toString("base64") }]);
      m._alt = String(r.alt || "").trim().slice(0, 200);
    } catch { m._alt = ""; }
  }

  for (let forsøk = 0; forsøk < 3; forsøk++) {
    const ref = await gh(`/git/ref/heads/${branch}`);
    const head = ref.object.sha;
    const commit = await gh(`/git/commits/${head}`);
    const utst = JSON.parse(await lesFil("content/exhibitions.json", branch));
    const rengjort = JSON.parse((await lesFil("content/rengjort.json", branch)) || "[]");
    const slugs = new Set(utst.map((e) => e.slug));
    const tree = [], brukt = new Set(), resultat = [];

    for (const m of klare) {
      const { data, metadata } = await store.getWithMetadata(`ren/${m.id}`, { type: "arrayBuffer" });
      const ext = (metadata?.type || "").includes("jpeg") ? "jpg" : "webp";
      const mappeSlug = slugs.has(m.exhibition) ? m.exhibition : null;
      const mappe = mappeSlug ? `images/utstillinger/${mappeSlug}` : "images/rengjort";
      const finnes = new Set(((await gh(`/contents/${mappe}?ref=${branch}`, { ok404: true })) || []).map((f) => f.name));
      const base = slug(m.title) || `verk-${m.id.slice(0, 6)}`;
      let navn = `${base}.${ext}`, n = 1;
      while (finnes.has(navn) || brukt.has(`${mappe}/${navn}`)) navn = `${base}-${++n}.${ext}`;
      brukt.add(`${mappe}/${navn}`);
      const blob = await gh("/git/blobs", { method: "POST", body: JSON.stringify({ content: Buffer.from(data).toString("base64"), encoding: "base64" }) });
      tree.push({ path: `${mappe}/${navn}`, mode: "100644", type: "blob", sha: blob.sha });
      const sti = `${mappe}/${navn}`.replace(/^images\//, "");
      const alt = m._alt || m.title || "Maleri av Anita Rufus Pamer";
      if (mappeSlug) utst.find((e) => e.slug === mappeSlug).works.push({ title: m.title || "", technique: "", size: "", year: "", image: sti, status: "", alt, kilde: m.filename || "" });
      else rengjort.push({ image: sti, title: m.title || "", alt, id: m.id, kilde: m.filename || "" });
      resultat.push({ id: m.id, sti });
    }
    tree.push({ path: "content/exhibitions.json", mode: "100644", type: "blob", content: JSON.stringify(utst, null, 2) + "\n" });
    if (rengjort.length) tree.push({ path: "content/rengjort.json", mode: "100644", type: "blob", content: JSON.stringify(rengjort, null, 2) + "\n" });
    const nyttTre = await gh("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
    const nyKommit = await gh("/git/commits", { method: "POST", body: JSON.stringify({ message: `Nye bilder fra Bildevask (${klare.length})`, tree: nyttTre.sha, parents: [head] }) });
    try {
      await gh(`/git/refs/heads/${branch}`, { method: "PATCH", body: JSON.stringify({ sha: nyKommit.sha, force: false }) });
    } catch (e) { if (e.status === 422 && forsøk < 2) continue; throw e; }
    const nå = new Date().toISOString();
    for (const r of resultat) {
      const m = await lesMeta(store, r.id);
      if (m) await skrivMeta(store, { ...m, status: "publisert", publisert: nå, sti: r.sti, commit: nyKommit.sha });
    }
    return { antall: resultat.length, commit: nyKommit.sha };
  }
  throw new Error("Kunne ikke publisere");
}

/* ---------- Ruter ---------- */
export default async function handler(req) {
  if (!process.env.BILDEVASK_KODE) return feil(503, "Bildevask er ikke satt opp ennå (BILDEVASK_KODE mangler i Netlify).");
  if (!kodeOk(req)) { await new Promise((r) => setTimeout(r, 400)); return feil(401, "Feil kode."); }
  const url = new URL(req.url);
  const del = url.pathname.replace(/^\/api\/bildevask\/?/, "").split("/").filter(Boolean);
  const store = deps.store();
  const rute = del[0];
  try {
    if (req.method === "GET" && rute === "liste") return json({ bilder: await alleMeta(store) });

    if (rute === "bilde" && TYPER.has(del[1]) && ID.test(del[2] || "")) {
      const key = `${del[1]}/${del[2]}`;
      if (req.method === "PUT") {
        const buf = new Uint8Array(await req.arrayBuffer());
        if (!buf.length || buf.length > MAKS_BYTES) return feil(413, "Bildet er for stort eller tomt.");
        const type = (req.headers.get("content-type") || "").split(";")[0];
        if (!/^image\/(jpeg|webp|png)$/.test(type)) return feil(415, "Bare JPG, PNG eller WebP.");
        await store.set(key, buf, { metadata: { type } });
        return json({ ok: true });
      }
      if (req.method === "GET") {
        const r = await store.getWithMetadata(key, { type: "arrayBuffer" });
        if (!r) return feil(404, "Finner ikke bildet.");
        return new Response(r.data, { headers: { "Content-Type": r.metadata?.type || "image/jpeg", "Cache-Control": "private, max-age=3600" } });
      }
    }

    if (req.method === "POST" && rute === "ny") {
      const b = await req.json();
      if (!ID.test(b.id || "")) return feil(400, "Ugyldig id.");
      if (!(await store.get(`orig/${b.id}`, { type: "arrayBuffer" }))) return feil(400, "Originalen mangler.");
      await skrivMeta(store, { id: b.id, filename: String(b.filename || "").slice(0, 200), exhibition: "", title: "", kommentar: "", status: "klar", lastet: new Date().toISOString() });
      return json({ ok: true });
    }

    if (req.method === "POST" && rute === "oppdater") {
      const b = await req.json();
      const m = ID.test(b.id || "") && (await lesMeta(store, b.id));
      if (!m) return feil(404, "Finner ikke bildet.");
      if (m.status === "publisert") return feil(409, "Bildet er allerede på nettsiden.");
      const nytt = { ...m };
      for (const [k, v] of Object.entries(b.felt || {})) {
        if (!FELT.has(k)) continue;
        if (k === "status" && !STATUSER.has(v)) continue;
        nytt[k] = typeof v === "string" ? v.slice(0, 500) : v;
      }
      nytt.endret = new Date().toISOString();
      await skrivMeta(store, nytt);
      return json({ ok: true });
    }

    if (req.method === "POST" && rute === "slett") {
      const b = await req.json();
      if (!ID.test(b.id || "")) return feil(400, "Ugyldig id.");
      const m = await lesMeta(store, b.id);
      if (m?.status === "publisert") return feil(409, "Bildet er allerede på nettsiden.");
      await Promise.all([...TYPER, "meta"].map((t) => store.delete(`${t}/${b.id}`)));
      return json({ ok: true });
    }

    if (req.method === "POST" && rute === "ai") {
      const b = await req.json();
      const steg = b.steg === 2 ? 2 : 1;
      const bilder = Array.isArray(b.bilder) ? b.bilder.slice(0, steg === 2 ? 4 : 1) : [];
      if (!bilder.length || bilder.some((x) => typeof x !== "string" || !x.startsWith("data:image/jpeg;base64,"))) return feil(400, "Mangler bilder.");
      const svar = await spørClaude(steg, bilder.map((x) => ({ type: "image/jpeg", data: x.slice(23) })), b.hint);
      return json(svar);
    }

    if (req.method === "POST" && rute === "publiser") {
      const lås = await store.get("lås", { type: "json" });
      if (lås && Date.now() - lås.t < 5 * 60 * 1000) return json({ opptatt: true });
      await store.setJSON("lås", { t: Date.now() });
      try { return json(await publiserAlt()); }
      finally { await store.delete("lås"); }
    }

    return feil(404, "Ukjent adresse.");
  } catch (e) {
    console.error(e);
    return feil(e.status && e.status < 600 ? (e.status === 401 || e.status === 403 ? 502 : e.status) : 500, e.message || "Noe gikk galt.");
  }
}
