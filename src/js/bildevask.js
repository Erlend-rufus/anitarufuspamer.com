// Bildevask: opplasting, rensing og godkjenning. Snakker med /api/bildevask/* (netlify/functions/bildevask.mjs).
const EXH = JSON.parse(document.getElementById("utstillinger").textContent);
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, attrs = {}, kids = []) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) { if (v === false || v == null) continue; if (k === "text") n.textContent = v; else n.setAttribute(k, v === true ? "" : v); }
  for (const c of [].concat(kids)) if (c) n.append(c);
  return n;
};
const LABEL = { klar: "Venter på rens", jobber: "Renser …", rengjort: "Til godkjenning", avvist: "Ikke godkjent", godkjent: "Publiseres …", publisert: "På nettsiden", feil: "Kunne ikke renses" };
const docs = new Map(), cards = new Map(), working = new Set(), urls = new Map();
let kode = "", runCtl = null, pubTimer = 0, pubBusy = false;

const say = (t) => { const m = $("#melding"); m.textContent = t; m.hidden = !t; };
const store = { get() { try { return localStorage.getItem("bildevask-kode") || ""; } catch { return ""; } }, set(v) { try { v ? localStorage.setItem("bildevask-kode", v) : localStorage.removeItem("bildevask-kode"); } catch {} } };

/* ---------- API ---------- */
async function api(path, opts = {}) {
  const res = await fetch("/api/bildevask/" + path, { ...opts, headers: { "x-kode": kode, ...(opts.json ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) }, body: opts.json ? JSON.stringify(opts.json) : opts.body });
  if (res.status === 401) { store.set(""); showGate("Feil kode."); throw Object.assign(new Error("kode"), { code: "kode" }); }
  if (!res.ok) { let m = ""; try { m = (await res.json()).feil; } catch {} throw Object.assign(new Error(m || "Noe gikk galt."), { status: res.status }); }
  return res;
}
const imageUrl = (type, id) => { const k = type + "/" + id; if (!urls.has(k)) urls.set(k, api(`bilde/${type}/${id}`).then((r) => r.blob()).then((b) => URL.createObjectURL(b)).catch(() => { urls.delete(k); return ""; })); return urls.get(k); };
const setImg = (img, type, id, alt) => { const k = type + "/" + id; img.alt = alt || ""; if (img.dataset.k === k) return; img.dataset.k = k; imageUrl(type, id).then((u) => { if (img.dataset.k === k && u) img.src = u; }); };
const put = (type, id, blob) => api(`bilde/${type}/${id}`, { method: "PUT", body: blob, headers: { "Content-Type": blob.type } });
const felt = (id, f) => { const d = docs.get(id); if (d) Object.assign(d, f); return api("oppdater", { method: "POST", json: { id, felt: f } }); };
const skrivTimer = new Map(), skrivKo = new Map();
const skriv = (id, f) => { // slår sammen felt som endres tett, så ingen går tapt
  const d = docs.get(id); if (d) Object.assign(d, f); skrivKo.set(id, { ...(skrivKo.get(id) || {}), ...f });
  clearTimeout(skrivTimer.get(id));
  skrivTimer.set(id, setTimeout(() => { const body = skrivKo.get(id); skrivKo.delete(id); skrivTimer.delete(id); felt(id, body).catch(() => say("Kunne ikke lagre endringen. Last siden på nytt og prøv igjen.")); }, 400));
};

async function last() {
  const { bilder } = await (await api("liste")).json();
  const nye = new Set(bilder.map((b) => b.id));
  for (const id of docs.keys()) if (!nye.has(id)) docs.delete(id);
  for (const b of bilder) { const lokal = docs.get(b.id); docs.set(b.id, lokal && skrivTimer.has(b.id) ? { ...b, ...skrivKo.get(b.id) } : b); }
  renderAll();
}

