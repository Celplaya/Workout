#!/usr/bin/env python3
"""Garmin Connect -> Workout (PocketBase).

Haalt je recente Garmin-activiteiten op en zet ze in de collectie
`activities`. De app vult daarmee Zone 2 in. Draait als lus in een container
op de NAS (zie README, "Garmin koppelen").

Omgevingsvariabelen:
  GARMIN_EMAIL, GARMIN_PASSWORD   je Garmin Connect-login
  PB_URL                          bijv. http://192.168.1.10:8092
  PB_EMAIL, PB_PASSWORD           je login van de Workout-app
  INTERVAL_MIN                    minuten tussen twee rondes (standaard 60)
  DAYS_BACK                       hoeveel dagen terugkijken (standaard 10)
  BACKFILL_DAYS                   eerste keer: dagen hersteldata ophalen (standaard 28)
  DEBUG                           toon de ruwe Garmin-velden van vandaag in de log
  TOKEN_DIR                       map voor de Garmin-sessie (standaard /data)
  FAKE_FILE                       test: lees activiteiten uit dit JSON-bestand
  ONCE                            test: één ronde en dan stoppen

Dit gebruikt de onofficiële bibliotheek `garminconnect`. Als Garmin de inlog
verandert, werkt het een tijd niet tot die bibliotheek is bijgewerkt
(container herstarten haalt de nieuwste versie op).
"""
import datetime as dt
import json
import os
import sys
import time
import urllib.error
import urllib.request


def env(name, default=None):
    v = os.environ.get(name, default)
    if v is None:
        sys.exit(f"{name} ontbreekt")
    return v


