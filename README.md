# Adnan Bandey -> Portfolio ("Pitch Report")

A personal portfolio site built around a football theme because the World Cup fever might fade, but the love for the sport doesn't. Experience reads like a match log, skills are a depth chart, and there's a half-time break built into the scroll.

**Live site:** _add your deployed URL here_

---

## Features

- **Hero — Starting XI card**: intro section styled like a player card, with a live "match clock" and a rolling football animation across a mini pitch (goalposts included).
- **Match Log (Experience)**: career timeline in two scroll segments, separated by a **Half Time** banner. A football icon tracks scroll progress down each segment and fades in/out at the edges of its own section.
- **Depth Chart (Skills)**: four radar/spider charts (Languages, Tools, Python Libraries, Domain Knowledge), generated client-side from simple JSON so values are easy to tweak without touching layout code.
- **Training Ground (Projects)**: project cards that link straight out to GitHub/live app links.
- **Academy (Education)** and **Full Time (Footer/Contact)**.
- **Player card easter egg**: a separate standalone FIFA-style card (`fifa-card.html`) with an overall rating averaged from six skill stats.
- Smooth scroll (Lenis), scroll-triggered reveals and animation (GSAP + ScrollTrigger), subtle tilt on project cards (Vanilla-Tilt) — all via CDN, no build step.

## Tech stack

Plain HTML / CSS / JavaScript. No framework, no bundler — open `index.html` in a browser and it runs.

- [Lenis](https://github.com/darkroomengineering/lenis) — smooth scroll
- [GSAP](https://gsap.com/) + ScrollTrigger — scroll-driven animation
- [Vanilla-Tilt.js](https://micku7zu.github.io/vanilla-tilt.js/) — card tilt on hover
- Google Fonts: Oswald, Inter, IBM Plex Mono

## File structure

```
.
├── index.html          # Main site
├── style.css            # All styling
├── script.js             # Lenis / GSAP / radar chart / reveal logic
├── fifa-card.html       # Standalone player-card graphic
└── README.md
```

## Assets you need to add locally

These aren't included in the repo — drop your own copies in the root folder with these exact filenames:

| Filename | Used for |
|---|---|
| `adu_v1.png` | Hero avatar / player card image |
| `football.png` | Rolling ball in the hero + scroll markers on the timeline |
| `rga.png` | Club badge on the FIFA-style player card |
| `ADNAN_7YOE_v1.pdf` | Resume, linked from the "Download resume" button |

> Note: `football.png` should be a photo you have the rights to use avoid branded product photography (trademarks/logos) if the site is going to be public.

## Running locally

No build step required. Either:
- Open `index.html` directly in a browser, or
- Serve the folder locally for a closer-to-production feel (fonts/CDN scripts need network access either way):
  ```bash
  npx serve .
  ```

## Deploying (Vercel)

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project** → import the repo.
3. Framework preset: **Other** (it's static — no build command needed).
4. Deploy. Attach a custom domain later under Project Settings → Domains if you want one.

## Customizing

- **Skill chart values**: edit the `data-radar` attribute on each `.radar-canvas` div in `index.html` — it's a plain JSON array of `["Label", value]` pairs, 0–100 scale.
- **Half Time banner copy**: edit the `.half-time-banner` block in `index.html`.
- **Match clock**: caps at `90+30'` — adjust the ceiling in the clock timer logic in `script.js`.

## Credits

- Site design & build: Adnan Bandey, with Claude.
- Player card artwork: made by my wife 🖤
