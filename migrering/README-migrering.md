# Flytting fra Webnode

Mål: få med alle bilder og tekster før Webnode-abonnementet eller domenet flyttes. Bildene ligger på Webnodes server og forsvinner når abonnementet avsluttes.

## Rekkefølge
1. **Hent alt nå** (under). Webnode-siden skal fortsatt være aktiv.
2. **Bygg den nye siden** og test den på Netlifys midlertidige adresse (`xxx.netlify.app`).
3. **Pek domenet til Netlify** når alt er sjekket. Legg inn `_redirects` (ligger i denne mappen) samtidig.
4. **Si opp Webnode** først etter at den nye siden har vært oppe noen dager.

## Hent innholdet
```
cd migrering
node scrape-webnode.mjs
```
Krever Node 18+. Skriptet leser de 16 sidene vi vet om (forside, Mitt arbeid, Om meg, Kontakt og de 12 utstillingene), følger lenker og `sitemap.xml` hvis den finnes, og lagrer:
- `scrape-output/images/<side>/…`: bilder i originalstørrelse når Webnode har dem, ellers den størrelsen siden viser. Filnavn er gjort om til små bokstaver uten æ, ø, å og mellomrom.
- `scrape-output/pages/<side>.json`: tittel, tekst og bildeliste med alt-tekst, i den rekkefølgen de står på siden.
- `scrape-output/manifest.json`: oversikt over alt, inkludert hvilken adresse hvert bilde ble lastet fra.

Skriptet er skrevet ut fra sidestrukturen, men er ikke kjørt mot den levende siden. Sjekk utskriften: antall bilder per side skal stemme med det du ser i nettleseren.

### Hvis en side viser 0 bilder
Siden laster da bildene med JavaScript. To alternativer:
- Kjør `npx playwright install chromium`, og bytt `fetch` for sidene mot Playwright (`page.content()` etter at siden er lastet). Resten av skriptet er likt.
- Eller hurtigløsning: `wget --mirror --page-requisites --convert-links --adjust-extension --no-parent https://www.anitarufuspamer.com/`.

## Bildekvalitet
Bildene på nettet er ofte komprimert (filnavn som `IMG_8608-min.jpeg` er allerede nedskalert). **De beste filene ligger hos Anita**, i kamerarull eller bildearkiv. Be henne sende originalene av verkene, og bruk de fra Webnode som reserve.

## Etter henting
1. Gå gjennom `manifest.json` og sorter bildene til riktig utstilling, portrett eller forside (se `CLAUDE.md`).
2. Konverter til WebP, maks 2400 px på lang side.
3. Legg teksten inn i `content/exhibitions.json` og `content/site.json`. Les gjennom tekstene. De skal stå uendret, men skriptet kan ha tatt med menytekst eller kuttet avsnitt.
4. Sjekk `images/` mot nettleseren, side for side.

## Videresending
`_redirects` i denne mappen sender de gamle adressene til de nye. Kopier filen til roten av det publiserte nettstedet. Gamle adresser fra Webnode:

| Gammel adresse | Ny adresse |
|---|---|
| /mitt-arbeid/ | / (utstillingslisten ligger på forsiden) |
| /om-meg/ | / |
| /kontakt/ | / |
| /1-til-1-gyldeprisen-kunsthall/ | /utstillinger/1-til-1-gyldenpris-kunsthall/ |
| /alt-mellom-himmel-og-jord/ | /utstillinger/alt-mellom-himmel-og-jord/ |
| /varslipp/ | /utstillinger/varslipp/ |
| /alt-jeg-ikke/ | /utstillinger/alt-jeg-ikke-ser-alt-jeg-ikke-vet-alt-jeg-ikke-foler/ |
| /de-5-elementer/ | /utstillinger/de-5-element/ |
| /vandreutstilling/ | /utstillinger/vandreutstillinger/ |
| /get-it-for-cheap/ | /utstillinger/get-it-for-cheap/ |
| /min-vei-til-master/ | /utstillinger/min-vei-til-master/ |
| /a2019/ | /utstillinger/masterutstilling-2018/ |
| /dyreriket/ | /utstillinger/khib-og-uib/ |
| /mitt-arbeid/midt-i-jungelen/ | /utstillinger/bachelorutstilling-2016/ |
| /mitt-arbeid/hostfarger/ | /utstillinger/luftskipet/ |

Hvis du velger andre adresser i det nye prosjektet, endre høyre kolonne i `_redirects`.

## Domene og e-post
- Avklar hvem som eier domenet anitarufuspamer.com og hvor DNS ligger. Hvis domenet er registrert hos Webnode, må det flyttes (opplåsing og overføringskode hos Webnode), og det kan ta noen dager. Be om overføring i god tid.
- Endre bare A- og CNAME-oppføringene for nettsiden. Ikke rør MX-oppføringene, så e-post på domenet fortsetter å virke.
- Dagens side har Google Tag Manager (`GTM-542MMSL`). Avklar om statistikken skal videreføres.
