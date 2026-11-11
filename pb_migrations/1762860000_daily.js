/// <reference path="../pb_data/types.d.ts" />

// Daily recovery numbers from the watch (HRV, resting heart rate, sleep, Body
// Battery, steps) and time per heart-rate zone for imported activities.

migrate(
  (app) => {
    const OWNER = "user = @request.auth.id";
    const num = (name) => ({ name, type: "number" });
    const daily = new Collection({
      type: "base",
      name: "daily",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
      updateRule: OWNER + " && (@request.body.user:isset = false || @request.body.user = @request.auth.id)",
      deleteRule: OWNER,
      fields: [
        { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true },
        { name: "date", type: "text", max: 10 },
        num("resting_hr"),
        num("hrv"),
        num("hrv_weekly"),
        num("hrv_low"),
        num("hrv_high"),
        { name: "hrv_status", type: "text", max: 30 },
        num("sleep_minutes"),
        num("sleep_score"),
        num("battery_high"),
        num("battery_low"),
        num("stress"),
        num("steps"),
        num("vo2max"),
        num("readiness"),
        num("synced"),
      ],
      indexes: ["CREATE INDEX idx_daily_user_date ON daily (user, date)"],
    });
    app.save(daily);

    const activities = app.findCollectionByNameOrId("activities");
    for (const z of ["z1", "z2", "z3", "z4", "z5"]) activities.fields.add(new NumberField({ name: z }));
    app.save(activities);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("daily"));
    } catch (_) {}
    const activities = app.findCollectionByNameOrId("activities");
    for (const z of ["z1", "z2", "z3", "z4", "z5"]) activities.fields.removeByName(z);
    app.save(activities);
  },
);
