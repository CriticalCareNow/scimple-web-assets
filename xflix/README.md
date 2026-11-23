# XFlix

Netflix-style course library for GoHighLevel courses (ResusX and others). It runs inside GHL's Client Portal:
GHL still hosts and plays the videos and records completion; XFlix is the new look and home page.

| File | What it is |
|---|---|
| `xflix.js` | The XFlix program (read-only, no secrets). Served from this public repo by jsDelivr at a fixed release. |
| `loader.js` | Small snippet for GHL's Custom JavaScript box. Loads one pinned release of `xflix.js`. |
| `config.example.js` | Settings block (Claim CME links, banner images, saved catalog). Lives in GHL. |
| `INSTALL.md` | How to install, switch off, update and roll back. How the fallbacks work. |
| `THEME_SETTINGS.md` | Colors and fonts to enter in GHL's course theme so GHL's own pages match. |
| `TEST_PLAN.md` | Step-by-step checks for the test sub-account. |
| `probe.js`, `probe2.js` | The two feasibility probes (opt-in, read-only). |
| `TEAM_INSTRUCTIONS.md`, `RUN_PROBE_PROMPT.md` | Instructions used to run probe 1. |
| `test/run.js` | 96 automated checks against a mock portal (`NODE_PATH=$(npm root -g) node xflix/test/run.js`). |

Status (Nov 22 2026): XFlix 1.1.0 is built and passes the mock-portal tests. Probe 2 passed on the real portal (see
"Step 2 result" below), so the script CAN request the data itself. XFlix has NOT yet been installed in the test
sub-account. Next: install it there and run `TEST_PLAN.md`.

---

# XFlix

Netflix-style skin for GoHighLevel courses (ResusX and other Scimple products).

## Step 1: feasibility probe (`probe.js`)

Goal: find out what a script running inside GHL's Client Portal can see, specifically
which products a learner owns, their folders and lectures, thumbnails and completion.

1. Use a GHL **test** sub-account with two sample products, for example `ResusX 2025` and
   `ResusX 2026`, each with a few folders and videos. Enroll a test learner in both.
2. Go to **Sites > Client Portal > Settings > Branding > Advanced > Custom JavaScript**
   and paste the contents of `probe.js`. Save and clear the cache.
3. Log in to the Client Portal as the test learner using a link with `?xflixprobe=1`
   on the end, for example `https://<portal-domain>/?xflixprobe=1`.
4. An orange **XFlix probe** button appears at the bottom left. Browse the courses page,
   open a course, open a folder, open a lesson.
5. Click the button, then **Copy report**, and paste the report back into the chat.

The probe is off for everyone unless the address contains `?xflixprobe=1`. It records key
names, list sizes and page paths only. It does not record values, tokens or cookies, and it
does not send anything anywhere.

When finished, remove the script from the Custom JavaScript box.

## Step 1 result (probe 1, run by Melvin, Oct 26 2026)

The Client Portal loads everything XFlix needs from `services.leadconnectorhq.com/clientportal-middleware`:

| Need | Endpoint (relative) | Seen in report |
|---|---|---|
| Courses the learner owns | `courses/learners/locations/{loc}/courses/library` | list of courses: id, title, posterImage, accessDate, courseStarted, libraryOrder |
| Folders in a course | `.../courses/{id}/modules` | id, title, sequenceNo, visibility, dripDays, lessonsCount |
| Lectures in a folder | `.../courses/{id}/modules/{moduleId}/lessons` | title, description, posterImage, `started`, `asset_urls.meta.durationInSeconds`, `asset_urls.thumbnailUrl` |
| Locked folders | `.../courses/{id}/unlocked-modules` | `categoryUnlockedMap[id].isUnlocked` |
| Completion | `.../courses/{id}/lessons/completed` | `completedLessons` (empty in this capture, item shape unknown) |
| Resume point | `.../courses/{id}/lessons/sequence` | `lastLessonId` |
| Course progress | `memberships/.../products/user-activity/{userId}` | totalPosts, completedPosts, progress |
| Upsell / other courses | `courses/library/upsell`, `courses/library/discover` | endpoints exist, shapes not captured |

