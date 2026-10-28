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
