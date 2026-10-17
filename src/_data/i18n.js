import { build } from "../../lib/content.js";

// i18n.no og i18n.en: samme innhold på to språk. Maler henter alt derfra via `L = i18n[lang]`.
export default () => ({ no: build("no"), en: build("en") });
