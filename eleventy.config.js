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

  eleventyConfig.addPassthroughCopy({ "src/css": "css", "src/js": "js", "_redirects": "_redirects" });
  for (const f of FONTS) {
    eleventyConfig.addPassthroughCopy({ [`node_modules/@fontsource/${f}`]: `fonts/${path.basename(f)}` });
  }

  // Bilde fra images/: lager WebP i flere bredder med srcset, width og height.
  // Tom sti gir tom streng, så manglende bilder ikke vises.
  eleventyConfig.addAsyncShortcode("bilde", async (src, alt = "", sizes = "100vw", opts = {}) => {
    if (!src) return "";
    const meta = await Image(path.join("images", src), {
      widths: [480, 960, 1600, 2400],
      formats: ["webp"],
      outputDir: "_site/img/",
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

  eleventyConfig.addFilter("depth", (m) => (m ? `−${m} m` : "0 m"));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk"],
    htmlTemplateEngine: "njk",
  };
}
