import { readFileSync } from "node:fs";
import * as ph from "../../lib/plassholdere.js";

// Rekkefølgen i content/exhibitions.json er nyest øverst.
// Dybde («−8 m»), nummer og forrige/neste regnes ut her, ikke i datafilen.
export default () => {
  let list = JSON.parse(readFileSync("content/exhibitions.json", "utf8"));
  const site = JSON.parse(readFileSync("content/site.json", "utf8"));
  if (site.plassholdere) list = ph.exhibitions(list);
  const n = list.length;
  return list.map((ex, i) => ({
    ...ex,
    index: i,
    depth: i * 8,
    url: `/utstillinger/${ex.slug}/`,
    works: (ex.works || []).filter((w) => w.image || w.crop || w.label),
    prev: { title: list[(i - 1 + n) % n].title, url: `/utstillinger/${list[(i - 1 + n) % n].slug}/` },
    next: { title: list[(i + 1) % n].title, url: `/utstillinger/${list[(i + 1) % n].slug}/` },
  }));
};
