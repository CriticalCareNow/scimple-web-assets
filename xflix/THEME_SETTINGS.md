# GHL course theme settings for XFlix

XFlix replaces the **course list** page. GHL still draws the **course page** and the **lesson page**
(video, mark-complete, comments), so those use GHL's own theme settings. Enter these values so they match XFlix.

Where: open a course > **Customize** in the Course Outline > **Browse System Templates** > **Neo Classic** >
adjust the settings below > **Save as Template** named **XFlix** > apply it to every course.

The setting names below come from the theme data the portal returned in the first test. GHL's labels in the
Customizer may differ slightly. If a setting is not in your Customizer, skip it.

## Colors and fonts used everywhere

| Name | Value |
|---|---|
| Background (black) | `#0B0B0D` |
| Panel / general background | `#141418` |
| Raised panel / hover | `#1E1E24` |
| Border | `#2A2A31` |
| Primary accent (orange) | `#FF7A1A` |
| Orange hover | `#FF9447` |
| Secondary accent (teal) | `#18C5BB` |
| Text | `#F5F1EA` |
| Soft text | `#DDD8D0` |
| Muted text | `#9A968F` |
| Button text on orange | `#1A0900` |
| Button text on teal | `#03201E` |
| Primary font | Big Shoulders Display, weight 800 (if not offered, use Oswald or Bebas Neue) |
| Secondary font | Instrument Sans, weight 400 (if not offered, use Inter) |

## Course page

| Setting | Value |
|---|---|
| Base color: text / background | text, then black |
| Accent: primary / secondary / hover / general background | orange / teal / orange hover / panel |
| Header: background / icon | black / text |
| Search: background / border / icon / placeholder color | panel / border / muted / muted |
| Hero: show, type | on, image (use the wide banner for the course) |
| Hero overlay: color / opacity | black / 60% |
| Hero title / description color | text / soft text |
| Hero button: fill / border / text | orange / orange / button text on orange |
| Hero button hover: fill / border / text | orange hover / orange hover / button text on orange |
| Folder list: background / hover / border | panel / raised / border |
| Folder title / lecture title / lecture description color | text / text / muted |
| Sub-folder title / background | text / raised |
| Progress block: background / bar / text | panel / orange / text |
| Instructor block: background / heading / name / title / bio | panel / orange / text / muted / soft text |

## Lesson page

| Setting | Value |
|---|---|
| Layout and header | same as the course page |
| Breadcrumb: color / active color | muted / text |
| Video player background | `#000000` |
| Lesson page background / title color | black / text |
| Next-lesson card: background / border / next title / text / button | panel / border / orange / soft text / orange |
| "Complete" button (lesson finished): fill / border / text / hover fill | teal / teal / button text on teal / `#3DD9D0` |
| "Incomplete" button (mark as complete): fill / border / text / hover fill | orange / orange / button text on orange / orange hover |
| Comments: background / heading / placeholder / input / comment bg / text / username / secondary / accent | black / text / muted / panel / panel / soft text / text / muted / orange |
| Comment buttons: Cancel (ghost: border + text) / Comment (orange fill) | border and text colors / orange |
| Course content sidebar: background / item hover / item text / border / heading / number | panel / raised / text / border / text / orange |
| Next / Previous buttons | Next: orange fill. Previous: ghost (border color, text color) |
| Downloads block: background / heading / link | panel / text / teal |

## Per-course images

For each course set a wide **hero image** (about 1920 by 800) and a **poster image** (16:9, for example 1280 by 720).
XFlix uses the poster for tiles and the hero image for the banner (or the poster if no banner is set).
