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