/* ---------- Kode ---------- */
function showGate(msg) { $("#app").hidden = true; $("#port").hidden = false; const f = $("#kodefeil"); f.textContent = msg || ""; f.hidden = !msg; }
async function start(k) {
  kode = k;
  try { await last(); } catch (e) { if (e.code === "kode") return; say(e.message); showGate(e.message); return; }
  store.set(kode); $("#port").hidden = true; $("#app").hidden = false;
  if ([...docs.values()].some((d) => d.status === "godkjent")) publiser();
}
$("#kodeskjema").addEventListener("submit", (e) => { e.preventDefault(); start($("#kode").value.trim()); });

/* ---------- Kort ---------- */
const effStatus = (d) => (working.has(d.id) ? "jobber" : d.status);
function build(id) {
  const root = el("article", { class: "card", "data-id": id }), refs = {};
  refs.name = el("span", { class: "card__name" }); refs.chip = el("span", { class: "chip" });
  root.append(el("div", { class: "card__top" }, [refs.name, refs.chip]));
  refs.pic = el("div", { class: "pic" }); refs.img = el("img", { alt: "" }); refs.pic.append(refs.img); root.append(refs.pic);
  refs.pair = el("div", { class: "pair" });
  refs.before = el("img", { alt: "" }); refs.after = el("img", { alt: "" });
  refs.pair.append(el("figure", {}, [el("div", { class: "pic" }, [refs.before]), el("figcaption", { text: "Før" })]), el("figure", {}, [el("div", { class: "pic pic--check" }, [refs.after]), el("figcaption", { text: "Etter" })]));
  root.append(refs.pair);
  refs.note = el("p", { class: "hint" }); root.append(refs.note);
  const sel = el("select", { id: "u-" + id }, [el("option", { value: "", text: "Velg utstilling (valgfritt)" }), ...EXH.map((e) => el("option", { value: e.slug, text: e.title })), el("option", { value: "ingen", text: "Ingen utstilling" })]);
  sel.addEventListener("change", () => skriv(id, { exhibition: sel.value }));
  refs.exh = sel; refs.exhWrap = el("label", { class: "f", for: sel.id }, ["Hører til utstilling", sel]); root.append(refs.exhWrap);
  const title = el("input", { type: "text", id: "n-" + id, placeholder: "Verkets tittel, hvis du vet den" });
  title.addEventListener("input", () => skriv(id, { title: title.value.trim() }));
  refs.title = title; refs.titleWrap = el("label", { class: "f", for: title.id }, ["Navn på verket", title]); root.append(refs.titleWrap);
  refs.appr = el("div", { class: "row" }); root.append(refs.appr);
  refs.comment = el("textarea", { id: "k-" + id, placeholder: "Hva gikk galt? (valgfritt)" });
  refs.comment.addEventListener("input", () => skriv(id, { kommentar: refs.comment.value.trim() }));
  refs.commentWrap = el("label", { class: "f", for: refs.comment.id }, ["Kommentar", refs.comment]); root.append(refs.commentWrap);
  refs.del = el("button", { class: "btn btn--line btn--small", type: "button", text: "Fjern bildet" });
  let armed = 0;
  refs.del.addEventListener("click", async () => {
    if (!armed) { armed = 1; refs.del.textContent = "Trykk igjen for å fjerne"; setTimeout(() => { armed = 0; refs.del.textContent = "Fjern bildet"; }, 4000); return; }
    refs.del.disabled = true;
    try { await api("slett", { method: "POST", json: { id } }); docs.delete(id); renderAll(); } catch (e) { say(e.message || "Kunne ikke fjerne bildet."); refs.del.disabled = false; }
  });
  refs.delRow = el("div", { class: "row" }, [refs.del]); root.append(refs.delRow);
  cards.set(id, { root, refs }); return cards.get(id);
}
const setVal = (node, v) => { if (document.activeElement !== node && node.value !== (v ?? "")) node.value = v ?? ""; };
const btn = (text, fn, line = true) => { const b = el("button", { class: "btn btn--small" + (line ? " btn--line" : ""), type: "button", text }); b.addEventListener("click", fn); return b; };
const sett = async (id, status, extra = {}) => { try { await felt(id, { status, ...extra }); } catch (e) { say(e.message || "Kunne ikke lagre."); } renderAll(); };
function render(id) {
  const d = docs.get(id); if (!d) return;
  const c = cards.get(id) || build(id), r = c.refs, st = effStatus(d);
  r.name.textContent = d.filename || "";
  r.chip.textContent = LABEL[st]; r.chip.classList.toggle("chip--ok", st === "godkjent" || st === "publisert");
  const both = d.renW && ["rengjort", "avvist", "godkjent", "publisert"].includes(st);
  r.pic.hidden = !!both; r.pair.hidden = !both;
  setImg(r.img, "tn", id, d.title || d.filename); if (both) { setImg(r.before, "tn", id, "Før: " + (d.title || d.filename)); setImg(r.after, "rtn", id, "Etter: " + (d.title || d.filename)); }
  r.note.textContent = st === "feil" ? (d.feil || "Jeg klarte ikke å rense dette bildet.") : d.uendret && both ? "Jeg fant ikke et rektangulært verk her, så bildet er bare gjort mindre." : "";
  r.note.hidden = !r.note.textContent;
  const frozen = st === "godkjent" || st === "publisert";
  r.exhWrap.hidden = r.titleWrap.hidden = frozen;
  setVal(r.exh, d.exhibition); setVal(r.title, d.title); setVal(r.comment, d.kommentar);
  r.appr.replaceChildren();
  if (st === "rengjort" || st === "avvist") {
    r.appr.append(btn("Godkjenn", async () => { await sett(id, "godkjent"); publiserSnart(); }, false), btn(st === "avvist" ? "Ikke godkjent ✓" : "Ikke godkjent", () => sett(id, "avvist")));
    if (st === "avvist") r.appr.append(btn("Prøv igjen", async () => { await sett(id, "klar"); runClean([id]); }));
  } else if (st === "feil") r.appr.append(btn("Prøv igjen", async () => { await sett(id, "klar", { feil: "" }); runClean([id]); }));
  else if (st === "godkjent") r.appr.append(btn("Angre godkjenning", () => sett(id, "rengjort")));
  r.commentWrap.hidden = st !== "avvist";
  r.delRow.hidden = st === "jobber" || st === "publisert";
  const target = frozen ? $("#ferdig") : ["rengjort", "avvist"].includes(st) && d.renW ? $("#rengjort") : $("#mine");
  if (c.root.parentElement !== target) target.append(c.root);
}
function renderAll() {
  for (const id of docs.keys()) render(id);
  for (const [id, c] of cards) if (!docs.has(id)) { c.root.remove(); cards.delete(id); }
  for (const key of ["mine", "rengjort", "ferdig"]) {
    const box = $("#" + key), n = box.children.length;
    $("#tom-" + key).hidden = n > 0; $("#n-" + key).textContent = n ? n + (n === 1 ? " bilde" : " bilder") : "";
    [...box.children].sort((a, b) => (docs.get(a.dataset.id)?.lastet || "").localeCompare(docs.get(b.dataset.id)?.lastet || "")).forEach((x) => box.append(x));
  }
  const waiting = [...docs.values()].filter((d) => effStatus(d) === "klar").length;
  $("#start").hidden = !!runCtl || !waiting; $("#start").textContent = `Start rensing (${waiting})`; $("#stopp").hidden = !runCtl;
  const toApprove = [...docs.values()].filter((d) => d.status === "rengjort" && d.renW).length;
  $("#alle").hidden = !toApprove; $("#alle").textContent = `Godkjenn alle (${toApprove})`;
  $("#publiser").hidden = !([...docs.values()].some((d) => d.status === "godkjent") && !pubBusy);
}

