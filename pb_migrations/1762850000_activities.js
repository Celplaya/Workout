/// <reference path="../pb_data/types.d.ts" />

// Activities imported from a watch (Garmin). Written by the sync script on the
// NAS (web/public/garmin-sync.py), read by the app to fill in Zone 2.

migrate(
  (app) => {
    const OWNER = "user = @request.auth.id";
    const activities = new Collection({
      type: "base",
      name: "activities",
      listRule: OWNER,
      viewRule: OWNER,
      createRule: '@request.auth.id != "" && @request.body.user = @request.auth.id',
      updateRule: OWNER + " && (@request.body.user:isset = false || @request.body.user = @request.auth.id)",
      deleteRule: OWNER,
      fields: [
        { name: "user", type: "relation", required: true, collectionId: "_pb_users_auth_", maxSelect: 1, cascadeDelete: true },
        { name: "source", type: "text", max: 20 },
        { name: "type", type: "text", max: 60 },
        { name: "name", type: "text", max: 200 },
        { name: "date", type: "text", max: 10 },
        { name: "start", type: "number" },
        { name: "minutes", type: "number" },
        { name: "avg_hr", type: "number" },
        { name: "max_hr", type: "number" },
        { name: "distance", type: "number" },
        { name: "calories", type: "number" },
      ],
      indexes: ["CREATE INDEX idx_activities_user_date ON activities (user, date)"],
    });
    app.save(activities);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("activities"));
    } catch (_) {}
  },
);
