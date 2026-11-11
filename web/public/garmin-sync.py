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

    def upsert(self, rec):
        try:
            self.call("POST", "/api/collections/activities/records", rec)
            return "nieuw"
        except urllib.error.HTTPError as e:
            if e.code != 400:
                raise
        body = {k: v for k, v in rec.items() if k not in ("id", "user")}
        self.call("PATCH", f"/api/collections/activities/records/{rec['id']}", body)
        return "bijgewerkt"


# ---------- Garmin ----------

def garmin_activities(days_back):
    fake = os.environ.get("FAKE_FILE")
    if fake:
        with open(fake) as f:
            return json.load(f)
    from garminconnect import Garmin  # pas hier, zodat de test zonder kan

    token_dir = os.environ.get("TOKEN_DIR", "/data")
    os.makedirs(token_dir, exist_ok=True)
    g = Garmin(env("GARMIN_EMAIL"), env("GARMIN_PASSWORD"))
    try:
        g.login(token_dir)  # hergebruikt een bewaarde sessie als die er is
    except TypeError:
        g.login()
    end = dt.date.today()
    start = end - dt.timedelta(days=days_back)
    return g.get_activities_by_date(start.isoformat(), end.isoformat())


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
    }


def run_once():
    acts = garmin_activities(int(os.environ.get("DAYS_BACK", "10")))
    pb = PB(env("PB_URL"), env("PB_EMAIL"), env("PB_PASSWORD"))
    counts = {}
    for a in acts:
        rec = to_record(a, pb.user)
        if not rec["date"]:
            continue
        what = pb.upsert(rec)
        counts[what] = counts.get(what, 0) + 1
    log(f"{len(acts)} activiteiten van Garmin:", counts or "niets te doen")


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
