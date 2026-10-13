# Handoff: Anita Rufus Pamer – ny nettside

## Oversikt
Portefølje-nettside for billedkunstner Anita Rufus Pamer (anitarufuspamer.com). Den erstatter dagens Webnode-side og skal vise utstillinger, verk og portretter.

Sider:
1. **Forside**: hovedbilde som bytter mellom tre verk ved scroll, utstillingsliste, portrett-forsmak, Instagram-feed, «Om meg» og kontakt.
2. **Utstillingsside**: én mal for alle 12 utstillinger, med verk, forespørsel per verk og forrige/neste.
3. **Portretter**: galleri med lysboks.
4. **Felles**: fast topplinje, dybdemål i venstre marg, forespørselsskjema og footer med kontaktinfo.

**Redigeringsflyt (styrende for arkitekturen):** Alt innhold endres via Claude Code → GitHub → Netlify. Det er ingen CMS. Innhold skal derfor ligge i enkle datafiler og mapper som Claude Code lett kan endre. Se `CLAUDE.md` i denne mappen, som skal ligge i roten av repoet.

## Om designfilene
Filene i `design/` er **designreferanser laget i HTML**. De viser tiltenkt utseende og oppførsel, og er ikke produksjonskode. Filen bruker en prototype-runtime (`support.js`, egne tagger som `<sc-if>` og `<sc-for>`) som ikke skal brukes i produksjon. Oppgaven er å **gjenskape designet som en vanlig statisk nettside**.

Åpne `design/Anita Rufus Pamer - Nettside.dc.html` i en nettleser for å se oppførselen. Alle mål, farger og formler under er hentet fra den filen.

## Fidelity
**Høy (hifi).** Farger, typografi, avstander og scroll-effekter er endelige. Innholdet er delvis plassholdere (se «Innhold og plassholdere»).

## Anbefalt teknisk oppsett
- **Statisk side uten rammeverk** på Netlify, bygget fra GitHub. Anbefaling: Eleventy (11ty) med Nunjucks-maler og datafiler, slik at hver utstilling får egen adresse og ferdig HTML (bra for søkemotorer). Et eget lite Node-skript fungerer også. Velg det som er enklest å vedlikeholde.
- **Adresser:** `/`, `/utstillinger/<slug>/`, `/portretter/`. Prototypen bytter side med intern tilstand, så dette må bygges om til ekte sider.
- **Innholdsmodell** (JSON eller Markdown med frontmatter):
  - `site`: kontaktinfo, Instagram-brukernavn, «Om meg»-tekster, tre forsidebilder.
  - `exhibitions[]`: `slug`, `title`, `year`, `place`, `period`, `text`, `heroImage`, `works[]`.
  - `works[]`: `title`, `technique`, `size`, `year`, `image`, `status` (`til-salgs` | `solgt` | `pris-pa-foresporsel`).
  - `portraits[]`: `title`, `technique`, `size`, `year`, `image`.