Not yet known: whether our own script can call these endpoints, the shape of a completed-lesson item,
whether draft folders are hidden from learners, and the second product's data (the probe hit its
120-call cap). Probe 2 tests the first three. The probe 1 report contains internal IDs and is not
committed to this repo.

## Step 2: replay test (`probe2.js`)

Same setup as step 1, with `?xflixprobe=2` on the portal address.

1. Paste `probe2.js` into Custom JavaScript (replace probe 1 if it is still there). Save, clear cache.
2. Log in as the test learner in a private window with `?xflixprobe=2` on the address.
3. Open the course list, then a course. Open a lecture and **mark it complete**.
4. Click the orange **XFlix probe 2** button, then **Run replay test**, wait for it to finish, then
   **Copy report** and send it back.

It only sends read-only (GET) requests to the portal's own data service, as the logged-in test learner.
The login header stays in memory and is never shown or copied. The report lists header names only.
Remove the script from Custom JavaScript afterwards.

Probe 2 also tallies the `visibility` value of every folder and lecture it sees (`summary.visibilityValues`),
so we can tell whether draft folders are returned to a learner. With Melvin's setup (ResusX:2025 has
11 folders, 3 of them draft) the report should show either 8 published folders (drafts hidden) or 11
with a mix of values (drafts returned, so XFlix must filter them out).

## Step 2 result (probe 2, run by Melvin, Oct 29 2026)

All 17 read-only requests returned 200. Our script can request the learner's data itself, by replaying the headers
the portal already sends (header names seen: authorization, channel, source, version, x-location-id,
x-product-id, x-app-build, x-cp-core-version, x-platform-details, Accept; no cookies needed).

- Library: 2 courses. Folders: 15 returned (13 `published`, 2 `locked`). Lectures: 51 seen, 30 with a video duration.
- Draft folders are NOT returned to learners (ResusX:2025 has 11 in admin, the learner sees 8).
- Completed list items look like `{ id, postId, percentage }`. XFlix reads `postId` (it matches the lecture id). Unknown:
  whether `percentage` can be below 100 for a lecture that was only partly watched. `TEST_PLAN.md` B7b checks this.
- The "mark as finished" button reads "Mark as Complete" and changes to "Completed".
- `courses/library/upsell` and `courses/library/discover` return `{ items: [], total, page, limit }` (empty in the test
  account), so a "Get access" row can be built later, but its item shape is still unknown.
- Report calls took 270 to 1300 ms each.

## Mockup (`mockup/`)

`mockup/` builds an interactive mockup: the real `xflix.js` running against a fake GHL data service with sample ResusX
content. It uses real ResusX thumbnails from the team's skills folder and generated title-card thumbnails and banners.
The built page (`xflix-mockup.html`, about 0.9 MB) is NOT committed because it embeds real faculty thumbnails and this repo
is public. To rebuild: `python3 mockup/make_assets.py <dir>`, `node mockup/make_thumbs.js <dir>`, `python3 mockup/build.py <dir> <out.html>`.

## Changes

- 1.1.1: tiles grow on very wide screens. New test T19 checks 4 desktop and 4 iPad sizes (96 checks).
- 1.1.0: iPhone pass. Tap targets of 44px or more on touch screens, no hover-only effects or arrows on touch, safe-area gutters for the notch and home bar, dynamic viewport heights (Safari's moving address bar), landscape fix, season picker no longer zooms the page, optional `homeScreen` setting for Add to Home Screen. New test T18 (64 checks). Not yet tried on a real iPhone: see TEST_PLAN D3 to D9.
- 1.0.1: first tile in a row no longer jumps left when a row is wider than the screen, and no stray left arrow (new test T17).
