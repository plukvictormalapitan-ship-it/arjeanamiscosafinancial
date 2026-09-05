# arjeanamiscosafinancial

A two-step lead funnel for **Arjean Amiscosa Financial**:

1. A visitor takes a free 2-minute Financial Roadmap Test.
2. They get an instant Financial Health Report and are invited to book a free, no-obligation call.

Answers and contact details land in Supabase. The site is a plain static front end, so it deploys
to Cloudflare Pages with no build step and no dependencies.

---

## Stack

| Layer | What it is |
| --- | --- |
| Front end | Hand-written HTML, CSS and vanilla JS. No framework, no bundler. |
| Database | Supabase Postgres, reached through the REST (Data API) endpoint with `fetch`. |
| Hosting | Cloudflare Pages, connected straight to this GitHub repo. |

Node.js is not required to run or deploy this. It is only useful if you want a local preview
server (see below).

---

## Files

```
index.html            Landing page + privacy notice markup
assets/styles.css     All styling (design tokens live in :root at the top)
assets/config.js      Your Supabase keys, brand text and booking link  <-- EDIT THIS
assets/quiz.js        The question set                                 <-- EDIT THIS
assets/app.js         Quiz flow, scoring engine, lead form, results screen
supabase/schema.sql   Tables + row level security policies
```

---

## Setup

### 1. Create the database tables

In the Supabase dashboard open **SQL Editor > New query**, paste the whole of
`supabase/schema.sql`, and run it. That creates two tables:

- `leads` - one row per completed test, including the full answer set and the computed score.
- `call_requests` - one row each time someone clicks *Book my free call*.

Both tables have Row Level Security on with an **insert-only** policy for the anonymous role.
The website can add rows but can never read them back. You read your leads in the Supabase
**Table Editor**.

### 2. Point the site at your project

In the Supabase dashboard go to **Project Settings > API** and copy:

- the **Project URL**
- the **anon / publishable** key

Paste both into `assets/config.js`:

```js
supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
supabaseAnonKey: "eyJ...",
```

The anon key is designed to be public and is safe in the browser **because** RLS is enabled.
Never paste the `service_role` key or your database password into this repo.

### 3. Deploy on Cloudflare Pages

Cloudflare dashboard > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**, pick this
repository, then:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | *(leave empty)* |
| Build output directory | `/` |

Every push to `main` redeploys automatically.

### 4. Add your booking link

Put a Calendly / Google Calendar appointment / Zcal URL in `bookingUrl` inside
`assets/config.js`. Leave it empty and the results screen simply tells the visitor that you will
reach out on their preferred channel instead.

---

## Editing the funnel

**Questions.** Everything lives in `assets/quiz.js`. Each entry supports:

- `type: "single"` - one choice, auto-advances
- `type: "multi"` - many choices, needs the Next button
- `type: "currency"` - numeric field with a peso prefix
- `type: "number"` - numeric field with a unit suffix
- `showIf(answers)` - return `true` to show the question, anything else to skip it

Reword questions freely, but keep the `id` values if you want the scoring engine to keep working,
because it reads answers by id.

**Scoring.** `computeResults()` in `assets/app.js` turns the answers into four pillar scores that
add up to 100, plus four recommended coverage amounts. The weightings are plain numbers near the
top of that function, so they are easy to tune.

**Copy and design.** Section text is directly in `index.html`. Colours, spacing and fonts are
CSS custom properties at the top of `assets/styles.css`.

---

## Local preview (optional)

Because the site is static you just need any local file server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

Then open http://localhost:8080. Submissions still go to the live Supabase project, so use an
obviously fake name while testing and delete the row afterwards.

---

## Possible next steps

- **Email the report.** Supabase does not send email on its own. Add a Supabase Edge Function or
  a database webhook on `leads` that calls an email provider. Keep the API key server side.
- **Custom domain.** Add it under the Cloudflare Pages project > Custom domains.
- **Analytics.** Cloudflare Web Analytics needs one script tag and sets no cookies.
- **Spam control.** Turn on Cloudflare Turnstile if the form starts attracting bots.

---

## Privacy and compliance notes

- The form collects a name, email, date of birth and a mobile number. Nothing else is needed, and
  the privacy notice in `index.html` says so explicitly.
- The form never asks for bank, card or government ID numbers. Please keep it that way.
- Consent is a required checkbox and is stored on the row. The insert policy in
  `supabase/schema.sql` actually rejects rows where `consent` is not true.
- The report is clearly labelled an educational estimate, not a quote or financial advice.
