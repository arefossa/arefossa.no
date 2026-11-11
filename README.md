# arefossa.no

Personlig forside for arefossa.no: About, Photos, WattsUp og Morning news. Ren HTML og CSS, uten
byggesteg eller eksterne fonter. Skript bare der det trengs: bildevisningen på `/photos/`, og
`/morning-news/watch/`, som også laster Googles innlogging.
Publiseres med GitHub Pages fra `main`.

```
├── index.html            # forsiden med de fire valgene
├── about/index.html      # About: kort bio
├── photos/               # Photos: miniatyrer øverst, valgt bilde stort under
│   ├── index.html
│   ├── photos.js         # bytter bilde (klikk, piltaster, sveip), valgt bilde i #adressen
│   └── img/              # nettversjonene, laget med tools/prepare_photos.py
├── morning-news/         # rapportene fra de planlagte oppgavene i Claude
│   └── watch/            # Watch list, leser ukefilene fra Google Drive etter innlogging
├── 404.html
├── assets/style.css      # alle stiler, med lyst og mørkt tema
├── assets/favicon.svg
├── tools/prepare_photos.py
├── CNAME                 # hoveddomenet for GitHub Pages (se under)
└── .nojekyll             # filene serveres som de er
```

## Morning news

Rapportene er private sider i Claude, oppdatert på samme adresse av planlagte oppgaver. Siden
lenker bare til dem, med nøytrale navn, og ligger ikke i søkemotorer (`noindex`). Bare eieren kan
åpne rapportene, innlogget på claude.ai. Innholdet publiseres aldri her, og repoet er offentlig, så
navn på rapportene skal heller ikke stå her.

### Innhold i Google Drive

Innhold som ikke skal ligge i et offentlig repo, ligger i en privat Drive-mappe, `arefossa.no`.
Mappene der følger stiene på siden, så det er lett å se hvor en fil hører hjemme:

```
arefossa.no/              # Drive-mappa, delt med kontoen de planlagte oppgavene bruker
├── about/
├── photos/               # originalene til /photos/ (se Bilder)
├── wattsup/
└── morning-news/
    ├── watch/            # ukefilene uke-ÅÅÅÅ-UU.json, lest av /morning-news/watch/
    └── market/           # til markedsrapporten, når den flyttes hit
```

Siden `/morning-news/watch/` logger inn med Google i nettleseren og leser filene med Drive-API-et
(`drive.readonly`). Mappe-ID-en står i `CONFIG.folderId` i `morning-news/watch/watch.js`. Lages
en ny mappe, må både ID-en der og instruksen til oppgaven som skriver filene oppdateres.

## Bilder

Originalene ligger i den private Drive-mappa `arefossa.no/photos`. Bare nettversjonene ligger
her, laget med `tools/prepare_photos.py` (krever Pillow: `pip install pillow`):

- `<navn>-960.jpg` og `<navn>-1920.jpg` til det store bildet, `<navn>-thumb.jpg` (400 px) til
  miniatyren.
- All metadata fjernes (EXIF og XMP: kamera, tidspunkt og eventuelt GPS), fordi repoet er
  offentlig. Bare fargeprofilen beholdes, så fargene blir riktige (bildene fra Bilder på Mac er
  Display P3).

Slik legges et nytt bilde til:

1. `python tools/prepare_photos.py <original.jpeg> <ÅÅÅÅ-MM-DD-navn>`. Skriptet skriver ut målene
   og når bildet ble tatt.
2. I `photos/index.html`: legg til en miniatyr i `.thumbs` og en `<figure>` i `.stage`, med samme
   id. Skriv en alt-tekst som beskriver bildet, og en kort bildetekst. Telleren («2 / 5») setter
   skriptet selv.

Uten skript virker miniatyrene som lenker til `#id`, og CSS viser bildet med den id-en.

## Se siden lokalt

```bash
python -m http.server 8080
```

Åpne <http://localhost:8080>.

## DNS hos domene.no

GitHub Pages trenger disse postene for arefossa.no (fra GitHubs dokumentasjon):

| Navn | Type | Verdi |
|---|---|---|
| `@` (arefossa.no) | A | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 |
| `@` (arefossa.no) | AAAA | 2606:50c0:8000::153, 2606:50c0:8001::153, 2606:50c0:8002::153, 2606:50c0:8003::153 |
| `www` | CNAME | arefossa.github.io |

Rør ikke disse:
- `mail.arefossa.no` (A, 185.126.36.19) og MX: e-posten.
- `wattsup.arefossa.no` (CNAME til Azure Container Apps): WattsUp.

SPF-posten (TXT på `@`) har i dag `+a`, som godkjenner adressen til arefossa.no som avsender av
e-post. Når arefossa.no peker til GitHub, bør `+a` tas bort:

```
v=spf1 +mx +ip4:185.126.36.19 include:_spf.spamprotection.no ~all
```

Hoveddomenet er `www.arefossa.no` (fila `CNAME`). GitHub sender arefossa.no videre dit. Det ble
valgt 11.11.2026 fordi GitHubs DNS-sjekk fortsatt husket den gamle adressen til arefossa.no (TTL 4
timer), mens www allerede var godkjent og kunne få HTTPS med en gang. Vil man ha arefossa.no som
hoveddomene, endres `CNAME` når GitHub godtar det (Settings → Pages viser grønn DNS-sjekk).

Når DNS-en er på plass, slå på «Enforce HTTPS» under Settings → Pages. Bekreft også domenet under
GitHub-kontoens Settings → Pages (verified domains), så ingen andre kan ta det i bruk på GitHub.
