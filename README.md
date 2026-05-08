# AI Death

A satirical web app that rates a company description on its likelihood of being replaced by a Claude Skill (a `.md` file).

**No URL required.** Type a sentence about what your company / product / idea does, and the court delivers a verdict. Pre-launch founders, idea-stage builders, hackathon teams, and side-project devs welcome.

## Tier ladder

| Tier | Score | Vibe |
|---|---|---|
| `IMMORTAL` | 0–19 | Compliance, hardware, real-world ops. The court grants stay of execution. |
| `FORTRESS` | 20–39 | Network effects, marketplaces, deep integrations. |
| `SWEATING` | 40–59 | Solid product, but the LLM is closing in. |
| `THIN ICE` | 60–79 | Mostly a UI on top of GPT/Claude with a logo. |
| `DEAD` | 80–100 | Could be a one-page markdown skill. Funeral arrangements. |

## Optional context

Below the description, three pill rows sharpen the verdict:

- **STAGE** — Idea / Pre-launch / Has users / Paying customers / Enterprise contracts
- **BUYER** — Consumer / SMB / Mid-market / Enterprise / Regulated
- **SURFACE** — Pure software / Hardware / Physical ops / Compliance gates

All optional. The description alone delivers a full verdict; pills can swing the score by up to ~42 points either direction and pull tier-aware roast notes.

## Run it locally

It's static HTML/CSS/JS. No build step.

```sh
# any static server works
python3 -m http.server 5173
# or
npx serve .
```

Then open http://localhost:5173.

## Deploy

Drop the folder on any static host:

- **Netlify / Vercel / Cloudflare Pages** — drag the folder into the dashboard.
- **GitHub Pages** — settings → Pages → deploy from `main` / `/`.
- **Anywhere with a `python3 -m http.server`** — same as local.

No environment variables. No keys.

## How the scorer works

Pure client-side, deterministic. No API calls.

1. Start at 50.
2. Decrement for "moat" keywords (`hipaa`, `hardware`, `marketplace`, `payments`, `compliance`, …).
3. Increment for "wrapper" keywords (`summariz`, `chatbot`, `wrapper`, `cold email`, `template`, …).
4. Apply optional context shifts from Stage / Buyer / Surface pills.
5. Length signals: very short = vague (penalty); very long = specific (small mercy).
6. Add deterministic noise from a hash of the input so identical inputs are stable but the spread feels lively.
7. Clamp 0–100, map to tier.

Weights and lexicons live at the top of [app.js](app.js) — `MOATS`, `REPLACEABLE`, `TIERS`, `TAGGED_ROASTS`, `CONTEXT_SHIFTS`, `CONTEXT_ROASTS`, and the per-tag verb map inside `buildSkill`.

## Files

- `index.html` — markup + verdict-card template
- `styles.css` — design tokens, tier color swaps, motion, court art
- `app.js` — scorer, roast bank, context shifts, render
- `DESIGN.md` — design system source of truth (brand voice, color, type, component inventory)

## What this is NOT

- Not a real evaluation tool. Don't make decisions based on the verdict.
- Not a lead-gen page. No email capture, no waitlist, no analytics.
- Not advice. Probably not even useful. Definitely funny if your description is bad.
