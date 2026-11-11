# arefossa.no

Personlig forside for arefossa.no: About, Photos, WattsUp og Morning news. Ren HTML og CSS, uten
byggesteg, eksterne fonter eller skript. Publiseres med GitHub Pages fra `main`.

```
├── index.html            # forsiden med de fire valgene
├── about/index.html      # About (lorem ipsum foreløpig)
├── photos/index.html     # Photos (plassholdere foreløpig)
├── morning-news/         # lenker til rapportene fra de planlagte oppgavene i Claude
├── 404.html
├── assets/style.css      # alle stiler, med lyst og mørkt tema
├── assets/favicon.svg
├── CNAME                 # arefossa.no, for GitHub Pages
└── .nojekyll             # filene serveres som de er
```

## Morning news

Rapportene er private sider i Claude, oppdatert på samme adresse av planlagte oppgaver. Siden
lenker bare til dem, med nøytrale navn, og ligger ikke i søkemotorer (`noindex`). Bare eieren kan
åpne rapportene, innlogget på claude.ai. Innholdet publiseres aldri her, og repoet er offentlig, så
navn på rapportene skal heller ikke stå her.

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

Når DNS-en er på plass, slå på «Enforce HTTPS» under Settings → Pages. Bekreft også domenet under
GitHub-kontoens Settings → Pages (verified domains), så ingen andre kan ta det i bruk på GitHub.
