import path from "node:path";
import Image from "@11ty/eleventy-img";

const FONTS = [
  "pt-serif/files/pt-serif-latin-400-normal.woff2",
  "pt-serif/files/pt-serif-latin-400-italic.woff2",
  "pt-serif/files/pt-serif-latin-700-normal.woff2",
  "fira-sans/files/fira-sans-latin-300-normal.woff2",
  "fira-sans/files/fira-sans-latin-400-normal.woff2",
  "fira-sans/files/fira-sans-latin-500-normal.woff2",
];

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget("content/");
  eleventyConfig.addWatchTarget("images/");

  eleventyConfig.addPassthroughCopy({ "src/css": "css", "src/js": "js", "src/plassholder": "plassholder", "_redirects": "_redirects" });
  for (const f of FONTS) {
    eleventyConfig.addPassthroughCopy({ [`node_modules/@fontsource/${f}`]: `fonts/${path.basename(f)}` });
  }

  // Bilde fra images/: lager WebP i flere bredder med srcset, width og height.
  // Uten bilde: plassholder (utsnitt eller grå flate) når opts.crop/opts.label finnes, ellers ingenting.
  eleventyConfig.addAsyncShortcode("bilde", async (src, alt = "", sizes = "100vw", opts = {}) => {
    if (!src) {
      if (!opts.crop && !opts.label) return "";
      const style = [opts.crop || "", opts.aspect ? `aspect-ratio:${opts.aspect}` : ""].filter(Boolean).join(";");
      const label = opts.label ? `<span class="ph__label">${opts.label}</span>` : "";
      return `<div class="ph${opts.label ? " ph--grey" : ""}" style="${style}" aria-hidden="true">${label}</div>`;
    }
    const meta = await Image(path.join("images", src), {
      widths: [480, 960, 1600, "auto"], // "auto" = originalen (maks 2400 px)
      formats: ["webp"],
      outputDir: path.join(eleventyConfig.directories.output, "img"),
      urlPath: "/img/",
    });
    return Image.generateHTML(meta, {
      alt,
      sizes,
      loading: opts.eager ? "eager" : "lazy",
      decoding: "async",
      ...(opts.eager ? { fetchpriority: "high" } : {}),
      ...(opts.class ? { class: opts.class } : {}),
    });
  });

  // Delingsbilde (Open Graph): én JPEG, 1200 px bred. Returnerer stien.
  eleventyConfig.addAsyncShortcode("ogbilde", async (src) => {
    if (!src) return "";
    const meta = await Image(path.join("images", src), {
      widths: [1200],
      formats: ["jpeg"],
      outputDir: path.join(eleventyConfig.directories.output, "img"),
      urlPath: "/img/",
    });
    return meta.jpeg[0].url;
  });

  // «Teknikk · mål · år» uten tomme felt.
  eleventyConfig.addFilter("meta", (parts) => (parts || []).filter(Boolean).join(" · "));
  eleventyConfig.addFilter("pad2", (n) => String(n).padStart(2, "0"));

  // Myke bindestreker i lange sammensatte ord («Master-utstil-ling»), så store overskrifter kan deles pent.
  eleventyConfig.addFilter("myk", (s) =>
    String(s || "").replace(/(\p{L}{4,})(utstil)(ling)/giu, "$1\u00AD$2\u00AD$3"));
  // Lengste ord i en tittel (brukes til å velge mindre overskrift for svært lange ord).
  eleventyConfig.addFilter("longestWord", (s) => Math.max(0, ...String(s || "").split(/\s+/).map((w) => w.length)));

  eleventyConfig.addFilter("depth", (m) => (m ? `−${m} m` : "0 m"));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