- **Bilder:** WebP, lange side maks 2400 px, `srcset`, `loading="lazy"` under hovedbildet, `width`/`height` satt for å unngå hopp. Prototypen skjærer flere utsnitt ut av tre fotografier med CSS (`background-position`). Det er kun plassholdere. I produksjon skal hvert verk ha egen eksportert bildefil.
- **Fonter:** PT Serif (400, 700, kursiv 400) og Fira Sans (300, 400, 500). Prototypen laster fra Google Fonts. Anbefaling: selvhost fontene (personvern og hastighet).
- **Skjema:** Netlify Forms (`data-netlify="true"`, honeypot-felt). Felter: `verk` (skjult/skrivebeskyttet), `navn`, `e-post`, `melding`. Svar-melding: «Takk — sendt».
- **Instagram-feed:** Netlify-funksjon `netlify/functions/instagram.js` som henter de 6 siste innleggene og cacher svaret i ca. 1 time. Bruker «Instagram API with Instagram Login». Kontoen må være **Creator eller Business** (gratis å bytte). Nøkkelen (`INSTAGRAM_TOKEN`) ligger som miljøvariabel i Netlify, aldri i repoet. Langtidsnøkkelen varer ca. 60 dager og må fornyes (planlagt funksjon eller påminnelse). Sjekk gjeldende krav i Metas dokumentasjon før bygging. Funksjonen returnerer `[{id, mediaUrl, permalink, caption, timestamp}]`; for video brukes `thumbnail_url`. Siden skal ha en statisk reserve (siste kjente svar) hvis kallet feiler.
- **Flytting fra Webnode:** Se `migrering/README-migrering.md`. Mappen inneholder et skript som henter alle bilder og tekster (`scrape-webnode.mjs`) og ferdige 301-regler for de gamle adressene (`_redirects`). Hent innholdet før domenet flyttes. Ikke endre MX-oppføringer, så e-post på domenet fortsetter å virke.
- **SEO og deling:** `<title>`, beskrivelse og Open Graph-bilde per side. Strukturerte data (`VisualArtwork`, `ExhibitionEvent`) er valgfritt.

## Designtokens

**Farger**
| Bruk | Hex |
|---|---|
| Tekst og mørk flate | `#3B3B3B` |
| Bakgrunn | `#FFFFFF` |
| Bildeplassholder | `#ECECEA` |
| Lysegrå flate (Instagram) | `#F4F4F2` |
| Strek | `#E3E3E3`, `#D6D6D3`, `#C4C4C0` |
| Dempet tekst | `#8A8A8A`, `#6A6A6A` |
| Tekst på mørk flate | `#FFFFFF` (dempet: opacity .65–.7) |

Ingen aksentfarge. Fargene i bildene bærer siden.

**Typografi**
| Element | Font | Størrelse | Vekt | Linjehøyde | Letter-spacing |
|---|---|---|---|---|---|
| Logo (topplinje) | Fira Sans | clamp(17px, 2vw, 22px) | 400 | | |
| Meny | Fira Sans | clamp(13px, 1.2vw, 15px) | 400 | | |
| Utsagn på forsiden | PT Serif | clamp(30px, 4vw, 46px) | 400 | 1.14 | -.01em |
| Utstillingstittel (h1) | PT Serif | clamp(44px, 8vw, 104px), lange titler (>30 tegn) clamp(34px, 5vw, 72px) | 700 | 1 | -.025em |
| Portretter (h1) | PT Serif | clamp(52px, 10vw, 148px) | 400 | .95 | -.035em |
| Utstilling i listen | PT Serif | clamp(22px, 2.6vw, 34px) | 400 | 1.15 | |
| Verktittel | PT Serif kursiv | 26px (liste), 36px (lysboks), 17px (bildetekst) | 400 | | |
| Brødtekst | Fira Sans | 17px | 300 | 1.7–1.75 | |
| «Om meg» ingress | PT Serif | clamp(22px, 2.4vw, 28px) | 400 | 1.4 | |
| Etiketter | Fira Sans | 12px, versaler | 400 | | .16em |
| Metadata | Fira Sans | 13px | 400 | 1.5 | |

**Avstander:** Sidemarg `clamp(20px, 4.5vw, 56px)`. Topplinje 72 px. Dybdemål 72 px bredt. Vertikale seksjonsavstander `clamp(64px, 8vw, 112px)` til `clamp(100px, 11vw, 140px)`. Knapper: 13–15 px vertikalt, 20–40 px horisontalt.

**Former:** Ingen avrundede hjørner, ingen skygger (unntatt prototypens kontaktflater). Streker er 1 px. Knapper er firkantede. Primærknapp: `#3B3B3B` bakgrunn, hvit tekst. Sekundærknapp: 1 px ramme i tekstfarge, gjennomsiktig.

**Breakpoints:** `≥ 900 px` viser dybdemålet og legger innholdet 72 px fra venstre. `< 860 px` bytter menyen mot en «Meny»-knapp. `< 640 px` gir smalt oppsett (færre kolonner, ingen hover-bilder).

