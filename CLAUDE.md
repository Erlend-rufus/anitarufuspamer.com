# Anita Rufus Pamer – nettside

Portefølje-nettside for billedkunstner Anita Rufus Pamer. Siden publiseres på Netlify fra GitHub. Ingen CMS: alle endringer gjøres her i repoet og pushes til `main`, så bygger og publiserer Netlify automatisk.

Tekst på siden er norsk (bokmål). Svar til brukeren på norsk. Skriv enkelt, brukeren hjelper en ikke-teknisk kunstner.

## Slik jobber du
1. Gjør endringen. Endre bare det som er bedt om.
2. Kjør `npm run build` og sjekk at siden bygger uten feil (`npm start` gir lokal forhåndsvisning).
3. Vis brukeren hva som er endret (kort liste, gjerne skjermbilde).
4. Commit med en kort norsk melding (f.eks. «Ny utstilling: Vårslipp 2026»). Jobber du på en egen gren, lag en PR mot `main`. Brukeren har gitt varig lov til å merge, så merge PR-en når bygget er grønt, uten å spørre.
5. Netlify publiserer fra `main` (prosjektet «anitarufuspamercom»). Si fra at endringen er ute om et par minutter.

Aldri commit hemmeligheter. `INSTAGRAM_TOKEN` ligger som miljøvariabel i Netlify.

## Teknisk oppsett
Eleventy 3 med Nunjucks-maler. Ingen rammeverk, ingen bundler.

```
content/
  ui.json              faste tekster på siden (meny, knapper, etiketter) på norsk og engelsk
  site.json            kontaktinfo, Instagram-brukernavn, utsagn, Om meg, tekster, forsidebilder (heroWorks)
  exhibitions.json     alle utstillinger, nyest først
  portraits.json       portretter
  instagram-reserve.json  siste kjente Instagram-svar, brukes hvis Instagram ikke svarer
images/
  utstillinger/<slug>/ bilder per utstilling
  portretter/          portrettbilder
  forside/             de tre hovedbildene
  om-meg/              portrett av Anita
src/
  _data/i18n.js        bygger innholdet for norsk (i18n.no) og engelsk (i18n.en) via lib/content.js
  en/                  engelske sider (/en/, /en/exhibitions/<slug>/, /en/portraits/)
  _includes/           base.njk og partials/ (topplinje, dybdemål, footer)
  _includes/pages/     sidekroppene (forside, utstilling, portretter), felles for begge språk
  index.njk, utstilling.njk, portretter.njk   norske sider: /, /utstillinger/<slug>/, /portretter/
  css/tokens.css       farger, fonter, avstander
  css/site.css         all annen stil
  js/site.js           meny og scroll-effekter
lib/                   content.js (bygger innhold per språk) og plassholdere.js
netlify/functions/instagram.js
_redirects             videresending fra gamle Webnode-adresser
migrering/             skript for å hente innhold fra Webnode (engangsjobb)
docs/design/           designspesifikasjon (README.md) og prototype. Publiseres ikke.
```

Bildestier i `content/*.json` er relative til `images/` (f.eks. `utstillinger/varslipp/vindu.webp`). Eleventy lager `srcset`, `width` og `height` automatisk via shortcoden `bilde`. Skriv aldri bildemål inn for hånd.

## Oppskrifter

**Ny utstilling.** Legg en ny oppføring øverst i `content/exhibitions.json` med `slug` (små bokstaver, ASCII, bindestrek), `title`, `year`, `place`, `period`, `text`, `heroImage`, `heroAlt` og `works`. Legg bildene i `images/utstillinger/<slug>/`. Dybdemålet i listen («−8 m» osv.) og nummereringen beregnes automatisk fra rekkefølgen. Ikke skriv det inn for hånd.

**Nytt verk i en utstilling.** Legg til i `works` for den utstillingen: `title`, `technique`, `size`, `year`, `image`, `alt`, `status`. Tomme felt skal ikke vises på siden. Verk uten `image` vises ikke.

