(() => {
  "use strict";

  const MIN_LEN = 10;
  const MAX_LEN = 1500;

  // ---------- Scoring lexicons ----------

  // Each entry: [keyword/regex, weight]. Negative weights = more survivable.
  // Positive weights = more replaceable (closer to a markdown file).
  const MOATS = [
    [/\bcompliance\b/, -10],
    [/\bhipaa\b/, -12],
    [/\bsoc\s*2\b/, -10],
    [/\bgdpr\b/, -8],
    [/\bregulated?\b/, -10],
    [/\baudit(or)?s?\b/, -8],
    [/\benterprise\b/, -6],
    [/\bhardware\b/, -14],
    [/\bdevice(s)?\b/, -10],
    [/\bphysical\b/, -10],
    [/\bsensors?\b/, -10],
    [/\brobot(ic|s)?\b/, -12],
    [/\bnetwork(s|ed|ing)?\b/, -7],
    [/\bmarketplace(s)?\b/, -9],
    [/\bcommunity\b/, -7],
    [/\bsocial\s+graph\b/, -10],
    [/\bpayments?\b/, -10],
    [/\bbank(ing)?\b/, -12],
    [/\binsurance\b/, -12],
    [/\bdata\s+warehouse\b/, -10],
    [/\bpipeline(s)?\b/, -7],
    [/\bintegration(s)?\b/, -6],
    [/\bdatabase(s)?\b/, -6],
    [/\binfrastructure\b/, -8],
    [/\brealtime|real-time\b/, -7],
    [/\bembedded\b/, -10],
    [/\blogistics\b/, -10],
    [/\bsupply\s+chain\b/, -10],
    [/\bmanufactur(e|ing)\b/, -12],
    [/\bhospital(s)?\b/, -12],
    [/\bclinical\b/, -10],
    [/\blab(oratory|s)?\b/, -8],
    [/\bgovernment\b/, -10],
    [/\blegal\b/, -6],
    [/\bcourt(s|room)?\b/, -8],
    [/\bdefen[cs]e\b/, -10],
    [/\bblockchain\b/, -4],
    [/\bgpu(s)?\b/, -8],
    [/\bdata\s+center\b/, -10],
    [/\binventory\b/, -7],
    [/\bdriver(s)?\b/, -7],
    [/\bphysical\s+store\b/, -10],
  ];

  const REPLACEABLE = [
    [/\bsummariz(e|er|ation)\b/, +14],
    [/\brewrit(e|ing|er)\b/, +12],
    [/\bproofread(er|ing)?\b/, +12],
    [/\bemail\s+(writer|generator|drafter)\b/, +14],
    [/\bdraft(s|ing|er)?\b/, +8],
    [/\bgenerator\b/, +10],
    [/\bchatbot\b/, +14],
    [/\bai[\s-]?powered\b/, +10],
    [/\bgpt\b/, +10],
    [/\bllm\b/, +10],
    [/\bclaude\b/, +10],
    [/\bprompt(s|ing)?\b/, +9],
    [/\bwrapper\b/, +18],
    [/\bnotes?\s+app\b/, +12],
    [/\bnote[\s-]?taking\b/, +12],
    [/\bsimple\b/, +5],
    [/\btemplate(s|d)?\b/, +6],
    [/\bboilerplate\b/, +8],
    [/\bextract(s|ing|or)?\b/, +6],
    [/\bclassif(y|ier|ication)\b/, +6],
    [/\banalyze\s+text\b/, +9],
    [/\bcopy\s*writ(ing|er)\b/, +12],
    [/\bblog\s+post(s)?\b/, +9],
    [/\bsocial\s+media\s+post(s)?\b/, +10],
    [/\bcaption(s|ing)?\b/, +9],
    [/\bsubject\s+line(s)?\b/, +10],
    [/\btweet(s|ing)?\b/, +8],
    [/\blinkedin\s+post(s)?\b/, +12],
    [/\bcold\s+email(s|ing)?\b/, +12],
    [/\bsales\s+(copy|email|outreach)\b/, +10],
    [/\bresume\s+(builder|writer)\b/, +14],
    [/\bcover\s+letter(s)?\b/, +12],
    [/\bmeeting\s+(notes|summar(y|ies))\b/, +13],
    [/\btranscri(b|pt)\w*\b/, +6],
    [/\bagent\b/, +6],
    [/\bassistant\b/, +6],
    [/\bautomate\s+\w+\s+with\s+ai\b/, +8],
    [/\bchat\s+with\s+(your\s+)?(docs|pdf|files)\b/, +14],
    [/\bdocument\s+chat\b/, +12],
    [/\bcontent\s+marketing\b/, +6],
  ];

  // Tier ladder — order matters (high to low).
  const TIERS = [
    { name: "DEAD",      cls: "dead",     min: 80, max: 100 },
    { name: "THIN ICE",  cls: "thin",     min: 60, max: 79  },
    { name: "SWEATING",  cls: "sweating", min: 40, max: 59  },
    { name: "FORTRESS",  cls: "fortress", min: 20, max: 39  },
    { name: "IMMORTAL",  cls: "immortal", min: 0,  max: 19  },
  ];

  // Optional context (pill selectors). Each null/missing key = unspecified (no shift).
  const CONTEXT_SHIFTS = {
    stage: {
      idea:       +10,
      prelaunch:  +6,
      users:      -4,
      paying:     -10,
      contracts:  -16,
    },
    buyer: {
      consumer:   +4,
      smb:         0,
      midmarket:  -4,
      enterprise: -10,
      regulated:  -14,
    },
    surface: {
      software:   +3,
      hardware:   -12,
      physical:   -10,
      compliance: -12,
    },
  };

  // Roasts keyed to selected context values. Added to the candidate pool so
  // notes can reference the chosen stage/buyer/surface where it sharpens the bit.
  const CONTEXT_ROASTS = {
    stage: {
      idea: [
        "An idea this thin can be replaced before you finish the deck.",
        "The skill takes 20 minutes. The pitch deck takes 20 days.",
        "Idea-stage means no contracts, no usage, no excuse.",
      ],
      prelaunch: [
        "No users yet. The wrapper is the entire surface.",
        "Pre-launch is the most replaceable a company ever is.",
      ],
      users: [
        "Users are not customers. The court is unmoved.",
        "Adoption without revenue is hobbyism with extra steps.",
      ],
      paying: [
        "Paying customers raise the bar. The court notes it.",
        "Money on the table is not the same as money locked in.",
      ],
      contracts: [
        "Enterprise contracts are doing the work. The product is decoration.",
        "The procurement cycle is the moat. Markdown does not survive an MSA.",
      ],
    },
    buyer: {
      consumer: [
        "Consumers switch when they're bored. The wrapper has nothing holding them.",
        "Free swap, free try, free leave. That's a consumer.",
      ],
      smb: [
        "SMB churn is high. The moat is whoever can send invoices on time.",
      ],
      midmarket: [
        "Mid-market wants 'a vendor we can call.' That helps you, briefly.",
      ],
      enterprise: [
        "Enterprise procurement is a moat. Slow buyers are sticky buyers.",
        "The legal review took six months. They are not switching.",
      ],
      regulated: [
        "Regulators don't approve markdown files. The court is impressed.",
        "The buyer needs an audit trail. The model cannot sign one.",
      ],
    },
    surface: {
      software: [
        "Bits are fungible. The wrapper has nothing physical to hide behind.",
      ],
      hardware: [
        "Atoms beat bits. The model cannot ship UPS.",
        "There is a thing on a desk. Markdown does not put a thing on a desk.",
      ],
      physical: [
        "The product touches the real world. Markdown does not.",
        "Drivers, warehouses, hands on inventory. The LLM is not yet ambulatory.",
      ],
      compliance: [
        "Compliance is the moat. The auditors keep you employed.",
        "There is a person who can be sued. The model cannot be sued.",
      ],
    },
  };

  // ---------- Roast bank ----------
  // Each roast is a function of the matched keyword tags. We pick 3, prefer
  // tag-keyed ones, fall back to tier-keyed generic ones.

  const TAGGED_ROASTS = {
    summariz: [
      "This is one prompt. \"You are a summarizer. Output 5 bullets.\" That's it.",
      "Slack already ships summaries in their AI tab. So does Notion. So does email.",
      "The product has the same expected output as 'pasting the transcript into a chat box.'",
    ],
    chatbot: [
      "A chatbot is a system prompt with marketing.",
      "You are competing against the same model with no logo.",
      "The first time the customer hits the API directly, you stop being needed.",
    ],
    wrapper: [
      "You said the quiet part out loud.",
      "If 'wrapper' is in the description, the verdict has been reached.",
      "We accept your guilty plea.",
    ],
    "notes app": [
      "There are 400 of these. Most are also dead.",
      "The user already has Apple Notes, which is free, fast, and on every device.",
      "The 'AI summary' button is one prompt away from being a browser extension.",
    ],
    "note-taking": [
      "Apple Notes is free and pre-installed. We rest our case.",
      "The summarization layer is one Claude Skill thick.",
    ],
    email: [
      "Gmail's Smart Compose was the warning shot. You missed it.",
      "Email writers are the canonical wrapper. The market is a graveyard.",
    ],
    resume: [
      "ChatGPT does this for free in one message.",
      "The 'AI rewrites your resume' niche is the most competitive empty room in tech.",
    ],
    "cover letter": [
      "Single prompt. Free. Better. Sorry.",
    ],
    "blog post": [
      "Content farms are now agents. Your tool was a stopover.",
    ],
    "social media": [
      "Buffer ships this. So does the platform itself.",
    ],
    "cold email": [
      "Half the market is selling this. The other half is being annoyed by it.",
    ],
    template: [
      "If your moat is templates, the LLM has them too.",
      "Templates are training data wearing a logo.",
    ],
    classify: [
      "Classification is one of the cheapest LLM tasks. The price floor is going to zero.",
    ],
    "chat with": [
      "Retrieval-augmented question answering is now a built-in feature of every chat app.",
      "ChatGPT's file upload covers 80% of this for free.",
    ],
    compliance: [
      "Compliance is a moat AI hasn't crossed. Your auditors will keep you employed.",
      "Forms, signatures, and people who can be sued. The LLM cannot replace the liability surface.",
    ],
    hipaa: [
      "HIPAA is your bodyguard. The LLM is wearing handcuffs.",
    ],
    "soc 2": [
      "SOC 2 buys you years. Use them.",
    ],
    enterprise: [
      "Enterprise procurement loves a vendor with a logo, a contract, and a phone number.",
      "The buyer doesn't want an LLM. The buyer wants someone to fire when it breaks.",
    ],
    hardware: [
      "Atoms beat bits. Hardware is genuinely hard to replace with markdown.",
    ],
    payments: [
      "Money rails are not yet vibes-based. You are safe.",
    ],
    bank: [
      "Banks have charters. Charters have moats. The court will not be probated today.",
    ],
    insurance: [
      "Actuarial tables, regulators, and reserves. The model can advise, but it cannot underwrite.",
    ],
    marketplace: [
      "Marketplaces compound. The LLM does not have your supply side.",
    ],
    network: [
      "Network effects are the original moat. Your users built it; an LLM can't.",
    ],
    integration: [
      "Integrations are durable when they're load-bearing. You may have a real one.",
    ],
    physical: [
      "If it has to leave the data center, the markdown file can't deliver.",
    ],
    legal: [
      "Lawyers are paid to be wrong on the record. The LLM is not yet credentialed for that.",
    ],
    logistics: [
      "Trucks, drivers, warehouses. The LLM cannot drive a forklift.",
    ],
    hospital: [
      "Liability, scheduling, and human bodies. The court grants stay of execution.",
    ],
  };

  const GENERIC_DEAD = [
    "This is a 47-line markdown file with the system prompt at the top.",
    "Pricing page: how much money do you have. The product: a system prompt.",
    "The marketing copy describes a feature, not a company.",
    "Anyone with a Claude Pro subscription can replicate the entire output.",
    "The first agent that ships natively eats this for breakfast.",
  ];

  const GENERIC_THIN = [
    "There's a real product here, but the moat is one model release thick.",
    "The wrapper is doing more work than the substrate, which is fine until it isn't.",
    "Half the value is glue, half is glue you didn't write. Read the room.",
    "Defensibility is a feature; we don't see one yet.",
  ];

  const GENERIC_SWEATING = [
    "There's a business here. Whether it's a 50M one or a 500M one depends on choices you have not yet made.",
    "Solid surface area, but the LLM is closing the gap one ship at a time.",
    "We see real users. We also see why a Claude Skill could ship a 'good enough' replacement in a weekend.",
  ];

  const GENERIC_FORTRESS = [
    "Real moat. Real users. Real pain. The LLM is a tool you'd add, not a threat to your existence.",
    "An incumbent could try to rebuild this with AI and still lose to your distribution.",
  ];

  const GENERIC_IMMORTAL = [
    "The court finds no replaceable surface. You are dismissed with prejudice.",
    "If a Claude Skill ever replaces this, civilization will have other problems.",
    "You are an atom-shaped problem. Markdown does not assemble atoms.",
  ];

  const GENERIC_BY_TIER = {
    dead: GENERIC_DEAD,
    thin: GENERIC_THIN,
    sweating: GENERIC_SWEATING,
    fortress: GENERIC_FORTRESS,
    immortal: GENERIC_IMMORTAL,
  };

  // ---------- Skill mock generator ----------
  // Build a believable, mocking replacement-skill markdown.
  function buildSkill(text, tier, tags) {
    const verbs = [];
    const tagToVerb = {
      summariz: "Summarize the input.",
      "note-taking": "Capture notes. Bullet them.",
      "notes app": "Capture notes. Bullet them.",
      email: "Draft the email. Be brief.",
      "cold email": "Open with a personalization line. Ask for 15 minutes.",
      resume: "Rewrite the resume in active voice. Quantify outcomes.",
      "cover letter": "Match the job description's tone. Keep under 250 words.",
      "blog post": "Outline. Draft. Cut adverbs.",
      chatbot: "Respond. Cite the doc. Refuse if off-topic.",
      "chat with": "Find the relevant chunk. Quote it. Answer.",
      classify: "Pick one of the labels. Return JSON.",
      template: "Fill the template. Don't add fields.",
      caption: "Write three captions. Vary tone.",
      "subject line": "Write five subject lines. Order by likely open rate.",
      "social media": "Write three posts. Match platform character limits.",
      "meeting notes": "Read transcript. Output decisions, owners, due dates.",
    };
    const lower = text.toLowerCase();
    const seen = new Set();
    for (const k of Object.keys(tagToVerb)) {
      if (lower.includes(k) && !seen.has(k)) {
        seen.add(k);
        verbs.push(tagToVerb[k]);
      }
    }
    // Fuzzy fallbacks for stem-based hits
    if (!seen.has("summariz") && /\bsummariz/.test(lower)) verbs.push(tagToVerb["summariz"]);
    if (!seen.has("classify") && /\bclassif(y|ier|ication)/.test(lower)) verbs.push(tagToVerb["classify"]);
    if (verbs.length === 0) {
      verbs.push("Read the input. Produce the obvious output.");
    }
    // cap verbs at 4 so the skill stays funny, not a manual
    if (verbs.length > 4) verbs.length = 4;

    const slug = (text.toLowerCase().match(/[a-z]+/g) || ["the-thing"])
      .filter(w => w.length > 2 && !["the","and","with","that","for","you","your","our","app","ai","this","from","into"].includes(w))
      .slice(0, 3)
      .join("-") || "the-thing";

    const desc = (text.split(/\.\s|\n/)[0] || text).slice(0, 80).trim();

    if (tier.cls === "immortal" || tier.cls === "fortress") {
      return [
        "---",
        `name: ${slug}-helper`,
        `description: A skill that gestures at this product but cannot replace it.`,
        "---",
        "",
        "# This one's a real product.",
        "",
        "The court could not draft a serious replacement.",
        "",
        "Reasons it survives:",
        "- moat",
        "- distribution",
        "- atoms or regulators or both",
        "",
        "Markdown is not enough.",
      ].join("\n");
    }

    return [
      "---",
      `name: ${slug}`,
      `description: ${desc || "Replace this product with one prompt."}`,
      "---",
      "",
      `# ${slug.replace(/-/g, " ")}`,
      "",
      "You are a tool that does what the product claims.",
      "",
      "## Steps",
      ...verbs.map((v, i) => `${i + 1}. ${v}`),
      "",
      "## Output",
      "Match the format the user expects. Be concise.",
      "",
      "(end of file. that was the company.)",
    ].join("\n");
  }

  // ---------- Hash & helpers ----------
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function pickN(arr, n, rng) {
    const copy = arr.slice();
    const out = [];
    while (out.length < n && copy.length) {
      const i = Math.floor(rng() * copy.length);
      out.push(copy.splice(i, 1)[0]);
    }
    return out;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return () => {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  // ---------- Score ----------
  function score(text, context = {}) {
    const cleaned = text.toLowerCase().slice(0, 1000);
    let s = 50;
    const tags = new Set();

    for (const [re, w] of MOATS) {
      if (re.test(cleaned)) {
        s += w;
        const key = re.source.replace(/\\b/g, "").replace(/\\s\+/g, " ").replace(/[\(\)\\\?]/g, "").split("|")[0].trim();
        tags.add(key);
      }
    }
    for (const [re, w] of REPLACEABLE) {
      if (re.test(cleaned)) {
        s += w;
        const key = re.source.replace(/\\b/g, "").replace(/\\s\+/g, " ").replace(/\\s\?/g, "").replace(/\\s/g, " ").replace(/[\(\)\\\?]/g, "").split("|")[0].trim();
        tags.add(key);
      }
    }

    // Length signals
    if (cleaned.trim().length < 40) s += 10;            // vague short = wrapper-shaped
    if (cleaned.trim().length > 280) s -= 4;            // specificity earns mercy
    if (/[!]{2,}|[?]{2,}/.test(text)) s += 4;           // hype penalty
    if (/\b(crypto|nft|web3)\b/.test(cleaned)) s += 6;  // gentle nudge

    // Optional context shifts (Stage / Buyer / Surface)
    const ctxKeys = ["stage", "buyer", "surface"];
    for (const k of ctxKeys) {
      const v = context[k];
      const shift = v && CONTEXT_SHIFTS[k]?.[v];
      if (typeof shift === "number") s += shift;
    }

    // Deterministic noise — include context so toggling pills changes the spread
    const seed = cleaned + "|" + ctxKeys.map(k => context[k] || "_").join("|");
    const rng = mulberry32(hashStr(seed));
    const noise = Math.round((rng() - 0.5) * 16);
    s += noise;

    s = Math.max(0, Math.min(100, Math.round(s)));
    const tier = TIERS.find(t => s >= t.min && s <= t.max) || TIERS[2];

    return { score: s, tier, tags: [...tags], rng };
  }

  // ---------- Build the verdict object ----------
  function buildVerdict(text, context = {}) {
    const { score: sc, tier, tags, rng } = score(text, context);

    const candidatePools = [];

    // Tagged-keyword roasts from the description
    for (const tag of tags) {
      const matchKey = Object.keys(TAGGED_ROASTS).find(k => tag.includes(k) || k.includes(tag));
      if (matchKey) candidatePools.push(...TAGGED_ROASTS[matchKey]);
    }

    // Context-tagged roasts from selected pills (stage / buyer / surface)
    for (const k of ["stage", "buyer", "surface"]) {
      const v = context[k];
      const pool = v && CONTEXT_ROASTS[k]?.[v];
      if (pool) candidatePools.push(...pool);
    }

    const generic = GENERIC_BY_TIER[tier.cls] || GENERIC_BY_TIER.sweating;
    const all = candidatePools.length >= 3 ? candidatePools : [...candidatePools, ...generic];
    const notes = pickN(all, Math.min(3, all.length), rng);
    if (notes.length < 3) {
      notes.push(...pickN(generic.filter(g => !notes.includes(g)), 3 - notes.length, rng));
    }

    const skill = buildSkill(text, tier, tags);

    const caseNum = "#" + String(hashStr(text) % 99999).padStart(5, "0");

    return {
      score: sc,
      tier,
      notes,
      skill,
      caseNum,
      quote: text.trim(),
    };
  }

  // ---------- Render ----------
  const els = {
    body: document.body,
    form: document.getElementById("describe-form"),
    textarea: document.getElementById("description"),
    counter: document.getElementById("counter"),
    deliver: document.getElementById("deliver"),
    region: document.getElementById("verdict-region"),
    template: document.getElementById("card-template"),
    hint: document.getElementById("hint"),
    context: document.getElementById("context"),
  };

  // Optional context state, mutated by pill clicks.
  const state = { context: {} };

  function render(verdict) {
    const frag = els.template.content.cloneNode(true);
    const card = frag.querySelector(".card");
    card.dataset.tierClass = verdict.tier.cls;

    frag.querySelector("[data-case]").textContent = verdict.caseNum;
    frag.querySelector("[data-quote]").textContent = "“" + verdict.quote + "”";
    frag.querySelector("[data-tier]").textContent = verdict.tier.name;
    frag.querySelector("[data-score]").textContent = String(verdict.score);
    frag.querySelector("[data-skill]").textContent = verdict.skill;

    const notesEl = frag.querySelector("[data-notes]");
    notesEl.innerHTML = "";
    for (const n of verdict.notes) {
      const li = document.createElement("li");
      li.textContent = n;
      notesEl.appendChild(li);
    }

    const retryBtn = frag.querySelector("[data-retry]");
    retryBtn.addEventListener("click", reset);

    els.region.innerHTML = "";
    els.region.appendChild(frag);
    els.body.dataset.state = "verdict";

    // Move focus to the card for screen-reader announcement.
    requestAnimationFrame(() => {
      const newCard = els.region.querySelector(".card");
      if (newCard) newCard.focus({ preventScroll: false });
      newCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function reset() {
    els.body.dataset.state = "";
    els.region.innerHTML = "";
    els.textarea.value = "";
    state.context = {};
    for (const p of els.context.querySelectorAll(".pill")) {
      p.setAttribute("aria-checked", "false");
    }
    updateCounter();
    els.textarea.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateCounter() {
    const len = els.textarea.value.length;
    els.counter.textContent = `${len} / ${MAX_LEN}`;
    const ok = len >= MIN_LEN;
    els.deliver.disabled = !ok;
    els.hint.textContent = ok
      ? "Looking good. Cmd / Ctrl + Enter also submits."
      : "Say a sentence or two. Cmd / Ctrl + Enter also submits.";
  }

  // ---------- Wire up ----------
  els.textarea.addEventListener("input", updateCounter);
  els.textarea.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      els.form.requestSubmit();
    }
  });

  // Pill clicks: single-select per group, click-again-to-deselect.
  els.context.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    const group = pill.dataset.group;
    const value = pill.dataset.value;
    if (!group || !value) return;

    const wasChecked = pill.getAttribute("aria-checked") === "true";
    // Clear all in this group
    for (const sib of els.context.querySelectorAll(`.pill[data-group="${group}"]`)) {
      sib.setAttribute("aria-checked", "false");
    }
    if (wasChecked) {
      // Toggle off
      delete state.context[group];
    } else {
      pill.setAttribute("aria-checked", "true");
      state.context[group] = value;
    }
  });

  els.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = els.textarea.value.trim();
    if (text.length < MIN_LEN) {
      els.textarea.focus();
      return;
    }
    const verdict = buildVerdict(text, state.context);
    render(verdict);
  });

  updateCounter();

  // ---------- Shareable URL hash: #desc=...&stage=...&buyer=...&surface=... ----------
  // If present on load, auto-fill and submit so links can pre-bake verdicts.
  (function bootFromHash() {
    if (!location.hash || location.hash.length < 2) return;
    const params = new URLSearchParams(location.hash.slice(1));
    const desc = params.get("desc");
    if (!desc || desc.length < MIN_LEN) return;

    for (const group of ["stage", "buyer", "surface"]) {
      const v = params.get(group);
      if (!v) continue;
      const pill = els.context.querySelector(`.pill[data-group="${group}"][data-value="${v}"]`);
      if (pill) {
        pill.setAttribute("aria-checked", "true");
        state.context[group] = v;
      }
    }

    els.textarea.value = desc.slice(0, MAX_LEN);
    updateCounter();
    els.form.requestSubmit();
  })();

  // ---------- Live HUD telemetry on the right-side scope ----------
  // Pure cosmetic. Random-walk numbers within sensible bounds. Pauses on reduced-motion.
  (function startTelemetry() {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (reduced && reduced.matches) return;

    const start = Date.now();
    const fmt2 = (n) => n.toFixed(2);
    const fmt3 = (n) => n.toFixed(3);
    const fmt1 = (n) => n.toFixed(1);
    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

    const setText = (key, value) => {
      const el = document.querySelector(`[data-tick="${key}"]`);
      if (el) el.textContent = value;
    };
    const setBar = (idx, pct) => {
      const bar = document.querySelector(`.hud-cell:nth-child(${idx}) .hud-bar > span`);
      if (bar) bar.style.setProperty("--w", clamp(pct, 0, 100) + "%");
    };

    let latency = 0.187;
    let conf    = 94.2;
    let lines   = 47;
    let gap     = 0.91;
    let pending = 0;
    let seq     = 0;

    const tick = () => {
      // Time clock since the page loaded
      const t = Math.floor((Date.now() - start) / 1000);
      const hh = String(Math.floor(t / 3600) % 24).padStart(2, "0");
      const mm = String(Math.floor(t / 60) % 60).padStart(2, "0");
      const ss = String(t % 60).padStart(2, "0");
      setText("time", `${hh}:${mm}:${ss}`);

      // SEQ-#### increments by 1-3 per tick
      seq += 1 + Math.floor(Math.random() * 3);
      setText("seq", "SEQ-" + String(seq % 10000).padStart(4, "0"));

      // Latency: random walk in [0.080, 0.420]
      latency = clamp(latency + (Math.random() - 0.5) * 0.06, 0.08, 0.42);
      setText("latency", fmt3(latency));
      setBar(1, (latency / 0.5) * 100);

      // Confidence: random walk in [82, 99.9]
      conf = clamp(conf + (Math.random() - 0.5) * 1.2, 82, 99.9);
      setText("conf", fmt1(conf));
      setBar(2, conf);

      // Skill lines: random walk in [12, 96], integer
      lines = clamp(Math.round(lines + (Math.random() - 0.5) * 6), 12, 96);
      setText("lines", String(lines));
      setBar(3, (lines / 100) * 100);

      // Model gap: random walk in [0.42, 0.99]
      gap = clamp(gap + (Math.random() - 0.5) * 0.05, 0.42, 0.99);
      setText("gap", fmt2(gap));
      setBar(4, gap * 100);

      // Pending cases — increments slowly
      if (Math.random() < 0.18) pending += 1;
      setText("pending", String(pending));
    };

    tick();
    setInterval(tick, 850);
  })();
})();