/* ---------- Opplasting ---------- */
const toBlob = (canvas, type, q) => new Promise((res) => canvas.toBlob(res, type, q));
async function scaled(bmp, maxSide, q, limit) {
  const k = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
  cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
  let blob = await toBlob(cv, "image/jpeg", q);
  while (limit && blob.size > limit && q > 0.5) { q -= 0.08; blob = await toBlob(cv, "image/jpeg", q); }
  return blob;
}
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
async function upload(files) {
  const prog = $("#fremdrift"); let ok = 0, fail = 0; const list = [...files];
  for (let i = 0; i < list.length; i++) {
    const f = list[i]; prog.textContent = `Laster opp ${i + 1} av ${list.length}: ${f.name}`;
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) throw new Error("type");
      const bmp = await createImageBitmap(f, { imageOrientation: "from-image" }), id = rid();
      await put("orig", id, await scaled(bmp, 2600, 0.9, 5 * 1048576));
      await put("tn", id, await scaled(bmp, 700, 0.8));
      await api("ny", { method: "POST", json: { id, filename: f.name } });
      bmp.close?.(); ok++;
    } catch (e) { if (e.code === "kode") return; fail++; }
  }
  prog.textContent = ok ? `${ok} ${ok === 1 ? "bilde er" : "bilder er"} lastet opp.` + (fail ? ` ${fail} kunne ikke lastes opp (bare JPG, PNG og WebP).` : "") : (fail ? "Ingen bilder ble lastet opp. Bruk JPG, PNG eller WebP." : "");
  $("#filer").value = ""; await last();
}
$("#filer").addEventListener("change", (e) => { if (e.target.files.length) upload(e.target.files); });
const drop = $("#drop");
["dragenter", "dragover"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
["dragleave", "drop"].forEach((t) => drop.addEventListener(t, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
drop.addEventListener("drop", (e) => { if (e.dataTransfer.files.length) upload(e.dataTransfer.files); });

/* ---------- Rensing: Claude finner hjørnene, nettleseren retter opp bildet ---------- */
const MAKS = 2400;
const area = (q) => Math.abs(q.reduce((s, p, i) => { const n = q[(i + 1) % 4]; return s + p[0] * n[1] - n[0] * p[1]; }, 0)) / 2;
function convex(q) { let sign = 0; for (let i = 0; i < 4; i++) { const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4]; const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]); if (!z) return false; if (!sign) sign = Math.sign(z); else if (Math.sign(z) !== sign) return false; } return true; }
const okQuad = (q) => Array.isArray(q) && q.length === 4 && q.every((p) => Array.isArray(p) && p.length === 2 && p.every((v) => Number.isFinite(v) && v >= -0.02 && v <= 1.02)) && convex(q) && area(q) > 0.12;
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const dataUrl = (blob) => new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
async function ai(steg, blobs, hint) { return (await api("ai", { method: "POST", json: { steg, bilder: await Promise.all(blobs.map(dataUrl)), hint } })).json(); }
async function findCorners(bmp, hint) {
  const r1 = await ai(1, [await scaled(bmp, 1400, 0.9)], hint);
  if (r1?.verk !== "flatt") return null;
  let q = r1.hjorner; if (!okQuad(q)) throw { code: "ugyldig" };
  q = q.map((p) => [clamp01(p[0]), clamp01(p[1])]);
  try { // andre runde: ett utsnitt rundt hvert hjørne
    const W = bmp.width, H = bmp.height, s = Math.round(0.2 * Math.max(W, H)), crops = [];
    for (const p of q) {
      const cv = document.createElement("canvas"); cv.width = cv.height = 480; const x = cv.getContext("2d"); x.fillStyle = "#808080"; x.fillRect(0, 0, 480, 480);
      x.drawImage(bmp, p[0] * W - s / 2, p[1] * H - s / 2, s, s, 0, 0, 480, 480); crops.push(await toBlob(cv, "image/jpeg", 0.9));
    }
    const r2 = await ai(2, crops, hint);
    const q2 = (r2?.hjorner || []).map((p, i) => [clamp01((q[i][0] * W - s / 2 + p[0] * s) / W), clamp01((q[i][1] * H - s / 2 + p[1] * s) / H)]);
    if (q2.length === 4 && okQuad(q2) && area(q2) / area(q) > 0.8 && area(q2) / area(q) < 1.25) q = q2;
  } catch (e) { if (e.code === "kode" || e.status === 429 || e.status === 503) throw e; }
  return q;
}
function solve(A, b) {
  const n = b.length; for (let i = 0; i < n; i++) A[i].push(b[i]);
  for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r; [A[c], A[p]] = [A[p], A[c]];
    for (let r = c + 1; r < n; r++) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; } }
  const x = new Array(n).fill(0); for (let i = n - 1; i >= 0; i--) { let s = A[i][n]; for (let k = i + 1; k < n; k++) s -= A[i][k] * x[k]; x[i] = s / A[i][i]; } return x;
}
function warp(bmp, q) {
  const W = bmp.width, H = bmp.height, src = q.map((p) => [p[0] * W, p[1] * H]);
  const d = (a, b) => Math.hypot(src[a][0] - src[b][0], src[a][1] - src[b][1]);
  let w = Math.max(d(0, 1), d(3, 2)), h = Math.max(d(0, 3), d(1, 2)); const k = Math.min(1, MAKS / Math.max(w, h)); w = Math.max(2, Math.round(w * k)); h = Math.max(2, Math.round(h * k));
  const dst = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
  for (let i = 0; i < 4; i++) { const [u, v] = dst[i], [x, y] = src[i]; A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x); A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y); }
  const [a1, b1, c1, d1, e1, f1, g1, h1] = solve(A, b);
  const sc = document.createElement("canvas"); sc.width = W; sc.height = H; const sx = sc.getContext("2d", { willReadFrequently: true }); sx.drawImage(bmp, 0, 0);
  const S = sx.getImageData(0, 0, W, H).data, out = new ImageData(w, h), O = out.data;
  for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) {
    const z = g1 * u + h1 * v + 1, x = (a1 * u + b1 * v + c1) / z, y = (d1 * u + e1 * v + f1) / z;
    const x0 = Math.min(W - 2, Math.max(0, Math.floor(x))), y0 = Math.min(H - 2, Math.max(0, Math.floor(y))), fx = Math.min(1, Math.max(0, x - x0)), fy = Math.min(1, Math.max(0, y - y0));
    const i00 = (y0 * W + x0) * 4, i10 = i00 + 4, i01 = i00 + W * 4, i11 = i01 + 4, o = (v * w + u) * 4;
    for (let ch = 0; ch < 3; ch++) O[o + ch] = S[i00 + ch] * (1 - fx) * (1 - fy) + S[i10 + ch] * fx * (1 - fy) + S[i01 + ch] * (1 - fx) * fy + S[i11 + ch] * fx * fy;
    O[o + 3] = 255;
  }
  return out;
}
function levels(img) { // forsiktig lysjustering, aldri mer enn 25 %
  const D = img.data, hist = new Uint32Array(256); let n = 0;
  for (let i = 0; i < D.length; i += 28) { hist[Math.round(0.299 * D[i] + 0.587 * D[i + 1] + 0.114 * D[i + 2])]++; n++; }
  let lo = 0, hi = 255, acc = 0; for (let i = 0; i < 256; i++) { acc += hist[i]; if (acc >= n * 0.005) { lo = i; break; } }
  acc = 0; for (let i = 255; i >= 0; i--) { acc += hist[i]; if (acc >= n * 0.005) { hi = i; break; } }
  lo = Math.min(lo, 25); hi = Math.max(hi, 215); const gain = Math.min(1.25, 255 / (hi - lo));
  if (gain < 1.03 && lo < 6) return img;
  for (let i = 0; i < D.length; i += 4) for (let c = 0; c < 3; c++) D[i + c] = (D[i + c] - lo) * gain;
  return img;
}
async function encode(source) {
  const cv = document.createElement("canvas"); cv.width = source.width; cv.height = source.height; const x = cv.getContext("2d");
  if (source instanceof ImageData) x.putImageData(source, 0, 0); else x.drawImage(source, 0, 0);
  let blob = await toBlob(cv, "image/webp", 0.85); if (!blob || blob.type !== "image/webp") blob = await toBlob(cv, "image/jpeg", 0.9);
  const tn = await scaled(cv, 700, 0.8); // forhåndsvisning
  return { blob, tn, w: cv.width, h: cv.height };
}
async function cleanOne(id) {
  const d = docs.get(id); if (!d) return;
  working.add(id); render(id);
  let bmp;
  try {
    bmp = await createImageBitmap(await (await api(`bilde/orig/${id}`)).blob());
    const q = await findCorners(bmp, d.kommentar);
    let enc, uendret = false;
    if (q) enc = await encode(levels(warp(bmp, q)));
    else { const k = Math.min(1, MAKS / Math.max(bmp.width, bmp.height)); const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height); enc = await encode(cv); uendret = true; }
    urls.delete(`rtn/${id}`); for (const r of cards.values()) if (r.root.dataset.id === id) r.refs.after.dataset.k = "";
    await put("ren", id, enc.blob); await put("rtn", id, enc.tn);
    await felt(id, { status: "rengjort", renW: enc.w, renH: enc.h, uendret, hjorner: q ? q.map((p) => [+p[0].toFixed(4), +p[1].toFixed(4)]) : null, feil: "" });
  } catch (e) {
    if (["kode", "cancelled"].includes(e?.code) || e?.status === 429 || e?.status === 503) throw e;
    await felt(id, { status: "feil", feil: e?.code === "ugyldig" ? "Jeg fant ikke hjørnene på verket. Prøv igjen, eller last opp et bilde der hele verket er synlig." : "Noe gikk galt under rensingen. Prøv igjen." }).catch(() => {});
  } finally { bmp?.close?.(); working.delete(id); await last().catch(() => {}); }
}
async function runClean(ids) {
  if (runCtl) return; runCtl = new AbortController(); renderAll();
  const list = ids || [...docs.values()].filter((d) => effStatus(d) === "klar").map((d) => d.id);
  let i = 0, msg = "";
  try { for (const id of list) { if (runCtl.signal.aborted) throw { code: "cancelled" }; $("#rens-status").textContent = `Renser ${++i} av ${list.length} …`; await cleanOne(id); } msg = list.length ? "Ferdig. Se resultatet under «Rengjort»." : ""; }
  catch (e) { msg = e?.code === "cancelled" ? "Stoppet." : e?.code === "kode" ? "" : e?.status === 429 ? "Claude trenger en pause. Prøv igjen om litt." : e?.status === 503 ? "Rensingen er ikke satt opp ennå. Si fra til Erlend." : "Rensingen stoppet. Prøv igjen."; }
  runCtl = null; $("#rens-status").textContent = msg; renderAll();
}
$("#start").addEventListener("click", () => runClean());
$("#stopp").addEventListener("click", () => runCtl?.abort());
$("#alle").addEventListener("click", async () => {
  const ids = [...docs.values()].filter((d) => d.status === "rengjort" && d.renW).map((d) => d.id);
  for (const id of ids) await felt(id, { status: "godkjent" }).catch(() => {}); await last(); publiserSnart();
});

/* ---------- Publisering ---------- */
function publiserSnart() { clearTimeout(pubTimer); pubTimer = setTimeout(publiser, 2500); }
async function publiser() {
  if (pubBusy) return; pubBusy = true; renderAll();
  try {
    const r = await (await api("publiser", { method: "POST" })).json();
    say(r.antall ? `${r.antall} ${r.antall === 1 ? "bilde er" : "bilder er"} lagt på nettsiden. Det tar et par minutter før de vises.` : "");
  } catch (e) { if (e.code !== "kode") say("Publiseringen feilet: " + (e.message || "ukjent feil") + " Trykk «Prøv å publisere igjen» litt senere."); }
  pubBusy = false; await last().catch(() => {});
}
$("#publiser").addEventListener("click", publiser);

/* ---------- Oppstart ---------- */
document.addEventListener("visibilitychange", () => { if (!document.hidden && kode && !runCtl) last().catch(() => {}); });
setInterval(() => { if (!document.hidden && kode && !runCtl && !working.size) last().catch(() => {}); }, 30000);
const lagret = store.get();
if (lagret) start(lagret); else showGate("");
