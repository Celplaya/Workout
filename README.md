# Workout Program

Persoonlijke trainingslog voor de iPhone, als PWA ("Zet op beginscherm" in Safari).
Alle data staat in PocketBase op de NAS. Het netwerk is alleen bereikbaar via Tailscale, en er is geen cloud en geen tracking.

- **Vandaag:** de training van vandaag volgens je schema, of "Rustdag" met de volgende training.
- **Loggen:** grote steppers voor kg en reps, vooraf ingevuld met je vorige waarde. Bij elke oefening zie je "vorige: 3×8 @ 60 kg".
- **Extra's:** een rusttimer die na elke set automatisch start, PR-meldingen, een overload-hint (+2,5 kg) en een Norwegian 4×4-timer.
- **Overzicht:** na afloop zie je volume, duur, PR's en ▲ = ▼ ten opzichte van de vorige keer.
- **Voortgang:** een weekoverzicht en per oefening grafieken van je zwaarste gewicht en volume per week.
- **Offline:** alles wordt eerst lokaal opgeslagen (IndexedDB) en gesynchroniseerd zodra de server bereikbaar is. Een per ongeluk gesloten sessie gaat verder waar je was.

## Opbouw

```
web/                Frontend: Vite + Svelte 5 + TypeScript (PWA)
  src/lib/          data (IndexedDB + outbox), sync, statistiek, timers
  src/screens/      Vandaag, Sessie, Cardio, Overzicht, Voortgang, Oefening, Schema, Dag, Instellingen
  src/components/   Stepper, RestBar, Chart, TabBar, …
pb_migrations/      PocketBase-schema (JS-migraties)
deploy/             docker-compose voor TrueNAS, Tailscale serve-config, PocketBase-installer
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
| `settings` | rusttijd en standaard stapgrootte |

Bij de eerste login maakt de app je standaardschema aan: ma Push · di Pull · wo Legs · do Cardio (4×4) · vr Upper · za Lower · zo Rust. Je past dit aan onder **Schema**.

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

Na een push naar `main` doet de workflow `.github/workflows/deploy.yml` het volgende op je self-hosted runner:

1. installeren, testen, type-checken en de frontend bouwen
2. het PocketBase-binary (versie `PB_VERSION`) downloaden en de checksum controleren, naar `/mnt/Opslag/apps/workout/bin`
3. de migraties eerst controleren op een lege testdatabase
4. `web/dist` naar `pb_public` en `pb_migrations` naar de NAS kopiëren
5. de container `workout-pb` herstarten. PocketBase voert nieuwe migraties automatisch uit bij het opstarten, daarna volgt een health check.

### Eenmalige installatie

**1. Dataset**

Maak in TrueNAS een dataset aan, bijvoorbeeld `Opslag/apps/workout` (mountpoint `/mnt/Opslag/apps/workout`).

**2. Self-hosted runner**

Voeg de runner toe via GitHub → repo `Celplaya/Workout` → Settings → Actions → Runners → *New self-hosted runner*. De runner moet:
- de labels `self-hosted` en `linux` hebben (standaard)
- schrijfrechten hebben op `/mnt/Opslag/apps/workout`, op exact dat pad. Draait de runner in een container, mount de dataset dan op hetzelfde pad.
- `docker` kunnen gebruiken (lid van de docker-groep, of `/var/run/docker.sock` gemount)
- `curl`, `sha256sum` en `unzip` (of `python3`) hebben

Wijkt een pad of containernaam af? Zet dan onder Settings → Secrets and variables → Actions → **Variables** `APP_DIR` en/of `PB_CONTAINER`.

**3. Eerste deploy**

Start de workflow handmatig: Actions → *Deploy naar NAS* → *Run workflow*. Die zet het binary, de frontend en `tailscale/config/serve.json` klaar. De herstartstap geeft nu nog een waarschuwing, omdat de container nog niet bestaat.

**4. Tailscale**

Zet in de [Tailscale admin console](https://login.tailscale.com/admin/dns) **MagicDNS** en **HTTPS Certificates** aan. Maak daarna onder Settings → Keys een **auth key** aan.

> Waarom HTTPS? iOS staat een service worker (offline werken) en "scherm aan houden" alleen toe op HTTPS. `tailscale serve` regelt een geldig certificaat voor `workout.<tailnet>.ts.net`. Dat adres is alleen bereikbaar binnen je tailnet, en er gaat geen poort open op de NAS.

**5. App installeren in TrueNAS**

Ga naar Apps → Discover Apps → ⋮ → **Install via YAML**. Plak de inhoud van `deploy/docker-compose.yml` en vervang `TS_AUTHKEY`.

**6. Account aanmaken**

Open `https://workout.<tailnet>.ts.net/_/` en maak een superuser aan. De eerste keer vraagt PocketBase je om een installatielink uit de logs: TrueNAS → Apps → workout → Logs van `workout-pb`. Je kunt de superuser ook via de shell aanmaken:
`docker exec workout-pb /pb/bin/pocketbase superuser upsert jij@example.com 'sterk-wachtwoord' --dir=/pb/pb_data`.

Ga daarna naar Collections → `users` → *New record* en vul je e-mail en wachtwoord in (vink *verified* aan).

**7. Op de iPhone**

Zorg dat Tailscale aan staat, open `https://workout.<tailnet>.ts.net` in Safari, tik op Deel → **Zet op beginscherm** en log in.

Vanaf nu volstaat: **push naar `main` → binnen een minuut live.** Een nieuwe versie zie je in de app onder Instellingen ("Nieuwe versie beschikbaar"). De app ververst nooit vanzelf midden in een training.

### PocketBase updaten

Verhoog `PB_VERSION` in `.github/workflows/deploy.yml` en push. Lees eerst de [changelog](https://github.com/pocketbase/pocketbase/blob/master/CHANGELOG.md) en maak een backup.

### Schema wijzigen

Voeg een nieuw bestand toe in `pb_migrations/` (bijvoorbeeld `1760000000_iets.js`). Pas het schema niet via de admin-UI aan: PocketBase draait met `--automigrate=false`, dus die wijzigingen komen niet in git terecht.

## Backups

De data staat in `/mnt/Opslag/apps/workout/pb_data` (SQLite). Gebruik bij voorkeur twee lagen.

**1. PocketBase-backups (consistent, ook tijdens gebruik)**

Ga in `https://workout.<tailnet>.ts.net/_/` naar Settings → **Backups**:

- Zet *auto backups* aan, bijvoorbeeld cron `0 3 * * *` met *max keep* 14.
- De zips komen in `pb_data/backups/`.
- *Initialize new backup* maakt er direct een. Met het downloadicoon haal je een kopie op.

**2. ZFS-snapshots en replicatie**

Maak in TrueNAS onder Data Protection → **Periodic Snapshot Tasks** een taak voor dataset `Opslag/apps/workout`, bijvoorbeeld dagelijks met 30 dagen bewaren. Daarmee heb je ook de backup-zips uit stap 1.

Wil je een kopie buiten de NAS? Gebruik dan *Replication Tasks* naar een tweede pool of machine, of een Cloud Sync-taak naar een eigen doel.

**Terugzetten**

- **Via de admin-UI:** Settings → Backups → *Restore*. PocketBase herstart zelf.
- **Handmatig:**
  1. Stop de app.
  2. Pak de backup-zip uit over `pb_data/`, of zet een ZFS-snapshot terug.
  3. Start de app weer.

> De app op de iPhone heeft altijd ook een lokale kopie. Na een restore haalt hij de serverdata opnieuw op. Lokale wijzigingen die nog niet gesynchroniseerd waren, worden daarna alsnog verstuurd.
