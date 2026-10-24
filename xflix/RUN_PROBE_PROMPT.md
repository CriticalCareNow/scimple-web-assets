# Prompt for a Claude session running on your own computer

Paste everything below the line into Claude Desktop (with browser control on) or into Claude Code
started in this repo. That session can drive your logged-in browser. This repo's cloud session cannot.

Before you paste it:
- Make sure you are logged in to GoHighLevel in the browser Claude will control.
- Have a TEST sub-account ready. Do not use a live learner account.

---

You are helping me test whether a script can read course data inside GoHighLevel's Client Portal.
Work only in my GHL TEST sub-account, named: `<TEST SUB-ACCOUNT NAME>`.

Context: the repo `scimple-web-assets` (branch `claude/netflix-course-template-tm1xzn`) has
`xflix/probe.js` and `xflix/README.md`. Read both first. The probe is opt-in (it only runs when the
address contains `?xflixprobe=1`) and records key names and counts only, not values.

Rules:
- Do not type, guess or request any password, token or payment detail. If a login or 2FA screen
  appears, stop and ask me to complete it.
- Stay inside the test sub-account. Stop and ask before changing anything outside the steps below.
- Before you save anything in GHL, tell me what you are about to change.

Steps:
1. In the test sub-account, check that two products exist: "ResusX 2025" and "ResusX 2026", each
   with at least two folders and one video, and that a test learner is enrolled in both. If not,
   tell me what is missing and ask whether to create them. Do not create anything without my yes.
2. Open Sites > Client Portal > Settings > Branding > Advanced > Custom JavaScript.
   Note what is already in the box and tell me. If it is not empty, do not overwrite it: append the
   probe after the existing code and tell me you did. Paste the contents of `xflix/probe.js`. Save.
3. Open the Client Portal as the test learner (use the portal link with `?xflixprobe=1` added, in a
   private window if needed, and ask me to log in as the test learner).
4. Browse: the courses list, one course, one folder, one lesson.
5. Click the orange "XFlix probe" button, copy the report, and show it to me in full.
6. Summarise in plain language: (a) is there a response listing the learner's products, (b) do the
   folders and lectures appear with thumbnails and completion status, (c) anything missing.
7. Remove the probe from the Custom JavaScript box (restore whatever was there before). Save, and
   confirm it is gone.

Finish by telling me exactly what you changed in GHL and that it has been put back.
