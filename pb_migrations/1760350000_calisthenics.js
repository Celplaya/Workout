/// <reference path="../pb_data/types.d.ts" />

// Calisthenics: holds (seconds/minutes), progression ladders between exercises,
// per-plan-item notes and rest, a skills checklist and dismissed proposals.

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

migrate(
  (app) => {
    const exercises = app.findCollectionByNameOrId("exercises");
    // What a set's `reps` value means: repetitions (default), seconds or minutes.
    exercises.fields.add(
      new SelectField({ name: "measure", maxSelect: 1, values: ["reps", "seconds", "minutes"] }),
    );
    // Suggest a higher target once the current one is reached (bodyweight work).
    exercises.fields.add(new BoolField({ name: "progress" }));
    // Next step in the progression ladder, with the target to start it at.
    exercises.fields.add(
      new RelationField({
        name: "next",
        collectionId: exercises.id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    );
    exercises.fields.add(new NumberField({ name: "default_sets", onlyInt: true, min: 0 }));
    exercises.fields.add(new NumberField({ name: "default_target", onlyInt: true, min: 0 }));
    exercises.fields.add(new TextField({ name: "cue", max: 300 }));
    app.save(exercises);

    const planItems = app.findCollectionByNameOrId("plan_items");
    planItems.fields.add(new TextField({ name: "note", max: 300 }));
    planItems.fields.add(new NumberField({ name: "rest_seconds", onlyInt: true, min: 0 }));
    app.save(planItems);

    const settings = app.findCollectionByNameOrId("settings");
    // Id of the training program that was loaded last (applied once per program).
    settings.fields.add(new TextField({ name: "program", max: 50 }));
    app.save(settings);

    const skills = new Collection(
      Object.assign(
        {
          type: "base",
          name: "skills",
          fields: [
            userField(),
            { name: "name", type: "text", required: true, max: 100 },
            // 1 = quick wins, 2 = main focus, 3 = long term, 4 = later
            { name: "tier", type: "number", onlyInt: true, min: 0, max: 9 },
            { name: "position", type: "number" },
            // Exercise whose best set measures this skill (optional).
            {
              name: "exercise",
              type: "relation",
              collectionId: exercises.id,
              maxSelect: 1,
              cascadeDelete: false,
            },
            // Goal for one set, in the exercise's measure (reps/seconds/minutes).
            { name: "goal", type: "number", min: 0 },
            // epoch ms, 0 = not achieved yet
            { name: "achieved_at", type: "number" },
            { name: "note", type: "text", max: 300 },
          ],
          indexes: ["CREATE INDEX idx_skills_user ON skills (user)"],
        },
        ownerRules(),
      ),
    );
    app.save(skills);

    // A proposal that was accepted or waved away ("Niet nu"), so it is not shown again.
    const dismissals = new Collection(
      Object.assign(
        {
          type: "base",
          name: "dismissals",
          fields: [userField(), { name: "key", type: "text", required: true, max: 200 }],
          indexes: ["CREATE INDEX idx_dismissals_user ON dismissals (user)"],
        },
        ownerRules(),
      ),
    );
    app.save(dismissals);
  },
  (app) => {
    for (const name of ["dismissals", "skills"]) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (_) {}
    }
    const drop = { exercises: ["measure", "progress", "next", "default_sets", "default_target", "cue"], plan_items: ["note", "rest_seconds"], settings: ["program"] };
    for (const [col, fields] of Object.entries(drop)) {
      const c = app.findCollectionByNameOrId(col);
      for (const f of fields) c.fields.removeByName(f);
      app.save(c);
    }
  },
);
