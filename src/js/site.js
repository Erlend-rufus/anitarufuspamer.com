// Felles skript: mobilmeny og scroll-styrte verdier.
// Scroll-verdier regnes ut i én lytter (throttlet med requestAnimationFrame)
// og settes som CSS-variabler. DOM bygges ikke om.

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/* ---------- Mobilmeny ---------- */
const toggle = document.querySelector(".topbar__toggle");
const panel = document.getElementById("meny");

function setMenu(open) {
  if (!toggle || !panel) return;
  panel.hidden = !open;
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "Lukk" : "Meny";
}

if (toggle && panel) {
  toggle.addEventListener("click", () => setMenu(panel.hidden));
  panel.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) { setMenu(false); toggle.focus(); }
  });
  window.matchMedia("(min-width: 860px)").addEventListener("change", (e) => { if (e.matches) setMenu(false); });
}

/* ---------- Scroll ---------- */
const gauge = document.querySelector(".gauge");
const gaugeLabel = document.querySelector("[data-gauge-label]");
const onScroll = []; // sidespesifikke funksjoner legges til her: fn({ y, p, vh, vw })

function update() {
  const doc = document.documentElement;
  const y = window.scrollY;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const p = Math.min(1, Math.max(0, y / Math.max(1, doc.scrollHeight - vh)));

  if (gauge) {
    gauge.style.setProperty("--p", p.toFixed(4));
    const n = Math.round(p * 96);
    gaugeLabel.textContent = n ? `−${n} m` : "0 m";
  }
  if (!reducedMotion.matches) for (const fn of onScroll) fn({ y, p, vh, vw });
}

let frame = 0;
function schedule() {
  if (frame) return;
  frame = requestAnimationFrame(() => { frame = 0; update(); });
}
window.addEventListener("scroll", schedule, { passive: true });
window.addEventListener("resize", schedule);
window.addEventListener("load", schedule);
reducedMotion.addEventListener("change", schedule);


const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (u) => u * u * (3 - 2 * u);
const pad2 = (n) => String(n).padStart(2, "0");

/* ---------- Forside: hovedbilde som bytter verk ved scroll ---------- */
const hero = document.querySelector("[data-hero]");
if (hero) {
  const layers = [...hero.querySelectorAll(".hero__layer")];
  const caps = [...hero.querySelectorAll(".hero__cap")];
  const edges = [...hero.querySelectorAll(".hero__edge")];
  const ticks = [...hero.querySelectorAll(".hero__ticks span")];
  const count = hero.querySelector("[data-hero-count]");

  onScroll.push(({ vh }) => {
    const step = Math.max(480, Math.round(vh * 0.75));
    const t = (72 - hero.getBoundingClientRect().top) / step;
    const r = layers.map((_, i) => (i === 0 ? 1 : smooth(clamp((t - (i - 1) - 0.15) / 0.7))));
    const a = r.slice(1).reduce((s, v) => s + v, 0);

    layers.forEach((el, i) => {
      const next = r[i + 1] ?? 0;
      el.style.setProperty("--r", r[i].toFixed(4));
      el.style.setProperty("--ty", ((i ? (1 - r[i]) * 36 : 0) - next * 40).toFixed(1));
      el.style.setProperty("--dim", (next * 0.35).toFixed(3));
    });
    edges.forEach((el, k) => {
      const v = r[k + 1];
      el.style.setProperty("--r", v.toFixed(4));
      el.style.setProperty("--eo", v > 0.01 && v < 0.99 ? 1 : 0);
    });
    caps.forEach((el, i) => el.style.setProperty("--o", clamp(1 - Math.abs(a - i) * 2.5).toFixed(2)));
    ticks.forEach((el, i) => el.classList.toggle("is-active", Math.abs(a - i) < 0.5));
    if (count) count.textContent = pad2(Math.round(a) + 1);
  });
}

/* ---------- Utstillingsside: bakgrunnen mørkner med dybden ---------- */
if (document.body.classList.contains("exh")) {
  const page = document.querySelector(".page");
  const reset = () => ["--page-bg", "--page-fg", "--page-line"].forEach((k) => page.style.removeProperty(k));
  onScroll.push(({ p }) => {
    const v = Math.round(255 - 196 * clamp((p - 0.1) / 0.8));
    const dark = v < 150;
    page.style.setProperty("--page-bg", `rgb(${v}, ${v}, ${v})`);
    page.style.setProperty("--page-fg", dark ? "#fff" : "#3B3B3B");
    page.style.setProperty("--page-line", dark ? "rgba(255,255,255,.4)" : "rgba(59,59,59,.3)");
  });
  reducedMotion.addEventListener("change", (e) => { if (e.matches) reset(); });
}

