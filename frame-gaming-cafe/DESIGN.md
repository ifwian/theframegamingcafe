# FRAME Gaming Café — Design System

## 01 — Design Direction

FRAME Gaming Café is a fictional gaming café reservation website.

Visual direction:
- Minimalist
- Black and white
- Technical
- Editorial
- Modern
- Structured
- Premium but simple
- Gaming-focused without looking like a typical gaming website

Think: **modern software interface + editorial website + gaming café**.

It must NOT look cyberpunk, RGB, esports, or neon.

## 02 — Strict Visual Rules

### DO
- Use black, white, and neutral grays.
- Use generous whitespace.
- Use thin borders.
- Use strong typography.
- Use simple geometric layouts.
- Use subtle hover transitions.
- Use monospace typography for metadata.
- Use numbered section labels.
- Use clean grids.
- Use editorial-style spacing.
- Use grayscale photography if imagery is used.
- Use subtle shadows only where useful.
- Keep visual hierarchy clear.

### DO NOT
- No neon colors.
- No RGB effects.
- No glowing text or borders.
- No cyberpunk aesthetic.
- No holographic UI.
- No purple/blue/pink gradients.
- No bright gaming colors.
- No excessive glassmorphism.
- No excessive rounded cards.
- No huge animated backgrounds.
- No particle effects.
- No excessive 3D.
- No cluttered dashboard styling.
- No generic Bootstrap-looking interface.

## 03 — Color System

```text
Black       #000000
Near Black  #111111
Dark Gray   #1A1A1A
Gray        #666666
Light Gray  #E5E5E5
Off White   #F5F5F5
White       #FFFFFF
```

Use color mainly for contrast, not decoration.

## 04 — Typography

Preferred fonts:
- Geist
- Inter
- Space Grotesk
- IBM Plex Sans
- JetBrains Mono

Use a modern sans-serif for primary content.

Use monospace for:
- section numbers
- reservation IDs
- prices
- status
- station IDs
- dates
- times
- metadata
- technical labels

Avoid decorative gaming fonts and overly futuristic fonts.

## 05 — Layout

Use an editorial layout with strong alignment:
- generous page margins
- clear content width
- strong vertical rhythm
- consistent section spacing
- thin horizontal rules
- carefully aligned grids

Do not center every section. Use left-aligned typography where appropriate. Use asymmetric layouts when they improve composition.

## 06 — Navigation

Brand:

```text
FRAME
```

Navigation:

```text
01 HOME
02 STATIONS
03 GAMES
04 PRICING
05 RESERVE
```

Navigation should feel like a technical index.

On mobile, use a simple menu. No oversized gaming navigation.

## 07 — Hero

Example:

```text
FRAME
GAMING CAFÉ

RESERVE.
PLAY.
REPEAT.

A focused gaming space for casual sessions,
competitive matches, and everything in between.

[ RESERVE A STATION → ]
```

Use a monochrome gaming image or subtle abstract visual if appropriate.

Preferred imagery:
- gaming desk
- keyboard
- mouse
- monitor
- gaming station
- café interior
- architectural details

Avoid colorful RGB gaming setups.

## 08 — Technical Metadata

Use small technical information blocks:

```text
LOCATION
CALAMBA, PH

OPEN
10:00 — 02:00

STATIONS
05
```

If information is fictional, treat it as sample/demo content.

## 09 — Section Headers

Use numbered sections:

```text
01 — ABOUT
02 — STATIONS
03 — GAMES
04 — PRICING
05 — RESERVATION
06 — CONTACT
```

Use small uppercase monospace labels and larger section headings.

## 10 — About

Keep it editorial:

```text
01 — ABOUT

A PLACE TO PLAY.

FRAME is a fictional gaming café designed
for players who want a focused and comfortable
space to play, compete, and spend time with friends.
```

Avoid corporate language.

## 11 — Stations

Use structured rows or minimal cards:

```text
01
PC-01
GAMING PC
₱50 / HR
AVAILABLE
→
```

Hover may subtly change background, border, text weight, or arrow position. No glow.

## 12 — Games

Use an editorial list:

```text
01  VALORANT
02  COUNTER-STRIKE 2
03  LEAGUE OF LEGENDS
04  DOTA 2
05  MINECRAFT
06  GTA V
07  FORTNITE
08  ROBLOX
```

Do not use colorful game cards.

## 13 — Pricing

Use a simple index:

```text
01
REGULAR PC
₱50 / HOUR

02
HIGH-END PC
₱70 / HOUR

03
PLAYSTATION 5
₱80 / HOUR

04
VIP ROOM
₱150 / HOUR
```

## 14 — Reservation Form

Fields:

```text
FULL NAME
CONTACT NUMBER
EMAIL
GAMING STATION
DATE
START TIME
DURATION
NUMBER OF PLAYERS
PAYMENT METHOD
```

Use thin borders, clear labels, strong focus states, and comfortable spacing. Avoid giant rounded inputs.

## 15 — Buttons

Primary:

```text
[ RESERVE A STATION → ]
```

Use black/white inversion on hover. No glow.

## 16 — Reservation Confirmation

Example:

```text
RESERVATION CONFIRMED

RESERVATION
#024

STATION
PC-03

DATE
OCT 05, 2026

TIME
18:00

DURATION
2 HOURS
```

The reservation ID must come from the database.

## 17 — Admin Dashboard

Header:

```text
FRAME / ADMIN
```

Summary:

```text
TOTAL
24

PENDING
04

CONFIRMED
15

CANCELLED
03

COMPLETED
02
```

Use large typography and thin borders. Do not use colorful dashboard widgets.

