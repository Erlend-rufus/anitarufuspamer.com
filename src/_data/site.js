import { readFileSync } from "node:fs";
import * as ph from "../../lib/plassholdere.js";

export default () => {
  const site = JSON.parse(readFileSync("content/site.json", "utf8"));
  return site.plassholdere ? ph.site(site) : site;
};