**Nytt portrett.** Legg bildet i `images/portretter/` og en oppføring i `content/portraits.json` (`title`, `technique`, `size`, `year`, `image`, `alt`). Portrettseksjonen på forsiden vises når det finnes minst ett portrett.

**Bytte hovedbildene på forsiden.** Tre verk i `content/site.json` under `heroWorks` (`image`, `alt`, `title`, `technique`, `size`, `year`). Nå ligger tre installasjonsbilder fra 1-til-1 der, uten titler.

**Portrett av Anita (Om meg).** Legg bildet i `images/om-meg/` og sett `about.portrait` og `about.portraitAlt` i `content/site.json`.

**Instagram.** Sett `instagram` i `content/site.json` (f.eks. `"@anitarufuspamer"`). Seksjonen vises først når funksjonen `netlify/functions/instagram.js` returnerer innlegg, altså når `INSTAGRAM_TOKEN` er satt i Netlify. Nøkkelen varer ca. 60 dager og må fornyes (se kommentaren øverst i funksjonen).

**Endre tekst, telefon, e-post eller Instagram-brukernavn.** Se `content/site.json`. Endre ordene eksakt slik brukeren ber om, uten å omformulere.

**Engelsk versjon.** Siden finnes på norsk (`/`) og engelsk (`/en/`). Norsk er hovedspråket, og Anitas norske tekster endres aldri uten at brukeren ber om det. Engelsk bygges fra de samme datafilene:
- `content/site.json` har en `en`-blokk med engelske versjoner av utsagn, ingress, Om meg, skjematekst og beskrivelse.
- Utstillinger kan ha `titleEn` og `textEn`. Mangler de, brukes norsk tittel og tekst.
- Verktitler oversettes aldri. Teknikkord (olje, akryl, kritt …) oversettes automatisk, eller settes med `techniqueEn`. Alt-tekster fra importskriptet oversettes automatisk, eller settes med `altEn`.
- Faste tekster (meny, knapper, etiketter) står i `content/ui.json`.
- Ny utstilling eller ny tekst: legg alltid inn engelsk versjon samtidig. Brukeren godkjenner oversettelsene, og Claude lager dem.

**Ny side eller seksjon.** Spør først. Siden skal holde seg enkel.

## Beslutninger fra Anita (oversiktsskjemaet, 13.10.2026)
- **Forsidebilder:** behold de nåværende tre.
- **Verk:** vis bare «Forespør verket». Ingen priser og ingen status (til salgs/solgt). Feltet `status` i dataene brukes ikke.
- **Presentasjonssiden for søknader:** Anita overlater utformingen til Claude, men innholdet finnes ikke ennå. Lag den som skjult side (`noindex`, ikke i meny eller sitemap) når innholdet foreligger.
- **Engelsk versjon:** ja. Claude oversetter, Erlend godkjenner. Ferdig bygget under `/en/`, med språkbryter i topplinjen.
- **Statistikk:** Netlify Analytics (slått på i Netlify av Erlend 13.10.2026). Den teller på serversiden uten informasjonskapsler, så det trengs verken kode eller samtykkebanner. Ikke legg inn Google Tag Manager. Dagens Webnode-side hadde 11 875 besøkende; Netlify teller bare fra den ble slått på.
- **Instagram:** `@anita.pamer` (satt i `content/site.json`). Innleggene hentes først når `INSTAGRAM_TOKEN` er lagt inn i Netlify. Kontoen må være Creator eller Business.

## Innhold hentet fra den gamle siden
Bildene og tekstene fra Webnode ble importert med `migrering/importer-scrape.py` (se `docs` i handoff fra scraperen).
- Verk har feltet `kilde` (originalt filnavn på Webnode) for sporbarhet.
- Verk med `"todo"` mangler tittel, teknikk, mål og ordentlig alt-tekst. Fyll inn når Anita leverer, og fjern `todo`.
- Bildene fra den gamle forsiden: 13 av 25 finnes allerede i utstillingene. De 12 andre ligger i `images/arkiv/` og er listet i `content/arkiv.json`. De vises ikke på siden før vi vet hvilken utstilling de hører til. Flytt dem da inn i riktig utstilling og fjern dem fra arkivet.
- `/kopi-av-1-til-1-gyldepris-kunsthall/` (presentasjonsside for søknader) videresendes midlertidig (302) til 1-til-1-siden. Den skal bli en skjult side (`noindex`, ikke i meny eller sitemap) når innholdet finnes.