## Sider / visninger

### Fast topplinje (alle sider)
- `position: fixed`, høyde 72 px, hvit, 1 px nederst `#E3E3E3`, z-index 40. Logo «Anita Rufus Pamer» til venstre, meny til høyre.
- Meny: Forside, Utstillinger, Portretter, Om meg, Kontakt. Utstillinger og Om meg ruller til seksjonen på forsiden. Kontakt ruller til footer.
- Under 860 px: «Meny»-knapp (1 px ramme) åpner et panel under topplinjen med lenkene i PT Serif 22 px, atskilt av 1 px streker. Knappen heter «Lukk» når panelet er åpent.
- Hover på lenker: `#8A8A8A`.

### Dybdemål (fast, venstre, kun ≥ 900 px)
- `position: fixed; left: 0; top: 72px; bottom: 0; width: 72px`, hvit, 1 px høyre kant `#E3E3E3`.
- Vertikal linje (1 px, `#3B3B3B`) ved x = 58 px fra 24 px under øvre kant til 24 px over nedre kant. Skala-streker: `repeating-linear-gradient` 1 px hver 17 px, 8 px lange (x = 59–67).
- Markør: 12×2 px strek med tekst til venstre (10,5 px, tabulartall). `top = 24 + p × (vh − 72 − 48) − 7`, der `p = scrollY / (dokumenthøyde − vindushøyde)`.
- Etikett: `0 m` ved p = 0, ellers `−N m` med `N = round(p × 96)`.

### 1. Forside
**Hovedbilde (scroll-styrt, «lag på lag»)**
- Sporet har høyde `hh + 2 × step`. Her er `hh = max(420, vh − 72)` og `step = max(480, round(vh × 0.75))`. Innholdet er `position: sticky; top: 72px; height: hh`.
- Bildeflaten har høyde `hh − 56`. Under ligger en 56 px bildetekstlinje (hvit, 1 px nederst).
- Tre verk (lag 0, 1, 2). `t = scrollY / step`. Hvert lag *i* (1 og 2) har fremdrift `r_i = smoothstep(clamp((t − (i−1) − 0.15) / 0.7, 0, 1))`, med `smoothstep(u) = u²(3 − 2u)`. Lag 0 er alltid synlig (r = 1).
- Hvert lag: `clip-path: inset((1 − r) × 100% 0 0 0)`, så det nye verket reiser seg nedenfra. Bildet inni er 48 px høyere enn flaten (top og bottom −24 px) og flyttes `translateY((i > 0 ? (1 − r_i) × 36 : 0) − r_{i+1} × 40) px`. Laget som dekkes får mørkt slør `rgba(0,0,0, r_{i+1} × 0.35)`.
- Kantlinje: 2 px hvit linje ved `top = (1 − r_i) × bildehøyde` mens `0.01 < r_i < 0.99`.
- Bildetekst (tittel i PT Serif kursiv 17 px, «Teknikk · mål · år», dybde 0 m / −8 m / −16 m) har opacity `clamp(1 − |a − i| × 2.5)` med `a = r_1 + r_2`.
- Til høyre i bildetekstlinjen: tre streker (2 px høye, aktiv 28 px bred `#3B3B3B`, andre 12 px `#C4C4C0`), teller «01 / 03» og «Scroll ↓» (skjules under 640 px).
- Bildene ligger 3 verk fra utstillingen «1-til-1 Gyldenpris Kunsthall». Utsnittsparametre står i `renderVals()` (`src`-listen). Bildene skal byttes mot Anitas valgte tre verk.

**Utsagn:** to kolonner (`repeat(auto-fit, minmax(min(100%, 340px), 1fr))`), tekst under. Se «Innhold».

