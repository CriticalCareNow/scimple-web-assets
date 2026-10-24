# XFlix test: can a script read course data in the GHL Client Portal?

**Time:** about 45 to 60 minutes
**You need:** admin access to our GoHighLevel **test** sub-account, and the file `probe.js` (attached)
**Do this in the TEST sub-account only. Do not use a live account or real learners.**

## Why we are doing this

We are building "XFlix", a Netflix-style look for our courses (ResusX and others), using GHL's Client
Portal. The design works only if a small script running inside the portal can see which courses a
learner owns, the folders and lectures inside each, their thumbnails and whether each is completed.

We have not been able to confirm that yet. This test finds out. `probe.js` is a small script that
**only records the structure of the data** (field names and list sizes). It does not record names,
emails, passwords or tokens, and it does not send anything anywhere. It stays off for everyone unless
the web address ends in `?xflixprobe=1`.

## What we need back

1. The report the probe produces (a block of text).
2. Four screenshots: the course list, a course page, a folder, a lesson.
3. Notes on anything that surprised you (see Part F).

---

## Part A: Make sample courses (skip anything that already exists)

We want to copy the real situation: one learner who owns two yearly versions of the same course.

1. In the test sub-account, go to **Memberships > Courses** (menu names can vary slightly).
2. Create a product named **ResusX 2026** with:
   - at least **two folders** (called categories in GHL), for example "Day 1 Airway" and "Day 2 Shock"
   - at least **two lectures** in each folder (a short video is ideal; a text lesson is fine)
   - a **thumbnail image** on the product and, if GHL allows, on each lecture
3. Create a second product named **ResusX 2025** the same way (it can be smaller: two folders, one
   lecture each is enough).
4. Create a **test learner** (a contact with an email you can read, for example
   `yourname+xflixtest@yourdomain.com`) and give that contact access to **both** products. The usual
   route is an offer that includes both products. GHL's help article "Create Product and Attach it to
   Membership Course Offer" shows the steps.

## Part B: Add the probe to the Client Portal

1. Go to **Sites > Client Portal > Settings** (some accounts show it under Memberships > Client
   Portal > Settings).
2. Open the **Branding** section and scroll to **Advanced**. Find the **Custom JavaScript** box.
3. **If the box already has code in it, do not delete it.** Copy it into a text file called
   `original-custom-js.txt` first, so we can put it back later. Tell us what was in it.
4. Open `probe.js`, copy all of it, and paste it into the box (after any existing code).
5. Click **Save**. Then clear your browser cache.

## Part C: Run the test as the learner

1. Open a **private/incognito window** so you are not logged in as an admin.
2. Go to the client portal address (it is shown in the Client Portal settings, under the domain
   section) and **add `?xflixprobe=1` to the end**. Example: `https://portal.example.com/?xflixprobe=1`
3. Log in as the **test learner** (the portal sends a code or magic link to the test email).
4. An orange button labelled **XFlix probe** appears at the bottom left. If you do not see it, go to
   Troubleshooting below.
5. Click through the portal like a learner, **without refreshing the page** (a refresh clears what the
   probe has collected). In this order:
   1. the page that lists the courses
   2. open **ResusX 2026**
   3. open each **folder**
   4. open a **lecture**, let the video play for 10 seconds, then mark it complete
   5. go back to the course list and open **ResusX 2025**, then one folder in it
6. Click the **XFlix probe** button. The panel shows a report. Click **Copy report** and paste it into
   a text file named `xflix-report.txt`.
7. Take the four screenshots (course list, course page, folder, lecture).

If the page ever reloads fully, click **Copy report** first. Then repeat the steps you want to
record.

## Part D: Clean up (important)

1. Go back to **Client Portal > Settings > Branding > Advanced > Custom JavaScript**.
2. Delete the probe code. If there was code there before, put it back exactly as it was.
3. **Save**, clear the cache, and check that the orange button no longer appears.

## Part E: Troubleshooting

- **No orange button:** check the address really ends in `?xflixprobe=1`, check the script was
  saved, clear the cache, and try a new private window. If it still does not appear, press F12, open
  the **Console** tab, take a screenshot of any red errors, and send it to us.
- **The report says 0 relevant API responses:** do not worry. Send it anyway. That is useful to us.
- **You cannot find a menu:** GHL moves things around. Send us a screenshot of what you see.

## Part F: Send back

Reply with these in one email:

- `xflix-report.txt`
- the four screenshots
- what was in the Custom JavaScript box before (or "it was empty")
- the portal address you used, with the domain only (no password or login link)
- anything that behaved oddly, or took longer than expected

## Safety notes

- The report contains page paths and field names only. Even so, send it only to us, and do not post
  it publicly.
- Never put passwords or login links in an email.
- If anything looks like it could affect live learners, stop and message us before continuing.
