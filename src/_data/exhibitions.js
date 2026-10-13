import { readFileSync } from "node:fs";

// Rekkefølgen i content/exhibitions.json er nyest øverst.
// Dybde («−8 m»), nummer og forrige/neste regnes ut her, ikke i datafilen.
export default () => {
  const list = JSON.parse(readFileSync("content/exhibitions.json", "utf8"));
  const n = list.length;
  return list.map((ex, i) => ({
    ...ex,
    index: i,
    depth: i * 8,
    url: `/utstillinger/${ex.slug}/`,
    works: ex.works || [],
    prev: { title: list[(i - 1 + n) % n].title, url: `/utstillinger/${list[(i - 1 + n) % n].slug}/` },
    next: { title: list[(i + 1) % n].title, url: `/utstillinger/${list[(i + 1) % n].slug}/` },
  }));
};