**Utstillinger («jordlag»)**
- Etikett «Utstillinger» til venstre og «12 lag · nyest øverst» til høyre (12 px versaler, .16em).
- Tolv bånd, hvert en lenke til utstillingssiden. Hvert bånd har `margin-top: −22px`, fast høyde og `clip-path`-polygon med ujevn øvre kant, slik at det ser ut som lag av stein. Høyder: 170, 200, 170, 200, 180, 200, 170, 200, 190, 170, 200, 180 px. Grånivå (RGB, samme verdi for R, G og B): 246, 232, 240, 214, 228, 196, 208, 98, 84, 92, 70, 62. Tekst er `#3B3B3B` når nivået er ≥ 130, ellers hvit.
- Tre polygoner brukes etter tur (`i % 3`):
  - `polygon(0 14px, 22% 3px, 51% 11px, 79% 0, 100% 8px, 100% 100%, 0 100%)`
  - `polygon(0 2px, 18% 12px, 43% 5px, 70% 15px, 100% 4px, 100% 100%, 0 100%)`
  - `polygon(0 9px, 30% 16px, 58% 2px, 84% 12px, 100% 6px, 100% 100%, 0 100%)`
- Innhold i båndet: venstre kolonne med dybde («0 m», «−8 m», … `i × 8`) og eventuelt år (12 px), deretter tittel (PT Serif). Tekstblokken står 50 px fra toppen, høyre kant 540 px inn (20 px på smal skjerm).
- Hover (kun ≥ 640 px): båndets grånivå endres (−8 for lyse, +10 for mørke), teksten flytter 14 px til høyre (`.45s cubic-bezier(.2,.7,.2,1)`), og et utsnitt av et verk (440 px bredt, høyre 56 px, `top: 46px; bottom: 24px`) fader inn og glir 28 px (`opacity .4s`, `transform .5s`).

**Portrett-forsmak:** lag med hvit bakgrunn og ujevn øvre kant (`polygon(0 12px, 24% 3px, 52% 14px, 80% 1px, 100% 9px, 100% 100%, 0 100%)`, `margin-top: −22px`). Overskrift «Portretter» og lenken «Se alle portretter →» (understreket 1 px). Fire rammer (4 kolonner, 2 på smal skjerm) med forskyvning 0 / 56 / 16 / 72 px (smal: 0 / 32). Sideforhold vekslende 4:5 og 3:4.

**Instagram:** bakgrunn `#F4F4F2`. Etikett «Instagram», brukernavn som lenke i PT Serif, lenke «Følg på Instagram →». Seks kvadratiske flater (6 kolonner ≥ 900 px, 3 ≥ 640, ellers 2). Hover: bildet skalerer til 1.05 (`.6s cubic-bezier(.2,.7,.2,1)`). Under hver flate: dato (12 px `#8A8A8A`) og bildetekst (13 px, maks 2 linjer). Prototypen viser eksempelinnlegg og en forklarende linje nederst («Forhåndsvisning med eksempelinnlegg…») som **ikke** skal med i produksjon. Hvert innlegg lenker til Instagram i ny fane (`rel="noopener"`).

**Om meg + kontakt:** mørk flate `#3B3B3B` med ujevn øvre kant (`polygon(0 12px, 26% 2px, 55% 14px, 81% 0, 100% 8px, 100% 100%, 0 100%)`, `margin-top: −22px`). Portrett (4:5, maks 320 px bred) til venstre, tekst til høyre. Under en strek (`rgba(255,255,255,.22)`) med «© Anita Rufus Pamer», telefon og e-post (lenker, hover opacity .7).

