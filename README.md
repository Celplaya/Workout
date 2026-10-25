# Workout Program

Persoonlijke trainingslog voor de iPhone, als PWA ("Zet op beginscherm" in Safari).
Alle data staat in PocketBase op de NAS, alleen bereikbaar via Tailscale. Er is geen cloud en geen tracking.

- **Vandaag:** de training van vandaag volgens je schema, of "Rustdag" met de volgende training.
- **Loggen:** grote steppers voor kg en reps, vooraf ingevuld met je vorige waarde. Bij elke oefening zie je "vorige: 3×8 @ 60 kg".
- **Extra's:** een rusttimer die na elke set automatisch start, PR-meldingen, een overload-hint (+2,5 kg) en een Norwegian 4×4-timer.
- **Overzicht:** na afloop zie je volume, duur, PR's en ▲ = ▼ ten opzichte van de vorige keer.
- **Voortgang:** een weekoverzicht en per oefening grafieken van je zwaarste gewicht en volume per week.
- **Calisthenics:** oefeningen meet je in reps, seconden (holds, met ingebouwde hold-timer) of minuten. Per oefening in je schema staan een notitie en eventueel een eigen rusttijd.
- **Skills:** een checklist per laag (snel af te vinken, hoofdfocus, lange termijn, later). Een skill gekoppeld aan een oefening vinkt de app voor je aan zodra je het doel haalt.
- **Automatische progressie:** haal je een doel **2 sessies op rij**, dan stelt de app de volgende stap voor (bijvoorbeeld tuck L-sit → one-leg L-sit) of een hoger doel (+1 rep, +2/+5 s). Jij bevestigt met één tik of kiest "Niet nu".
- **Offline:** alles wordt eerst lokaal opgeslagen (IndexedDB) en gesynchroniseerd zodra de server bereikbaar is. Een per ongeluk gesloten sessie gaat verder waar je was.

## Opbouw

```
web/                Frontend: Vite + Svelte 5 + TypeScript (PWA)
  src/lib/          data (IndexedDB + outbox), sync, statistiek, timers
  src/screens/      Vandaag, Sessie, Cardio, Overzicht, Voortgang, Oefening, Schema, Dag, Instellingen
  src/components/   Stepper, RestBar, Chart, TabBar, …
pb_migrations/      PocketBase-schema (JS-migraties)
deploy/             PocketBase-installer (voor de migratietest in de workflow)
.github/workflows/  push-to-deploy via de self-hosted runner
```

**Waarom Svelte:** de compiler levert een kleine runtime (de hele app is ±48 kB gzip). Je krijgt wel reactiviteit, en die is handig bij steppers, timers en live totalen. Er is geen zwaar framework nodig, en grafieken zijn eenvoudige SVG.

### Datamodel (PocketBase)

Elke collectie heeft een `user`-relatie, en de API-regels laten alleen de eigenaar lezen en schrijven. Registreren is uitgeschakeld.

| Collectie | Inhoud |
|---|---|
| `exercises` | oefeningenbibliotheek (naam, stapgrootte, gearchiveerd) |
| `days` | weekschema: weekdag 1–7, naam, type `strength`/`cardio`/`rest` |
| `plan_items` | oefening per dag met volgorde en doel sets × reps |
| `sessions` | een training: datum, start/einde (epoch ms), cardio gedaan, gem. hartslag, notitie |
| `sets` | gewicht en reps per set |
| `settings` | rusttijd, standaard stapgrootte en het geladen programma |
| `skills` | skill, laag, gekoppelde oefening, doel per set, datum gehaald |
| `dismissals` | voorstellen die je hebt geaccepteerd of weggeklikt |

Oefeningen hebben daarnaast `measure` (reps/seconds/minutes), `next` (volgende stap in de ladder), `default_sets`/`default_target` (startdoel van die stap), `progress` (doel automatisch verhogen) en `cue` (tip tijdens het loggen). Bij holds staat de tijd in het veld `reps` van een set.

Het calisthenics-programma (`web/src/lib/program.ts`) wordt één keer per `PROGRAM_ID` geladen. Nu is dat upper/lower: ma Upper A · di Lower A · wo Mobility + zone 2 · do Upper B · vr Lower B · za/zo Rust, met alle progressieladders en de skilllijst. Bestaande oefeningen worden op naam hergebruikt, dus je geschiedenis blijft. Voortgang uit het oude schema (een verhoogd doel of een volgende stap in de ladder) neemt het nieuwe schema over. Seed-records krijgen een vaste id, zodat een tweede toestel geen dubbele records maakt. Voor een nieuw programma pas je `DAYS` aan en verhoog je `PROGRAM_ID`.

### Sync

Elke wijziging komt eerst in IndexedDB terecht en in een outbox. De outbox wordt in volgorde naar PocketBase gestuurd:

- na elke wijziging
- als je weer online bent
- als je de app opent
- elke 30 s zolang er iets wacht

ID's worden op het toestel gemaakt, dus opnieuw versturen is veilig. Het bolletje rechtsboven geeft de status: groen = alles gesynchroniseerd, grijs = wachtend, rood = offline.

## Lokaal ontwikkelen