## Bildevask (rengjøring av bilder)
Anita laster opp bilder på artefakten «Bildevask» (https://claude.ai/artifact/RGLTCwJSsgu7waHfwABkUg). Hun velger type per bilde: `maleri` (markerer fire hjørner), `objekt` (skulptur o.l.) eller `behold`. Når hun sier fra, gjør Claude dette:
1. Les `bilder`-dokumentene med ArtifactData og hent originalene (asset-id) til en mappe, med filnavn `<id>.<endelse>`.
2. Kjør `python3 verktoy/bildevask.py <originaler> <bilder.json> images/rengjort --innhold content/rengjort.json`. Trenger pillow, numpy, opencv-python-headless og rembg[cpu].
3. Se på `kontrollark.jpg`. Last forhåndsvisningene opp som `rengjort/<id>` i artefakten og sett status `rengjort`, så Anita kan godkjenne eller be om omgjøring.
4. Først når hun har godkjent legges bildene i utstillingen (flytt fra `content/rengjort.json`). Originalene ligger i asset-lageret og committes aldri.
- Malerier får **aldri** automatisk bakgrunnsfjerning. Den sletter malt bakgrunn. De rettes opp og beskjæres til hjørnene Anita har markert.
- Anonym opplasting finnes ikke: Anita må være logget inn på claude.ai og ha redigeringstilgang til artefakten.

## Plassholdere
`"plassholdere": true` i `content/site.json` fyller tomme felt og seksjoner med plassholderne fra designprototypen: «Verktittel I», «Teknikk · mål · år», «Tekst om utstillingen kommer.», Sted/Periode «—», 9 portretter, 6 eksempelinnlegg på Instagram, «Portrett av Anita», og utsnitt av de tre 1-til-1-bildene. Logikken ligger i `lib/plassholdere.js`, og bildene ligger i `src/plassholder/`.
- Ekte innhold går alltid foran. Et felt fylles bare når det er tomt, og en utstilling får plassholderverk bare når `works` er tom.
- Portrettene byttes ut samlet: så snart `content/portraits.json` har ett ekte portrett, forsvinner de 9 plassholderne.
- **Før domenet flyttes:** sett `"plassholdere": false`. Da skjules alt som er tomt.

## Bildekrav
- WebP, lang side maks 2400 px, kvalitet ca. 80. Konverter og skaler før commit.
- Filnavn: små bokstaver, ASCII, bindestrek (`vindu-i-snoe.webp`). Ingen æ, ø, å eller mellomrom.
- Alle bilder skal ha norsk `alt`-tekst (kort beskrivelse av verket).
- Ikke last opp originaler på over 5 MB.

## Designregler
- Farger, fonter og avstander ligger i `src/css/tokens.css`. Ikke endre dem uten at brukeren ber om det.
- Fargene er grå og hvit (`#3B3B3B`, `#FFFFFF`, `#ECECEA`, `#F4F4F2`). Ikke legg til aksentfarger.
- Fonter: PT Serif og Fira Sans, selvhostet fra `@fontsource` (kopieres til `/fonts/` ved bygging).
- Ingen avrundede hjørner, ingen skygger, ingen ikoner.
- Scroll-effektene (hovedbilde, dybdemål, mørkere bakgrunn på utstillingssiden) skal slås av ved `prefers-reduced-motion`.
- Mål og formler: `docs/design/README.md`.
- Ikke finn på innhold. Tomme felt og manglende bilder skjules, ingen plassholdere.

## Før du pusher
- Ingen døde lenker. Sjekk at alle utstillinger åpner.
- Skjemaet virker (Netlify Forms) og sender til e-posten i Netlify-oppsettet.
- Siden fungerer på mobil (under 860 px).
