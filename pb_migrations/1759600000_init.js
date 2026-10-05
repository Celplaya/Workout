/// <reference path="../pb_data/types.d.ts" />

// Initial schema for Workout Program.
// Every collection carries a `user` relation and is only accessible to its owner.

const OWNER = "user = @request.auth.id";
const CREATE =
  '@request.auth.id != "" && @request.body.user = @request.auth.id';
const UPDATE =
  OWNER + " && (@request.body.user:isset = false || @request.body.user = @request.auth.id)";

function ownerRules() {
  return {
    listRule: OWNER,
    viewRule: OWNER,
    createRule: CREATE,
    updateRule: UPDATE,
    deleteRule: OWNER,
  };
}

function userField() {
  return {
    name: "user",
    type: "relation",
    required: true,
    collectionId: "_pb_users_auth_",
    maxSelect: 1,
    cascadeDelete: true,
  };
}

const num = (name, extra) => Object.assign({ name, type: "number" }, extra || {});
const text = (name, extra) => Object.assign({ name, type: "text" }, extra || {});
const bool = (name) => ({ name, type: "bool" });

migrate(
  (app) => {
    // Single-user app: nobody may self-register, and logins stay valid for 30 days
    // so the app keeps working offline in the gym.
    const users = app.findCollectionByNameOrId("_pb_users_auth_");
    users.createRule = null;
    users.authToken.duration = 60 * 60 * 24 * 30;
    app.save(users);

    const exercises = new Collection(
      Object.assign(
        {
          type: "base",
          name: "exercises",
          fields: [
            userField(),
            text("name", { required: true, max: 100 }),
            num("increment"),
            bool("archived"),
          ],
          indexes: ["CREATE INDEX idx_exercises_user ON exercises (user)"],
        },
        ownerRules(),
      ),
    );
    app.save(exercises);

    const days = new Collection(
      Object.assign(
        {
          type: "base",
          name: "days",
          fields: [
            userField(),
            num("weekday", { required: true, min: 1, max: 7, onlyInt: true }),
            text("name", { max: 50 }),
            {
              name: "kind",
              type: "select",
              required: true,
              maxSelect: 1,
              values: ["strength", "cardio", "rest"],
            },
          ],
          indexes: ["CREATE UNIQUE INDEX idx_days_user_weekday ON days (user, weekday)"],
        },
        ownerRules(),
      ),
    );
    app.save(days);

    const planItems = new Collection(
      Object.assign(
        {
          type: "base",
          name: "plan_items",
          fields: [
            userField(),
            {
              name: "day",
              type: "relation",
              required: true,
              collectionId: days.id,
              maxSelect: 1,
              cascadeDelete: true,
            },
            {
              name: "exercise",
              type: "relation",
              required: true,
              collectionId: exercises.id,
              maxSelect: 1,
              cascadeDelete: true,
            },
            num("position"),
            num("target_sets", { onlyInt: true }),
            num("target_reps", { onlyInt: true }),
          ],
          indexes: ["CREATE INDEX idx_plan_items_user ON plan_items (user)"],
        },
        ownerRules(),
      ),
    );
    app.save(planItems);

    const sessions = new Collection(
      Object.assign(
        {
          type: "base",
          name: "sessions",
          fields: [
            userField(),
            {
              name: "day",
              type: "relation",
              collectionId: days.id,
              maxSelect: 1,
              cascadeDelete: false,
            },
            // Local calendar date of the workout, YYYY-MM-DD.
            text("date", { required: true, pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
            text("day_name", { max: 50 }),
            text("kind", { max: 20 }),
            // Epoch milliseconds (avoids date-string parsing quirks in Safari).
            num("started"),
            num("finished"),
            text("note", { max: 2000 }),
            bool("cardio_done"),
            num("avg_hr"),
          ],
          indexes: ["CREATE INDEX idx_sessions_user_date ON sessions (user, date)"],
        },
        ownerRules(),
      ),
    );
    app.save(sessions);

    const sets = new Collection(
      Object.assign(
        {
          type: "base",
          name: "sets",
          fields: [
            userField(),
            {
              name: "session",
              type: "relation",
              required: true,
              collectionId: sessions.id,
              maxSelect: 1,
              cascadeDelete: true,
            },
            {
              name: "exercise",
              type: "relation",
              required: true,
              collectionId: exercises.id,
              maxSelect: 1,
              cascadeDelete: true,
            },
            num("idx", { onlyInt: true }),
            num("weight", { min: 0 }),
            num("reps", { min: 0, onlyInt: true }),
            num("at"),
          ],
          indexes: [
            "CREATE INDEX idx_sets_user ON sets (user)",
            "CREATE INDEX idx_sets_session ON sets (session)",
          ],
        },
        ownerRules(),
      ),
    );
    app.save(sets);

    const settings = new Collection(
      Object.assign(
        {
          type: "base",
          name: "settings",
          fields: [userField(), num("rest_seconds", { onlyInt: true }), num("increment")],
          indexes: ["CREATE UNIQUE INDEX idx_settings_user ON settings (user)"],
        },
        ownerRules(),
      ),
    );
    app.save(settings);
  },
  (app) => {
    for (const name of ["sets", "sessions", "plan_items", "days", "exercises", "settings"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const users = app.findCollectionByNameOrId("_pb_users_auth_");
    users.createRule = "";
    users.authToken.duration = 604800;
    app.save(users);
  },
);
