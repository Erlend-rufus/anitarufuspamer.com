import { readFileSync } from "node:fs";
import * as ph from "../../lib/plassholdere.js";

export default () => {
  const list = JSON.parse(readFileSync("content/portraits.json", "utf8"));
  const site = JSON.parse(readFileSync("content/site.json", "utf8"));
  const real = list.filter((p) => p.image);
  return site.plassholdere ? ph.portraits(real) : real;
};