### 2. Utstillingsside
- **Bakgrunn som dybde:** `p = scrollY / maks scroll`, `q = clamp((p − 0.1) / 0.8)`, `v = round(255 − 196 × q)`, bakgrunn `rgb(v, v, v)`. Når `v < 150` blir tekst hvit og streker `rgba(255,255,255,.4)`, ellers tekst `#3B3B3B` og streker `rgba(59,59,59,.3)`. Topplinje og dybdemål forblir hvite.
- **Topp:** to kolonner (≥ 900 px; ellers én). Venstre: «← Alle utstillinger» (14 px, opacity .75) og h1 (tittel). Høyre: definisjonsliste (Sted, Periode, Verk), deretter tekst. Minimumshøyde 520 px (kun ≥ 900 px).
- **Hovedbilde:** 3:2, full bredde. Bildetekst: «Utstillingsbilde» og «Lag 0 · 0 m».
- **Verk:** hvert verk er en seksjon med en rad øverst (strek, «−24 m» osv. (`24 × n`), «Lag n») og et bilde ved siden av en tekstblokk (maks 260 px bred): tittel (PT Serif kursiv 26 px), «Teknikk / Mål / År» (14 px, opacity .7), knappen «Forespør verket». Bilde og tekst bytter side for hvert verk (`row` / `row-reverse`, `align-items: flex-end`). Under 900 px stables de. Bildebredder i prototypen: 520, 760, 600 og 220 px (`max-width: 100%`), med sideforhold satt per verk.
- **Forrige / Neste:** to kolonner, 1 px streker over, «Forrige»/«Neste» (12 px versaler) og tittel i PT Serif. Går i en løkke gjennom de 12 utstillingene.
- **Forespørsel (felles blokk, vises også på Portretter):** overskrift «Forespørsel» (PT Serif 700, clamp(32px, 3.6vw, 44px)), tekst «Dersom dette vekket interessen din, ta kontakt ved bruk av skjemaet under!». Skjema med feltene «Gjelder verk» (skrivebeskyttet, forhåndsutfylt «Verktittel — Utstillingstittel», standard utstillingstittel), «Navn», «E-post», «Melding», og knappen «Send». Bunnlinje på 1 px (`line`-fargen), ingen ramme. «Forespør verket» setter «Gjelder verk» og ruller mykt til skjemaet (80 px under toppkant).
- **Footer:** «© Anita Rufus Pamer», telefon, e-post (14 px, 300).

### 3. Portretter
- **Topp:** «← Forside», h1 «Portretter», tekst og antall («9 portretter»). To kolonner ≥ 900 px.
- **Galleri:** 3 kolonner (≥ 900 px), ellers 2. Mellomrom `clamp(28px, 4vw, 56px)` vertikalt og `clamp(16px, 3vw, 40px)` horisontalt. Rammene har vekslende sideforhold 4:5 og 3:4. Forskyvning oppe: 3 kolonner `[0, 72, 24]` px etter `i % 3`, 2 kolonner `[0, 40]` px etter `i % 2`. Hover: opacity .85. Under hver ramme: tittel (PT Serif kursiv 17 px) og «Teknikk · mål · år».
- **Lysboks:** `position: fixed` fra 72 px under toppen, hvit med 98 % dekning, z-index 41. Bilde (høyde `clamp(240, vh − 72 − 96 (bred) / 300 (smal), 760)`, bredde fra sideforhold) til venstre, tekst til høyre (320 px): teller «01 / 09», tittel (PT Serif kursiv 36 px), «Teknikk · mål · år», knappen «Forespør verket», og lenkene «← Forrige», «Neste →», «Lukk ✕». Forrige/Neste går i en løkke. Produksjon: legg til Esc for å lukke, piler for å bla, fokusfelle og `aria-modal`.

## Interaksjon og oppførsel
- **Scroll-effekter:** alle styres av `scrollY`, throttlet med `requestAnimationFrame`. I produksjon: beregn verdiene i én scroll-lytter og sett dem som CSS-variabler, ikke bygg om DOM. Respekter `prefers-reduced-motion`: da vises lag 0 og de to andre verkene som vanlig bildeliste, uten klipp og parallakse.
- **Sidebytte:** scrollposisjon settes til toppen. Lenker til seksjoner ruller mykt til 80 px under toppen av seksjonen.
- **Hover:** se hver komponent. Ingen hover-effekter er nødvendige på berøringsskjermer.
- **Skjema:** i prototypen settes bare «Takk — sendt». Produksjon: Netlify Forms, enkel validering (e-post), tydelig feilmelding på norsk.
- **Tomtilstander:** utstillinger uten bilder viser grå flate (`#ECECEA`). Produksjon: skjul tomme seksjoner, ikke grå plassholdere.

