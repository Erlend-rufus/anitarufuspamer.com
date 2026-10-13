import { readFileSync } from "node:fs";

export default () => JSON.parse(readFileSync("content/portraits.json", "utf8"));