## 18 — Reservation Table

Columns:

```text
ID
CUSTOMER
STATION
DATE
TIME
DURATION
PLAYERS
PAYMENT
STATUS
ACTION
```

Keep statuses monochrome:

```text
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

## 19 — Search and Filters

Search:

```text
SEARCH RESERVATIONS...
```

Filters:

```text
ALL
PENDING
CONFIRMED
CANCELLED
COMPLETED
```

Keep them visually simple.

## 20 — Dark Mode

(Superseded by section 27: the whole site is now dark.) If implemented, use true monochrome themes.

Light:
```text
Background: #FFFFFF
Text: #000000
Secondary: #666666
Borders: #E5E5E5
```

Dark:
```text
Background: #000000
Text: #FFFFFF
Secondary: #A0A0A0
Borders: #2A2A2A
```

Do not introduce color.

## 21 — Motion

Allowed:
- opacity transitions
- slight translate
- border transitions
- arrow movement
- menu animation
- section reveal

Avoid bounce, spinning, particles, neon pulses, and flashy transitions. Respect `prefers-reduced-motion`.

## 22 — Images

Use grayscale/monochrome imagery intentionally. Do not use random stock imagery everywhere. Avoid neon cyberpunk characters and RGB setups.

## 23 — Responsive Design

Desktop:
- wide editorial layout
- multi-column sections
- large typography
- horizontal metadata

Tablet:
- reduced spacing
- fewer columns
- adjusted type sizes

Mobile:
- one-column layout
- stacked metadata
- full-width buttons
- simplified navigation
- readable tables
- comfortable form controls

## 24 — Accessibility

Use:
- semantic HTML
- proper labels
- keyboard focus states
- sufficient contrast
- alt text
- buttons for actions
- links for navigation
- accessible form errors

## 25 — Final Design Test

Before considering the design complete:

1. Does it look black and white?
2. Does it avoid cyberpunk?
3. Does it avoid neon?
4. Does it avoid RGB?
5. Does it feel like a technology product?
6. Does it still feel like a gaming café?
7. Is the typography strong?
8. Is there enough whitespace?
9. Are borders subtle?
10. Is the hierarchy obvious?
11. Do all pages share the same design system?
12. Does mobile remain polished?
13. Does it avoid generic Bootstrap styling?

Desired result:

**minimalist + technical + editorial + gaming**

not:

**cyberpunk + neon + esports + RGB**

---

## 26 — Implementation Notes

How the design above was applied in code (all in `public/css/style.css`):

- **Variables:** the seven palette colors and the two font stacks are CSS variables at the top of the file.
- **Fonts:** Inter (sans) and JetBrains Mono (metadata), loaded from Google Fonts with system fallbacks. If the internet is offline the pages still work with Helvetica/Arial and Courier New.
- **Borders and corners:** 1px borders, `border-radius: 0` everywhere. No gradients, no shadows, no glow.
- **Status styles (monochrome):** Pending = dashed outline, Confirmed = solid black, Cancelled = gray with strikethrough, Completed = light gray fill.
- **Errors:** a field with an error gets a thicker black border and a `✕` message below it (not red).
- **Motion:** only the hero fade-in, link/button transitions and the arrow movement. `prefers-reduced-motion` turns all of it off.
- **Breakpoints:** tablet at 1024px, mobile at 720px. On mobile the admin table turns into stacked blocks, each value showing its own label.
- **Images:** the hero uses a simple monochrome line drawing (inline SVG) instead of photography, so no image files are needed.
- **Dark mode:** not implemented (optional in section 20).


---

## 27 — Update: Soft Dark Theme (overrides sections 02, 03 and 20)

Change request: the pure black/white palette was too harsh on the eyes, so the whole UI now uses a **soft, low-contrast dark theme with muted cool grays**. The rest of the direction is unchanged (minimalist, technical, editorial, no neon, no glow, no gradients, no RGB).

| Role | Value |
|---|---|
| Page background | `#16181D` |
| Panels / sidebar | `#1C1F25` |
| Raised surfaces / hover | `#242830` |
| Subtle border | `#2A2E36` |
| Main border | `#444A55` |
| Secondary text | `#8E95A1` |
| Main text / headings | `#CBD0D8` |

- Nothing is pure black (`#000`) or pure white (`#FFF`). Large light areas are avoided, so there are no bright slabs on the page.
- Main text on the background is about 10:1 contrast, secondary text about 5.5:1. Both pass WCAG AA.
- Buttons invert softly: light-gray fill with dark text. Focus rings stay visible.
- Real photos are shown in grayscale and dimmed (`brightness(0.8)`).
- `color-scheme: dark` is set so native date pickers and scrollbars match.

## 28 — Image Placeholder

The hero uses a 4:3 **image frame**: dashed border, picture icon and the label `IMAGE PLACEHOLDER`. When `assets/images/hero.jpg` exists it covers the placeholder (grayscale). Caption: `FIG. 01 — THE GAMING AREA`.

## 29 — Admin Area

- Separate pages: `/admin/login` and `/admin`. Same typography, borders and palette as the public site.
- **Layout:** fixed sidebar (264px) with section buttons, signed-in user, session countdown and sign-out. On screens under 900px the sidebar becomes a top bar with a MENU button.
- **Sections:** Overview, Reservations, Users (admin), Audit Log (admin).
- **Metric cards:** bordered panels with a large monospace number and a small label.
- **Tables:** thin rules, monospace data, search box, pagination (`← PREV  PAGE 1 / 3  NEXT →`). On mobile each row becomes a stacked block.
- **Roles:** staff do not see admin-only sections or delete buttons.
