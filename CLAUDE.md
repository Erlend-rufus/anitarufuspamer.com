# Anita Rufus Pamer – nettside

Portefølje-nettside for billedkunstner Anita Rufus Pamer. Siden publiseres på Netlify fra GitHub. Ingen CMS: alle endringer gjøres her i repoet og pushes til `main`, så bygger og publiserer Netlify automatisk.

Tekst på siden er norsk (bokmål). Svar til brukeren på norsk. Skriv enkelt, brukeren hjelper en ikke-teknisk kunstner.

## Slik jobber du
1. Gjør endringen. Endre bare det som er bedt om.
2. Kjør `npm run build` og sjekk at siden bygger uten feil (`npm start` gir lokal forhåndsvisning).
3. Vis brukeren hva som er endret (kort liste, gjerne skjermbilde).
4. Commit med en kort norsk melding (f.eks. «Ny utstilling: Vårslipp 2026») og push til `main`.
5. Netlify publiserer. Si fra at endringen er ute om ca. ett minutt.

Aldri commit hemmeligheter. `INSTAGRAM_TOKEN` ligger som miljøvariabel i Netlify.

## Teknisk oppsett
Eleventy 3 med Nunjucks-maler. Ingen rammeverk, ingen bundler.

```
content/
  site.json            kontaktinfo, Instagram-brukernavn, Om meg, tre forsidebilder (heroWorks)
  exhibitions.json     alle utstillinger, nyest først
  portraits.json       portretter
images/
  utstillinger/<slug>/ bilder per utstilling
  portretter/          portrettbilder
  forside/             de tre hovedbildene
  om-meg/              portrett av Anita
src/
  _data/               leser content/*.json og regner ut dybde, forrige/neste
  _includes/           base.njk og partials/ (topplinje, dybdemål, footer)
  index.njk            forside
  utstilling.njk       én side per utstilling: /utstillinger/<slug>/
  portretter.njk       /portretter/
  css/tokens.css       farger, fonter, avstander
  css/site.css         all annen stil
  js/site.js           meny og scroll-effekter
netlify/functions/instagram.js
_redirects             videresending fra gamle Webnode-adresser
migrering/             skript for å hente innhold fra Webnode (engangsjobb)
docs/design/           designspesifikasjon (README.md) og prototype. Publiseres ikke.
```

Bildestier i `content/*.json` er relative til `images/` (f.eks. `utstillinger/varslipp/vindu.webp`). Eleventy lager `srcset`, `width` og `height` automatisk via shortcoden `bilde`. Skriv aldri bildemål inn for hånd.

## Oppskrifter

**Ny utstilling.** Legg en ny oppføring øverst i `content/exhibitions.json` med `slug` (små bokstaver, ASCII, bindestrek), `title`, `year`, `place`, `period`, `text`, `heroImage`, `heroAlt` og `works`. Legg bildene i `images/utstillinger/<slug>/`. Dybdemålet i listen («−8 m» osv.) og nummereringen beregnes automatisk fra rekkefølgen. Ikke skriv det inn for hånd.

**Nytt verk i en utstilling.** Legg til i `works` for den utstillingen: `title`, `technique`, `size`, `year`, `image`, `alt`, `status`. Tomme felt skal ikke vises på siden.

**Nytt portrett.** Legg bildet i `images/portretter/` og en oppføring i `content/portraits.json`.

**Bytte hovedbildene på forsiden.** Tre verk i `content/site.json` under `heroWorks` (bilde, tittel, teknikk, mål, år).

**Endre tekst, telefon, e-post eller Instagram-brukernavn.** Se `content/site.json`. Endre ordene eksakt slik brukeren ber om, uten å omformulere.

**Ny side eller seksjon.** Spør først. Siden skal holde seg enkel.

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
