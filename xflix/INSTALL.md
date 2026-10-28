# Installing XFlix in the GHL Client Portal

XFlix replaces the portal's course list with a Netflix-style library. Lectures still open in GHL's own
lesson page, so GHL plays the video and records completion.

**Always install in the TEST sub-account first.** Roll out to the live account only after the test plan
(`TEST_PLAN.md`) passes.

## What gets installed

| Part | Where it lives | Purpose |
|---|---|---|
| `xflix.js` | This public repo, served by jsDelivr at a fixed release | The XFlix program. Contains no secrets. |
| Settings block (`config.example.js`) | GHL Custom JavaScript box | Claim CME links, banner images, saved catalog. Stays in GHL, not in the repo. |
| Loader (`loader.js`) | GHL Custom JavaScript box | Loads the pinned release of `xflix.js`. |
| GHL theme settings (`THEME_SETTINGS.md`) | GHL course Customizer | Colors for the course and lesson pages that GHL draws itself. |

## Install

1. Go to **Sites > Client Portal > Settings > Branding > Advanced > Custom JavaScript** in the test sub-account.
   If the box already has code, keep it and put XFlix after it.
2. Paste your settings block (start from `config.example.js`), then paste `loader.js` directly under it.
   Do not paste either one by copying from an email.
3. **Save**, clear the browser cache, open the portal as a test learner, and go to the **Courses** page.
4. Apply the colors in `THEME_SETTINGS.md` to the course theme and save it as a template named "XFlix".
5. Run `TEST_PLAN.md`.

## Switching off, updating, rolling back

- **Instant off for one browser tab:** add `?xflix=off` to any portal address. `?xflix=on` turns it back on.
- **Off for everyone:** empty the Custom JavaScript box (or delete the loader). GHL's normal pages return immediately.
- **Update:** change the `RELEASE` commit id in the loader to a newer tested one. Never point it at a branch name.
- **Roll back:** put the previous commit id back.

## What happens when something fails

XFlix has three levels and always falls back one step instead of showing a broken page:

1. **Live data:** the learner's own courses, progress and locks from the portal (needs the portal to make at least
   one data request after XFlix loads; normal page loads do).
2. **Saved catalog:** if live data fails and `catalog` is set in your settings, XFlix shows your saved course list
   (no personal progress or locks). Lectures still open in GHL.
3. **GHL's normal pages:** if neither works within a few seconds, XFlix removes itself.

If GHL changes its data service, level 1 may stop working. Learners then see level 2 or 3. To fix it, rerun the probe
(`probe2.js`) and send me the report.

## Saved catalog

Use this once the courses are final, and again whenever you add courses or folders.

1. Open the portal as a test learner with `?xflix=export` on the end of the address and go to **Courses**.
2. Click **Export catalog** (top right), then **Copy**.
3. Paste it into your settings block as `catalog: { ... }` and save.

The catalog lists course, folder and lecture names, IDs and picture links. It has no learner data or login details.

## Settings (all optional)

| Setting | Meaning | Default |
|---|---|---|
| `brandName` | Name in the top bar and banner | `XFlix` |
| `logoUrl` | Logo image instead of the text logo | none |
| `claimCme` | "Claim CME" links by course title and folder title (`*` for the whole course) | none |
| `heroImages` | Banner pictures by title name or course title | course poster |
| `catalog` | Saved catalog (level 2 fallback) | none |
| `homeRoutes` | Portal pages XFlix replaces | `['/courses']` |
| `seasonPattern` | How a course title is split into title and season | `Name:2026`, `Name 2026`, `Name - 2026` |
| `hideStatusPattern` | Folder or lecture status words that hide an item | `draft, hidden, unpublish, private, archiv` |
| `colors` | Override `accent`, `accent2`, `bg`, `surface`, `raised`, `line`, `text`, `muted` | black, orange, teal |
| `fonts` | Load the XFlix fonts from Google Fonts | `true` |
| `waitForAuthMs` | How long to wait for the portal's login before falling back | `8000` |
| `enabled` | Set `false` to switch XFlix off in settings | `true` |

## Naming courses so seasons group

Courses with the same name and different years become seasons of one title. Name them `ResusX:2026`, `ResusX:2025`
(or `ResusX 2026`). A course with no year is shown as its own title.

## What XFlix does and does not do

- Read-only: it only requests data. It never changes anything in GHL.
- It does not play video or record completion. GHL does both.
- It does not track CME credit. Learners use your "Claim CME" links at the end of a folder.
- The learner's login details stay in the browser's memory and are never shown or stored.

## Not yet confirmed

These depend on the real portal and are checked by `probe2.js` and `TEST_PLAN.md`:

- That the script can request course data itself (probe 2).
- The exact shape of the "completed lectures" list. XFlix accepts a list of IDs or a list of objects with
  `lessonId`, `postId` or `id`.
- Whether draft folders are hidden from learners already (XFlix hides them anyway).
- Whether the portal allows loading the script from jsDelivr and styles added by script. If not, paste `xflix.js`
  itself into the Custom JavaScript box instead of the loader.
- How the course and lesson pages look once the theme settings are applied. Those pages are drawn by GHL.
