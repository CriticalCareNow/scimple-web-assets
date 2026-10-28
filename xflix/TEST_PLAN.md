# XFlix test plan (test sub-account only)

Run this AFTER `probe2.js` has passed. Use the same test sub-account and learner as the probes
(products `ResusX:2026` and `ResusX:2025`, learner `melvin@simplcme.com`).

Rules: test account only; follow the steps in order; if something does not match "You should see", stop and send a
screenshot of what you see. Do not improvise.

## A. Install (about 10 minutes)

1. Open **Sites > Client Portal > Settings > Branding > Advanced > Custom JavaScript**. It should be empty.
2. Paste the settings block from `config.example.js` (copy it from the repo file, not from an email). Replace the example claim
   links with `https://example.com/claim` if you do not have real ones yet.
3. Paste `loader.js` directly under it. Save. Clear the cache.
4. You should see GHL's "saved" confirmation.

## B. Library page (private window)

Open a private window and go to the portal address. Log in as the learner (the code goes to the learner's email).

| # | Do this | You should see |
|---|---|---|
| B1 | Click **Courses** | A black XFlix page: top bar with XFLIX, Home, Account. A large banner and rows. Not GHL's normal list. |
| B2 | Look at the rows | A "Continue watching" row (if the learner started anything) and a "Your courses" row. |
| B3 | Count the course tiles | One tile for **ResusX** (it says "2 seasons") plus any other course. Not separate 2025 and 2026 tiles. |
| B4 | Click the **ResusX** tile | A course page with a **Season 2026** picker, a progress line like "x of y lectures watched", and one row per folder. |
| B5 | Count the folder rows | Draft folders are NOT shown. Compare with the number the learner saw in probe 2. |
| B6 | Find the locked folder ("Claiming Your CME") | Its lectures are dimmed with a lock and the text "This folder is locked...". They cannot be clicked. |
| B7 | Find the lecture you marked complete in probe 2 | It shows a teal check and the word **Watched**. |
| B8 | Open the season picker and pick **Season 2025** | The folders change to 2025's folders. |
| B9 | Click a lecture that is not locked | GHL's normal lesson page opens and the video plays. |
| B10 | On that lesson, press GHL's mark-complete button, then use the browser Back button to return to the course list | The XFlix page returns and, within about 30 seconds (or after a refresh), that lecture shows **Watched** and the progress line goes up by 1. |
| B11 | Click the **Resume** button on a course banner | It opens the lecture the learner was last on. |
| B12 | If you set up a Claim CME link: find the **Claim CME** button | It opens your link in a new tab. |

## C. Switches and safety

| # | Do this | You should see |
|---|---|---|
| C1 | Add `?xflix=off` to the end of the portal address | GHL's normal course list. |
| C2 | Add `?xflix=on` | XFlix again. |
| C3 | On the Courses page do a hard refresh (Ctrl+Shift+R / Cmd+Shift+R) | XFlix still appears (a short loading screen first is fine). |
| C4 | Log in again from scratch and land on the Courses page directly (type the address) | XFlix appears. If it never appears, write down what you see and send it to me. |
| C5 | Go to the **Account** link in the XFlix top bar | GHL's normal home page, with no XFlix over it. |
| C6 | Empty the Custom JavaScript box, save, clear cache, reload | GHL's normal pages. Then paste XFlix back in. |

## D. Phone

On a phone (or the browser's phone view), open the Courses page.

| # | Do this | You should see |
|---|---|---|
| D1 | Scroll the page | No sideways scrolling of the whole page. Rows scroll sideways by swiping. |
| D2 | Tap a lecture | GHL's lesson page opens. |

## E. Report back

Send me one email with: the result (pass / fail) for each row above, a screenshot of B1, B4 and B6 (and D1 on a phone),
anything that did not match, and the time it took.