/* ---------- Lysboks (portretter) ---------- */
const lightbox = document.querySelector("[data-lightbox]");
let lbIndex = 0;
if (lightbox) {
  const slides = [...lightbox.querySelectorAll("[data-slide]")];
  const show = (i) => {
    lbIndex = (i + slides.length) % slides.length;
    slides.forEach((s, k) => { s.hidden = k !== lbIndex; });
  };
  document.querySelectorAll("[data-lightbox-open]").forEach((btn) => {
    btn.addEventListener("click", () => { show(Number(btn.dataset.lightboxOpen)); lightbox.showModal(); });
  });
  lightbox.addEventListener("click", (e) => {
    const step = e.target.closest("[data-lightbox-step]");
    if (step) show(lbIndex + Number(step.dataset.lightboxStep));
    if (e.target.closest("[data-lightbox-close]")) lightbox.close();
  });
  lightbox.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") show(lbIndex + 1);
    if (e.key === "ArrowLeft") show(lbIndex - 1);
  });
}

/* ---------- Forespørsel (Netlify Forms) ---------- */
const form = document.querySelector("[data-inquiry-form]");
if (form) {
  const work = form.querySelector("[data-inquiry-work]");
  const error = form.querySelector("[data-inquiry-error]");
  const submit = form.querySelector("[data-inquiry-submit]");
  const name = form.elements["navn"];
  const email = form.elements["e-post"];

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-inquire]");
    if (!btn) return;
    work.value = btn.dataset.inquire;
    if (lightbox?.open) lightbox.close();
    submit.disabled = false;
    submit.textContent = "Send";
    document.getElementById("foresporsel").scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth" });
    name.focus({ preventScroll: true });
  });

  const fail = (msg, field) => {
    error.textContent = msg;
    error.hidden = false;
    if (field) { field.setAttribute("aria-invalid", "true"); field.focus(); }
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    [name, email].forEach((f) => f.removeAttribute("aria-invalid"));
    error.hidden = true;
    if (!name.value.trim()) return fail("Skriv inn navnet ditt.", name);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) return fail("Skriv inn en gyldig e-postadresse.", email);

    submit.disabled = true;
    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!res.ok) throw new Error(res.status);
      submit.textContent = "Takk — sendt";
      name.value = ""; email.value = ""; form.elements["melding"].value = "";
    } catch {
      submit.disabled = false;
      fail("Beklager, meldingen ble ikke sendt. Prøv igjen litt senere.");
    }
  });
}

/* ---------- Instagram ---------- */
const ig = document.querySelector("[data-instagram]");
if (ig) {
  const grid = ig.querySelector("[data-instagram-grid]");
  const date = new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" });
  fetch("/.netlify/functions/instagram")
    .then((r) => (r.ok ? r.json() : []))
    .catch(() => [])
    .then((posts) => {
      if (!Array.isArray(posts) || !posts.length) return;
      for (const p of posts.slice(0, 6)) {
        const a = document.createElement("a");
        a.className = "ig-item";
        a.href = p.permalink;
        a.target = "_blank";
        a.rel = "noopener";
        const box = document.createElement("span");
        box.className = "ig-item__img";
        const img = document.createElement("img");
        img.src = p.mediaUrl;
        img.alt = p.caption ? p.caption.slice(0, 120) : "Innlegg på Instagram";
        img.loading = "lazy";
        box.append(img);
        a.append(box);
        if (p.timestamp) {
          const d = document.createElement("span");
          d.className = "ig-item__date";
          d.textContent = date.format(new Date(p.timestamp));
          a.append(d);
        }
        if (p.caption) {
          const c = document.createElement("span");
          c.className = "ig-item__caption";
          c.textContent = p.caption;
          a.append(c);
        }
        grid.append(a);
      }
      ig.hidden = false;
    });
}

// Første utregning etter at alle sidefunksjoner er registrert.
update();