def log(*a):
    print(dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S"), *a, flush=True)


# ---------- PocketBase ----------

class PB:
    def __init__(self, url, email, password):
        self.url = url.rstrip("/")
        r = self.call("POST", "/api/collections/users/auth-with-password", {"identity": email, "password": password})
        self.token = r["token"]
        self.user = r["record"]["id"]

    def call(self, method, path, data=None):
        req = urllib.request.Request(
            self.url + path,
            method=method,
            data=json.dumps(data).encode() if data is not None else None,
            headers={"Content-Type": "application/json", **({"Authorization": self.token} if getattr(self, "token", None) else {})},
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.load(r)

    def upsert(self, rec, collection="activities"):
        try:
            self.call("POST", f"/api/collections/{collection}/records", rec)
            return "nieuw"
        except urllib.error.HTTPError as e:
            if e.code != 400:
                raise
        body = {k: v for k, v in rec.items() if k not in ("id", "user")}
        self.call("PATCH", f"/api/collections/{collection}/records/{rec['id']}", body)
        return "bijgewerkt"


# ---------- Garmin ----------

TOKEN_DIR = os.environ.get("TOKEN_DIR", "/data")


def fake():
    f = os.environ.get("FAKE_FILE")
    if not f:
        return None
    with open(f) as fh:
        data = json.load(fh)
    return data if isinstance(data, dict) else {"activities": data, "daily": {}}


def garmin_login():
    from garminconnect import Garmin  # pas hier, zodat de test zonder kan

    os.makedirs(TOKEN_DIR, exist_ok=True)
    g = Garmin(env("GARMIN_EMAIL"), env("GARMIN_PASSWORD"))
    try:
        g.login(TOKEN_DIR)  # hergebruikt een bewaarde sessie als die er is
    except TypeError:
        g.login()
    return g


def garmin_activities(g, days_back):
    end = dt.date.today()
    start = end - dt.timedelta(days=days_back)
    return g.get_activities_by_date(start.isoformat(), end.isoformat())


def dig(obj, *path):
    """Veilig door geneste dicts/lijsten lopen; None als iets ontbreekt."""
    for key in path:
        if isinstance(obj, list):
            obj = obj[key] if isinstance(key, int) and len(obj) > key else None
        elif isinstance(obj, dict):
            obj = obj.get(key)
        else:
            return None
    return obj


def n(v):
    try:
        return round(float(v))
    except (TypeError, ValueError):
        return 0


def garmin_day(g, day):
    """Ruwe hersteldata van één dag; elk onderdeel mag ontbreken."""
    out = {}
    for key, call in (
        ("stats", lambda: g.get_stats(day)),
        ("sleep", lambda: g.get_sleep_data(day)),
        ("hrv", lambda: g.get_hrv_data(day)),
        ("readiness", lambda: g.get_training_readiness(day)),
        ("max", lambda: g.get_max_metrics(day)),
    ):
        try:
            out[key] = call()
        except Exception as e:  # een ontbrekend onderdeel mag de rest niet blokkeren
            out[key] = None
            if os.environ.get("DEBUG"):
                log(f"  {day} {key}: {type(e).__name__} {e}")
        time.sleep(0.3)
    return out


def daily_record(day, raw, user):
    stats, sleep, hrv = raw.get("stats") or {}, raw.get("sleep") or {}, raw.get("hrv") or {}
    dto = sleep.get("dailySleepDTO") or {}
    summary = hrv.get("hrvSummary") or {}
    readiness = raw.get("readiness")
    return {
        "id": "d" + day.replace("-", "") + "000000",
        "user": user,
        "date": day,
        "resting_hr": n(stats.get("restingHeartRate") or dto.get("restingHeartRate")),
        "hrv": n(summary.get("lastNightAvg")),
        "hrv_weekly": n(summary.get("weeklyAvg")),
        "hrv_low": n(dig(summary, "baseline", "balancedLow")),
        "hrv_high": n(dig(summary, "baseline", "balancedUpper")),
        "hrv_status": str(summary.get("status") or "")[:30],
        "sleep_minutes": n((dto.get("sleepTimeSeconds") or 0) / 60),
        "sleep_score": n(dig(dto, "sleepScores", "overall", "value")),
        "battery_high": n(stats.get("bodyBatteryHighestValue")),
        "battery_low": n(stats.get("bodyBatteryLowestValue")),
        "stress": max(0, n(stats.get("averageStressLevel"))),
        "steps": n(stats.get("totalSteps")),
        "vo2max": n(dig(raw.get("max"), 0, "generic", "vo2MaxPreciseValue") or dig(raw.get("max"), 0, "generic", "vo2MaxValue")),
        "readiness": n(dig(readiness, 0, "score") if isinstance(readiness, list) else dig(readiness, "score")),
        "synced": int(time.time() * 1000),
    }


def has_data(rec):
    return any(rec[k] for k in ("resting_hr", "hrv", "sleep_minutes", "battery_high", "steps"))


def to_record(a, user):
    aid = str(a["activityId"])
    local = str(a.get("startTimeLocal") or a.get("startTimeGMT") or "")
    gmt = a.get("startTimeGMT")
    start_ms = 0
    if gmt:
        try:
            start_ms = int(dt.datetime.strptime(str(gmt)[:19], "%Y-%m-%d %H:%M:%S").replace(tzinfo=dt.timezone.utc).timestamp() * 1000)
        except ValueError:
            pass
    typ = a.get("activityType") or {}
    return {
        # 15 tekens a-z0-9, afgeleid van het Garmin-id: opnieuw draaien maakt geen dubbelen.
        "id": ("g" + aid.zfill(14))[-15:],
        "user": user,
        "source": "garmin",
        "type": str(typ.get("typeKey") or "")[:60],
        "name": str(a.get("activityName") or "")[:200],
        "date": local[:10],
        "start": start_ms,
        "minutes": round(float(a.get("duration") or 0) / 60),
        "avg_hr": round(float(a.get("averageHR") or 0)),
        "max_hr": round(float(a.get("maxHR") or 0)),
        "distance": round(float(a.get("distance") or 0)),
        "calories": round(float(a.get("calories") or 0)),
        # minuten per hartslagzone (Garmin levert seconden)
        **{f"z{i}": round(float(a.get(f"hrTimeInZone_{i}") or 0) / 60) for i in range(1, 6)},
    }


def run_once():
    data = fake()
    g = None if data else garmin_login()
    days_back = int(os.environ.get("DAYS_BACK", "10"))
    acts = data["activities"] if data else garmin_activities(g, days_back)
    pb = PB(env("PB_URL"), env("PB_EMAIL"), env("PB_PASSWORD"))
    counts = {}
    for a in acts:
        rec = to_record(a, pb.user)
        if not rec["date"]:
            continue
        what = pb.upsert(rec)
        counts[what] = counts.get(what, 0) + 1
    log(f"{len(acts)} activiteiten van Garmin:", counts or "niets te doen")

    # Hersteldata: de eerste keer een maand terug (voor de trend), daarna vandaag en gisteren.
    marker = os.path.join(TOKEN_DIR, "daily-backfilled")
    first = not data and not os.path.exists(marker)
    span = int(os.environ.get("BACKFILL_DAYS", "28")) if first else 2
    today = dt.date.today()
    days = sorted(data["daily"]) if data else [(today - dt.timedelta(days=i)).isoformat() for i in range(span - 1, -1, -1)]
    saved, last = 0, None
    try:
        for day in days:
            raw = data["daily"][day] if data else garmin_day(g, day)
            if os.environ.get("DEBUG") and day == days[-1]:
                log("ruw:", json.dumps({k: (sorted(v) if isinstance(v, dict) else v) for k, v in raw.items()}, default=str)[:3000])
            rec = daily_record(day, raw, pb.user)
            if has_data(rec):
                pb.upsert(rec, "daily")
                saved, last = saved + 1, rec
    except urllib.error.HTTPError as e:
        if e.code == 404:
            log("hersteldata overgeslagen: collectie 'daily' bestaat nog niet (herstart workout-pb na de deploy)")
            return
        raise
    if first and saved:
        open(marker, "w").close()
    if last:
        log(
            f"hersteldata {saved} dag(en) · {last['date']}: rust-HR {last['resting_hr']}, HRV {last['hrv']} ({last['hrv_status'] or '-'}),",
            f"slaap {last['sleep_minutes'] // 60}u{last['sleep_minutes'] % 60:02d} score {last['sleep_score']},",
            f"Body Battery {last['battery_low']}-{last['battery_high']}, stappen {last['steps']}",
        )
    else:
        log("hersteldata: niets ontvangen van Garmin")


def main():
    interval = int(os.environ.get("INTERVAL_MIN", "60")) * 60
    while True:
        try:
            run_once()
        except Exception as e:  # blijf draaien; volgende ronde opnieuw proberen
            log("mislukt:", type(e).__name__, e)
        if os.environ.get("ONCE"):
            return
        time.sleep(interval)


if __name__ == "__main__":
    main()