## Tilstand (prototypen)
`page` (home | exh | portraits), `idx` (valgt utstilling), `sc` (scrollY), `mx` (maks scroll), `vw`, `vh`, `hov` (båndhover), `inq` (valgt verk i skjemaet), `sent`, `menu`, `lb` (lysboks, −1 = lukket), `igHov`. I produksjon blir dette stort sett CSS og små skript. Kun scroll, meny, lysboks og skjema trenger JavaScript.

## Innhold og plassholdere
Tekst fra dagens side (skal stå uendret):
- Utsagn: «Jeg utforsker forholdet mellom natur og mennesker.»
- Ingress: «Min fascinasjon for naturens konstante forandring, inspirert av min bakgrunn i geologi, gjenspeiles i mine verk.»
- Om meg: «Jeg, Anita Rufus Pamer, utforsker forholdet mellom natur og mennesker. Min fascinasjon for naturens konstante forandring, inspirert av min bakgrunn i geologi, gjenspeiles i mine verk.» / «Jeg fokuserer på hvordan naturelementer og menneskelige elementer endrer og påvirker hverandre over tid.» / «Gjennom mitt arbeid formidler jeg et budskap om verdens og naturens skjønnhet, som også inviterer til ettertanke om menneskets rolle til hverandre, og til naturen.»
- Kontakt: telefon 995 18 892, e-post Anita@pamco.no.
- Skjematekst: «Dersom dette vekket interessen din, ta kontakt ved bruk av skjemaet under!»

De 12 utstillingene (nyest først): 1-til-1 Gyldenpris Kunsthall · Alt mellom himmel og jord · Vårslipp · Alt jeg ikke ser, alt jeg ikke vet, alt jeg ikke føler · De 5 element · Vandreutstillinger · Get it for cheap · Min vei til master · Masterutstilling 2018 · KHIB og UIB · Bachelorutstilling 2016 · Luftskipet. Årstall er kun kjent for Masterutstilling 2018 og Bachelorutstilling 2016.

Mangler (må leveres av Anita): sted og periode per utstilling, tekst per utstilling, verktitler, teknikk, mål og år, bilder av verk og portretter, portrettbilde av Anita, Instagram-brukernavn (står som «@brukernavn»), tekst for portrettseksjonen.

## Ressurser
- `design/images/1til1-fjord.webp`, `1til1-vindu.webp`, `1til1-gul-vegg.webp`: tre bilder fra utstillingen «1-til-1 Gyldenpris Kunsthall», levert av oppdragsgiver. Brukes som plassholdere for verk, portretter og Instagram-innlegg.
- Portrett av Anita: ikke levert, grå plassholder.
- Ingen ikoner eller illustrasjoner. Piler (→ ← ↓) og kryss (✕) er tegn i teksten.

## Filer
- `design/Anita Rufus Pamer - Nettside.dc.html`: hele designet (forside, utstilling, portretter) som kjørbar referanse.
- `design/support.js`: runtime for prototypen. Ikke til produksjon.
- `design/images/`: bildene over.
- `CLAUDE.md`: arbeidsinstruks for repoet. Kopier til roten og tilpass stiene til den faktiske mappestrukturen.

## Åpne spørsmål
1. Instagram-brukernavn, og at kontoen er Creator eller Business.
2. Hvem eier domenet, og hvor ligger DNS i dag?
3. Skal siden ha engelsk versjon?
4. Vil Anita vise priser, status (til salgs/solgt) eller kun «forespør»?
5. Skal det være statistikk (f.eks. Netlify Analytics)? Da må cookie-praksis avklares.
