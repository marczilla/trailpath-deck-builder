# TrailPath Coaching Deck Builder — Deploy Guide

This folder is a complete, team-ready version of the deck builder. Unlike the
single-file version, the AI rewrite runs through a **secure server function**,
so the Anthropic API key lives on the server and your team never sees or pastes it.

```
coaching-deck-builder-netlify/
├── index.html                  ← the tool
├── netlify.toml                ← Netlify config
├── DEPLOY.md                   ← this guide
└── netlify/functions/rewrite.js ← secure Claude proxy (holds the key)
```

Everything except the AI rewrite (preview, .pptx export, PDF, .pptx import,
content editing) works with no setup at all. The AI button needs the one-time
key setup below.

---

## What you need first

1. **A Netlify account** — free tier is fine. https://www.netlify.com
2. **An Anthropic API key** — from https://console.anthropic.com → *API Keys* →
   *Create Key*. Copy it (starts with `sk-ant-...`). Treat it like a password.

---

## Option A — Deploy from GitHub (recommended, gives auto-updates)

1. Create a new GitHub repo and upload the **contents of this folder** to it
   (so `index.html` is at the repo root, with the `netlify/` folder beside it).
2. In Netlify: **Add new site → Import an existing project → GitHub**, and pick
   the repo.
3. Build settings: leave the build command **blank**, set **Publish directory**
   to `.` (a single dot). Click **Deploy**.
4. Add the key: **Site configuration → Environment variables → Add a variable**
   - Key: `ANTHROPIC_API_KEY`
   - Value: your `sk-ant-...` key
5. **Deploys → Trigger deploy → Deploy site** so the function picks up the key.
6. Open your new URL (e.g. `your-site.netlify.app`). Done.

Any future edit you push to GitHub redeploys automatically.

## Option B — Deploy with the Netlify CLI (fastest one-off)

```bash
npm install -g netlify-cli
cd coaching-deck-builder-netlify
netlify deploy            # follow prompts; choose this folder as publish dir
netlify env:set ANTHROPIC_API_KEY sk-ant-your-key-here
netlify deploy --prod     # publish for real
```

> Note: plain **drag-and-drop** onto Netlify Drop publishes the site but will
> **not** run the function. Use Option A or B so the AI rewrite works.

---

## Using it

1. Fill in the client / industry / project / supervisor fields.
2. Toggle the modules you want; optionally upload Ben's existing `.pptx` to pull
   his slides into the template.
3. Click **✨ Rewrite examples for this client** to have Claude localize every
   scenario, or skip it and just edit text directly.
4. **Download PowerPoint** or **Print / Save PDF**.

---

## Costs & security notes

- The function calls Claude only when someone clicks **Rewrite** — typically a
  fraction of a cent per deck. There is no cost for previewing or exporting.
- The key is stored only in Netlify's encrypted environment variables and is
  never sent to the browser. Rotate it anytime in the Anthropic console.
- To change the model, edit `DEFAULT_MODEL` at the top of
  `netlify/functions/rewrite.js`, or the browser can pass one (it sends the
  value from the tool). Default: `claude-sonnet-4-6`.

---

## Local testing (optional)

```bash
npm install -g netlify-cli
cd coaching-deck-builder-netlify
netlify env:set ANTHROPIC_API_KEY sk-ant-your-key-here
netlify dev               # serves the site + function at http://localhost:8888
```
