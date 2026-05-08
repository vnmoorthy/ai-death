# DESIGN.md — Just Describe

The design source of truth for **Just Describe** (working title), a satirical web app that rates a company description on its likelihood of being replaced by a Claude Skill (a `.md` file). No URL needed — just describe what you do.

## Brand voice

- Irreverent, dark, knowing. Laughs *with* builders, not at them.
- Headline-style copy. No paragraphs. Verb-led sentences.
- Occasional all-caps for tier reveals.
- Never cruel. The user is in on the joke.

Voice samples:
- "Describe what you do. We'll roast its lifespan."
- "Imagine paying for that."
- "47 lines of markdown. That's the whole product."
- "Verdict: SWEATING."

Avoid: corporate optimism, "delight," "seamless," exclamation marks (one max per page).

## Visual direction

A monochrome funeral parlor with one very loud accent. The page feels like a courtroom transcript that's about to deliver a sentence.

- **Background:** near-black (`#0B0B0E`), with a faint paper-grain noise overlay so it doesn't feel sterile.
- **Foreground type:** off-white (`#F4F1EA`) — bone, not paper.
- **Accent:** a single hot red (`#FF2E2E`) used only for the verdict tier and the submit button. The accent must always feel scarce.
- **Mute:** `#7A7A82` for secondary copy.
- **Tier-specific colors** (used on the verdict card only — never elsewhere):
  - IMMORTAL — `#5BE49B` (cold green)
  - FORTRESS — `#A8E063` (lime)
  - SWEATING — `#F2B33E` (amber)
  - THIN ICE — `#FF7A45` (orange)
  - DEAD — `#FF2E2E` (the red)

## Typography

- **Display / verdict:** a heavy condensed serif or grotesque. Use **"Boldonse"** if available via Google Fonts; fallback to `Times New Roman, ui-serif, serif`. Used at 96–160px for the tier word.
- **Body & UI:** **"JetBrains Mono"** or system mono. The whole site reads like a courtroom printout.
- **Numbers (the score):** the same display face, slab-tabular if possible.

Type rules:
- Body 16px / 1.55 line height.
- Headlines 32–48px on desktop, 24–32px on mobile.
- Letter-spacing: -0.02em on display, 0.02em on uppercase labels.

## Layout

A single-screen experience on desktop. Three zones, vertically stacked on mobile:

1. **Header** — small wordmark "JUST DESCRIBE" in mono, flush left. Right side: a tiny version + meta strip (small, 11px, muted).
2. **Hero / Input** — center-stage. Big prompt: "Describe what your company does." A multi-line textarea (3 visible rows, expands). Below it: a single red **DELIVER VERDICT** button.
3. **Verdict card** — appears in place of the input after submission, slides up. The card is the screenshot-ready artifact.

Spacing: 8-pt grid. Generous vertical air on desktop (96px between zones); tighter on mobile (40px).

## The verdict card

This is the product. Optimize this above all else.

Layout (1080×1350 share-aspect on desktop, full-bleed on mobile):

```
┌──────────────────────────────────────────────┐
│  CASE FILE #00374                              │  ← mono, muted
│                                                │
│  THE DECEASED                                  │  ← uppercase label
│  "AI-powered note-taking app for              │  ← user's input, quoted
│   marketing teams that summarizes             │
│   meetings and posts to Slack."               │
│                                                │
│  ─────────────────────────────────             │
│                                                │
│            VERDICT                             │  ← tiny label
│                                                │
│            DEAD                                │  ← 144px display, tier color
│            ────                                │
│                                                │
│            87 / 100                            │  ← score
│            DEATH PROBABILITY                   │  ← muted label
│                                                │
│  ─────────────────────────────────             │
│                                                │
│  COURT'S NOTES                                 │
│  • This is a 47-line markdown file with       │  ← punchy roast bullets
│    "you are a meeting summarizer" at the top.│
│  • Slack already ships this in their AI tab.  │
│  • The marketing team will switch the moment │
│    it's free.                                  │
│                                                │
│  REPLACEMENT SKILL                             │  ← mono code-block
│  ┌──────────────────────────────────┐         │
│  │ ---                               │         │
│  │ name: meeting-summarizer          │         │
│  │ description: Summarize meetings   │         │
│  │ ---                               │         │
│  │ Read transcript. Bullet 5 points. │         │
│  └──────────────────────────────────┘         │
│                                                │
│  justdescribe.app                              │  ← footer wordmark
└──────────────────────────────────────────────┘
```