Je hebt Node 22+ nodig en het [PocketBase-binary](https://pocketbase.io/docs/) (v0.40.x).

```sh
# 1. PocketBase starten met de migraties uit deze repo
./pocketbase serve --dir=./pb_data --migrationsDir=./pb_migrations --automigrate=false

# 2. Account aanmaken: open http://127.0.0.1:8090/_/, maak een superuser,
#    en voeg daarna in de collectie "users" een record toe (e-mail + wachtwoord).

# 3. Frontend met hot reload (proxy't /api naar :8090)
cd web
npm install
npm run dev          # http://localhost:5173

npm test             # unit tests (statistiek: PR's, overload-hint, volume…)
npm run check        # type-check
npm run build        # productie-build in web/dist
```

Op `localhost` werkt ook de service worker (`npm run build && npx vite preview`).

## Deployment naar de NAS

Zelfde recept als Wortschatz (`:8090`) en journey (`:8091`). Workout draait op **`:8092`**.

Bij een push naar `main` doet de runner op de NAS (`.github/workflows/deploy.yml`) het volgende:

1. installeren, testen, type-checken en de frontend bouwen
2. de migraties testen op een lege database
3. `web/dist` naar `/deploy` kopiëren (= dataset `workout-public`, in PocketBase `/pb_public`)
4. `pb_migrations` naar `/migrations` kopiëren (= dataset `workout-migrations`, in PocketBase `/pb_migrations`)

Komt er een nieuwe migratie bij, dan geeft de workflow een waarschuwing. Herstart dan de PocketBase-app in TrueNAS, want PocketBase voert migraties uit bij het opstarten.

### Eenmalige installatie

| Onderdeel | Instelling |
|---|---|
| Datasets | `Opslag/workout-public` en `Opslag/workout-migrations` |
| Runner (Custom App `myoung34/github-runner`) | `REPO_URL=https://github.com/Celplaya/Workout`, verse `RUNNER_TOKEN`, `RUNNER_NAME=truenas-workout`, `LABELS=truenas`, `RUNNER_SCOPE=repo`. Storage: `workout-public` → `/deploy`, `workout-migrations` → `/migrations` |
| PocketBase (Custom App `ghcr.io/muchobien/pocketbase`) | host-poort 8092 → container 8090. Storage: ixVolume → `/pb_data`, `workout-public` → `/pb_public`, `workout-migrations` → `/pb_migrations`. Alle drie vast. |
| Superuser | `docker exec <container> pocketbase superuser upsert jij@example.com 'wachtwoord' --dir /pb_data` |
| App-account | admin `:8092/_/` → `users` → *New record* (vink *verified* aan) |

Volgorde: eerst de runner en een eerste deploy, daarna PocketBase installeren. Dan staan de migraties al klaar en maakt PocketBase bij de eerste start meteen alle collecties aan.

**HTTPS (aanbevolen):** iOS staat offline werken (service worker) en "scherm aan houden" alleen toe via HTTPS. Via de Tailscale-app op de NAS:
`tailscale serve --bg --https=10443 http://127.0.0.1:8092`. Daarvoor moeten in de Tailscale admin console *MagicDNS* en *HTTPS Certificates* aan staan. Daarna open je `https://truenas-scale.tail5a4b66.ts.net:10443`. Zonder HTTPS werkt de app ook, maar alleen met verbinding.

### PocketBase updaten

Update de PocketBase-app in TrueNAS en verhoog `PB_VERSION` in de workflow (die versie wordt alleen gebruikt voor de migratietest). Lees eerst de [changelog](https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md) en maak een backup.

### Schema wijzigen

Voeg een nieuw bestand toe in `pb_migrations/` (bijvoorbeeld `1761000000_iets.js`). Pas het schema niet via de admin-UI aan, anders loopt de database uit de pas met git.

## Backups

De data staat in het ixVolume dat op `/pb_data` gekoppeld is (SQLite). Gebruik bij voorkeur twee lagen.

**1. PocketBase-backups (consistent, ook tijdens gebruik)**

Ga in `http://truenas-scale.tail5a4b66.ts.net:8092/_/` naar Settings → **Backups**:

- Zet *auto backups* aan, bijvoorbeeld cron `0 3 * * *` met *max keep* 14.
- De zips komen in `pb_data/backups/`.
- *Initialize new backup* maakt er direct een. Met het downloadicoon haal je een kopie op.

**2. ZFS-snapshots en replicatie**

Maak in TrueNAS onder Data Protection → **Periodic Snapshot Tasks** een taak voor de pool of de app-datasets, bijvoorbeeld dagelijks met 30 dagen bewaren. Let op: een ixVolume valt onder `ix-apps`, neem dat dus mee. De backup-zips uit stap 1 staan in `/pb_data/backups`.

Wil je een kopie buiten de NAS? Gebruik dan *Replication Tasks* naar een tweede pool of machine, of een Cloud Sync-taak naar een eigen doel.

**Terugzetten**

- **Via de admin-UI:** Settings → Backups → *Restore*. PocketBase herstart zelf.
- **Handmatig:**
  1. Stop de app.
  2. Pak de backup-zip uit over `pb_data/`, of zet een ZFS-snapshot terug.
  3. Start de app weer.

> De app op de iPhone heeft altijd ook een lokale kopie. Na een restore haalt hij de serverdata opnieuw op. Lokale wijzigingen die nog niet gesynchroniseerd waren, worden daarna alsnog verstuurd.
