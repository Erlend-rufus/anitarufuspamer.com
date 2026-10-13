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
update();

window.ARP = { onScroll, schedule, reducedMotion };