Card visual rules:
- Black background, off-white type, tier color used **only** on the verdict word and a 4px top accent stripe.
- One thin horizontal divider between sections (1px, `#2A2A30`).
- Generous internal padding (40px desktop / 24px mobile).
- Subtle border (1px solid `#1F1F25`) so it reads as a card on the page even when the page is also dark.

## Tier ladder

Five tiers, progressing from "you're fine" to "you're a markdown file":

| Tier      | Score range | Color       | Vibe                                                         |
|-----------|-------------|-------------|--------------------------------------------------------------|
| IMMORTAL  | 0–19        | cold green  | Compliance, hardware, regulated industries, real-world ops.  |
| FORTRESS  | 20–39       | lime        | Network effects, large data moats, deep integrations.        |
| SWEATING  | 40–59       | amber       | Solid product, but the LLM is closing in.                    |
| THIN ICE  | 60–79       | orange      | Mostly a UI on top of GPT/Claude with a logo.                |
| DEAD      | 80–100      | red         | Could be a one-page markdown skill. Funeral arrangements.    |

## Heuristic scorer (v1)

The submit handler runs a deterministic JS scorer. No API. Algorithm:

- Start at 50.
- **Decrease (more survivable)** for keywords suggesting moats: `compliance`, `hipaa`, `soc 2`, `enterprise`, `hardware`, `device`, `physical`, `network`, `marketplace`, `users`, `community`, `payments`, `bank`, `insurance`, `regulated`, `audit`, `data warehouse`, `pipeline`, `integration`, `database`, `infrastructure`, `realtime`, `embedded`.
- **Increase (more replaceable)** for keywords suggesting LLM-replaceability: `summarize`, `write`, `draft`, `email`, `chatbot`, `ai-powered`, `gpt`, `llm`, `prompt`, `generate`, `rewrite`, `assistant`, `wrapper`, `copy`, `notes`, `notes app`, `extract`, `classify`, `analyze text`, `simple`, `template`, `boilerplate`.
- Length penalty: very short descriptions (<40 chars) bump the score (vague things look like wrappers). Very long descriptions slightly reduce it (specificity earns mercy).
- Add small deterministic noise based on a hash of the input so identical inputs are stable but the spread feels lively.
- Clamp 0–100, map to tier.

Roast bullets and the mock skill are template-driven, with phrases keyed to which keywords matched. (See `app.js` `ROASTS` and `SKILL_TEMPLATES`.)

## Component inventory (v1)

- `<Header>` — wordmark + credit link.
- `<DescribeForm>` — textarea, character counter (gentle, not strict), submit button.
- `<VerdictCard>` — the artifact. Receives a `Verdict` object.
- `<RetryBar>` — appears under the card: "Describe another →" resets the form.
- `<Footer>` — credit + GitHub link placeholder.

## States to design for

- **Empty** (initial load, hero copy + form).
- **Typing** (button enabled when ≥10 chars, disabled otherwise; subtle helper "say a sentence or two").
- **Verdict revealed** (card slides up, form fades).
- **Edge: very short input** (<10 chars) — friendly nag, not an error.
- **Edge: emoji-only / gibberish** — scorer still produces a verdict, often DEAD with a "I don't know what this is, which is also a bad sign" roast.
- **Edge: extremely long input** (>1500 chars) — accepted, scorer truncates to first 1000 chars.

## Motion

- Submit → form fades out (150ms), card fades + translates 16px up (250ms cubic-bezier .2,.8,.2,1).
- Tier word animates in last with a 1px → 0 letter-spacing settle (200ms, eased).
- Hover on submit button: 1px outline glow in tier-red. No scale, no bounce.

Motion rules:
- No looping animations. The page stops moving once the verdict lands.
- Respect `prefers-reduced-motion`: instant transitions.

## Accessibility

- WCAG AA contrast on all text against the near-black background (verified: off-white on `#0B0B0E` ≈ 16:1).
- Tier colors are accent-only and never the sole carrier of meaning — the tier *word* always names the tier.
- Form is keyboard-navigable; submit on Cmd/Ctrl+Enter.
- `aria-live="polite"` region announces the verdict when revealed.
- Reduced-motion users get instant transitions.

## What this is NOT

- Not a serious tool. Don't add disclaimers about "this is just for fun" — the tone makes that obvious.
- Not a lead-gen page. No email capture, no waitlist.
- Not a configurator. One input, one button, one verdict.
- Not a derivative product. Original concept, original visuals, original voice.
