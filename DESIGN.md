---
name: Neumáticos el 32
description: Digital service history per vehicle, opened by plate search from the workshop's single QR; one workshop, one record per car.
colors:
  rubber-black: "#0d0d0e"
  carcass: "#161719"
  carcass-raised: "#1f2023"
  rule: "#2a2b2e"
  rule-strong: "#3a3b3f"
  sidewall-red: "#d31a24"
  sidewall-red-hover: "#e3262f"
  sidewall-red-pressed: "#b5161f"
  signal-red-text: "#f04d55"
  warm-white: "#f2f2ef"
  alloy: "#c8cad0"
  tread-grey: "#9a9da3"
  placeholder-grey: "#7c7e83"
  whatsapp-green: "#1a7a42"
typography:
  display:
    fontFamily: "Archivo, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(2rem, 9vw, 3.5rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 7vw, 2.5rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 900
    lineHeight: 1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 125"
  plate:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "38px"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.08em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 125"
  figure:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "0.02em"
    fontFeature: "'tnum' 1"
    fontVariation: "'wdth' 112"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  body-sm:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.625
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.16em"
    fontVariation: "'wdth' 115"
rounded:
  none: "0px"
  xs: "2px"
  sm: "3px"
  md: "4px"
spacing:
  gutter: "16px"
  gutter-wide: "24px"
  block: "24px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.sidewall-red}"
    textColor: "#ffffff"
    rounded: "{rounded.xs}"
    padding: "0 16px"
    height: "58px"
  button-primary-hover:
    backgroundColor: "{colors.sidewall-red-hover}"
  button-primary-active:
    backgroundColor: "{colors.sidewall-red-pressed}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.warm-white}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    padding: "0 12px"
    height: "48px"
  button-whatsapp:
    backgroundColor: "{colors.whatsapp-green}"
    textColor: "#ffffff"
    typography: "{typography.body-sm}"
    rounded: "{rounded.xs}"
    padding: "0 12px"
    height: "48px"
  input-field:
    backgroundColor: "{colors.rubber-black}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.xs}"
    padding: "0 14px"
    height: "56px"
  input-plate:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.rubber-black}"
    typography: "{typography.plate}"
    rounded: "{rounded.md}"
    height: "64px"
  plate:
    backgroundColor: "{colors.warm-white}"
    textColor: "{colors.rubber-black}"
    typography: "{typography.plate}"
    rounded: "{rounded.md}"
    height: "80px"
  service-badge:
    backgroundColor: "transparent"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.xs}"
    padding: "0 8px"
    height: "28px"
  ticket-card:
    backgroundColor: "{colors.carcass}"
    textColor: "{colors.warm-white}"
    rounded: "{rounded.none}"
    padding: "20px 24px"
  nav-tab-active:
    textColor: "{colors.warm-white}"
    typography: "{typography.body-sm}"
    height: "44px"
---

# Design System: Neumáticos el 32

## Overview

**Creative North Star: "Flanco de cubierta"**

The system reads like the sidewall of a tyre: rubber black, moulded lettering stretched wide, thin raised rules, and red only where the brand is stamped or an action waits. Everything is flat fill. Depth comes from two near-black surfaces and 1px rules, never from light. The single typeface, Archivo, carries the whole voice through its width axis: expanded, uppercase, full-weight for titles; medium-expanded spaced caps for field labels; slightly expanded tabular figures for plates, kilometres, prices and ticket numbers.

The licence plate is the dominant object. It is rendered as a Mercosur plate (warm-white field, black country band on the left marked "RA") both as the search input and as the vehicle's identity on the ticket, where it slides into place once. Records are read in fixed positions (date, kilometres, total always in the same slots) and history runs in one direction, newest first, as ruled rows.

Density is moderate on the public side (one column, generous vertical rhythm) and tighter in the admin panel. The visual rejection on record: the centered hero with a floating rounded card typical of generic SaaS.

**Key Characteristics:**
- One family (Archivo variable, wdth axis); width, not a second font, separates display, label and figure.
- Flat rubber surfaces, 1px rules, 2-4px radii, no shadows, no gradients, no glow.
- Red is reserved for action, brand and state of attention.
- Figures are tabular and slightly expanded everywhere numbers are read.
- The plate, Mercosur-style, is the signature object.

## Colors

A near-monochrome rubber palette with a single stamped red.

### Primary
- **Sidewall Red** (`sidewall-red`): the brand red from the logo. Primary button fill, the red word in the home title ("servicios"), the brand "el 32" in the wordmark, active nav underline, focus outline, text selection, input caret, the focused border of every field, and the attention icon in the next-service block. Hover lifts to **Sidewall Red Hover**; press sinks to **Sidewall Red Pressed**.
- **Signal Red Text** (`signal-red-text`): a lighter red used only for small red text and icons on dark in the admin panel, where the brand red fails AA at small sizes. Never a fill, never a large area.

### Neutral
- **Rubber Black** (`rubber-black`): page background, input field background, the plate's country band, the next-service block inset.
- **Carcass** (`carcass`): the one raised surface; ticket card, login card, expanded history row, admin panels.
- **Carcass Raised** (`carcass-raised`): hover state of a carcass row or tile.
- **Rule** (`rule`): the default 1px divider and card border.
- **Rule Strong** (`rule-strong`): borders of interactive controls (inputs, outline buttons, badges) and the scrollbar thumb.
- **Warm White** (`warm-white`): primary text, plate field, and the 2px heading rule over history.
- **Alloy** (`alloy`): secondary body copy and descriptions.
- **Tread Grey** (`tread-grey`): labels, metadata, ticket numbers, icon tint for neutral icons, outline-button hover border.
- **Placeholder Grey** (`placeholder-grey`): input placeholders on dark fields.

### Functional
- **WhatsApp Green** (`whatsapp-green`): the one sanctioned non-brand fill, used only on the "Consultar al taller" WhatsApp action. Success confirmations (copied link, saved) use Tailwind emerald as a text/icon state, not as a surface color.

The Tailwind zinc scale is overridden in `app/globals.css` with neutral, untinted greys aligned to the rubber (zinc-950 equals Rubber Black, zinc-900 equals Carcass, zinc-700 equals Rule Strong, zinc-300 equals Alloy), so any `zinc-*` utility stays inside the world.

### Named Rules
**The Stamped Red Rule.** Sidewall Red marks action, brand and attention only. It is never a decorative band, background wash or category color.

**The Small Red Rule.** Red text or icons under 18px on a dark surface use Signal Red Text; red fills and large red type use Sidewall Red.

## Typography

**Display Font:** Archivo (variable, width axis), fallback system-ui, -apple-system, Segoe UI, Roboto, sans-serif
**Body Font:** Archivo
**Label/Mono Font:** Archivo. The `font-mono` token is deliberately remapped to Archivo with tabular figures at 112% width; there is no monospace face.

**Character:** One industrial grotesque stretched to three widths. Expanded heavy caps for names and titles, spaced caps for labels, normal width for reading text.

### Hierarchy
- **Display** (900, 125% width, uppercase, clamp(2rem, 9vw, 3.5rem), 0.95): the home title only, set in two lines.
- **Headline** (900, 125% width, uppercase, clamp(1.75rem, 7vw, 2.5rem), 0.95): vehicle make and model on the ticket, admin page titles (32px), error titles (28px).
- **Title** (900, 125% width, uppercase, 1.125-1.25rem): section headings such as "Servicios anteriores", the wordmark (14-15px), the primary button label (16px, 0.1em tracking).
- **Plate** (800, 125% width, uppercase, tabular, 0.08em tracking): plate characters. 32-38px on the ticket header, 26-32px in the search input, 13-17px in compact plates.
- **Figure** (600-800, 112% width, tabular, 0.02em): dates, kilometres, totals (total at 20px, 800, 118% width), ticket numbers, quantities.
- **Body** (400, 15px, 1.625): descriptions and work performed; capped at 68ch. Secondary copy at 14px in Alloy.
- **Label** (700, 115% width, 11px, 0.16em, uppercase): field labels, definition-term labels (Fecha, Kilometraje, Total), ticket card heading.

### Named Rules
**The Width Is the Voice Rule.** Hierarchy is made with Archivo's width axis and weight, not with a second typeface. Any uppercase run is set at 115% width; uppercase at 800-900 weight goes to 125%.

**The Tabular Figure Rule.** Every number a customer compares (plate, km, price, date, ticket number) uses tabular figures at expanded width so columns align across rows.

## Layout

Public surfaces sit in a 1024px container with 16px gutters (24px from 640px). The home page is one column on mobile and splits at 1024px into a 460px working column and an aside separated by a 1px vertical rule (gap 64-96px). The ticket page narrows to 672px, one column. The admin panel uses a 1280px container.

Vertical rhythm: 32px between page sections, 24px between blocks inside a ticket, 20-24px between form groups, rules (`border-t`) used as section breaks in place of boxes. The ticket's key facts sit in a fixed three-column definition grid (date, kilometres, total), collapsing to date full-width over km and total on mobile. History rows are a ruled ordered list with date column (104px), content, and figures right-aligned.

Touch targets are at least 44px (48px for primary public actions). The admin panel switches to a bottom tab bar under 768px.

## Elevation & Depth

Flat. There are no shadows anywhere in the build. Depth is tonal: Rubber Black ground, Carcass for the one raised plane, Carcass Raised for hover, and 1px rules to separate. Emphasis is made with a heavier rule (2px warm-white under a section heading, 2px red over an error), not with lift. Focus is a 2px Sidewall Red outline offset 2px.

### Named Rules
**The No Light Rule.** No box-shadow, gradient, glow or backdrop blur. If something needs to stand forward, it changes tone or gains a rule.

## Shapes

Near-square. Containers (ticket card, login card, admin panels, history rows) take 0-3px corners; controls (buttons, inputs, badges, compact plates) take 2px; the large plate takes 4px. Borders are 1px by default and 2px only on the plate edge, a section-heading underline, an error top rule, and the outlined QR/alert icon tiles on public pages. The plate's left country band is the one recurring silhouette.

## Components

### Buttons
Blunt and full-weight.
- **Shape:** squared (2px).
- **Primary:** Sidewall Red fill, white Title-style label (expanded caps, 0.1em tracking), 58px tall and full width on the public search form; trailing arrow nudges 4px right on hover.
- **Hover / Active / Disabled:** Sidewall Red Hover, then Sidewall Red Pressed; disabled at 45% red with 75% white text. Color transitions only.
- **Outline:** transparent with a Rule Strong border, warm-white 14px semibold label, 48px min height; border lifts to Tread Grey on hover. Used for share, back, and the header "Acceso taller" link (Alloy text there).
- **WhatsApp:** WhatsApp Green fill, white label, same geometry as Outline; sits beside Share as an equal pair.

### Chips
- **Service badge:** outlined 28px chip, Rule Strong border, 11px bold uppercase label at 112% width in Warm White, 14px category icon on the left.

### Cards / Containers
- **Corner Style:** square (0) for the ticket card.
- **Background:** Carcass on Rubber Black.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** 1px Rule; internal divisions are also 1px Rule.
- **Internal Padding:** 16px horizontal on mobile, 24px from 640px; 20px vertical body.
- **Ticket header:** reads like a work order: Label-style title left, ticket number in Figure right, ruled underneath.

### Inputs / Fields
- **Style:** Rubber Black field, 1px Rule Strong border, 2px corners, 48-56px tall; border goes to the grey of zinc-600 on hover.
- **Focus:** border turns Sidewall Red; no glow. The global focus-visible outline still applies for keyboard users.
- **Labels:** Label style in Tread Grey above the field; hint text 12px Tread Grey below.
- **Error:** a 2px Sidewall Red top rule above an icon and a semibold message; field shakes (360ms) where used in admin.

### Navigation
- **Public header:** sticky, Rubber Black, 64px tall, 1px Rule bottom. Logo (44px) plus the expanded wordmark with "el 32" in red; an outline "Acceso taller" link on the right.
- **Admin header:** same bar; desktop tabs are 13px semibold Alloy text with a 2px bottom border that turns Sidewall Red when active and Rule Strong on hover. Under 768px a bottom tab bar with the same red top-border active state.

### Plate (signature)
The Mercosur plate: Warm White field with a 2px Warm White edge, 4px corners, a Rubber Black band on the left carrying "RA" in 10-11px extra-bold caps aligned to the bottom, and the plate characters in the Plate style. As an input its edge turns Sidewall Red on focus. On the ticket header it enters once with `plate-in` (560ms, 14px slide from the left, ease-out). A compact 28/36px version marks plates inside lists.

### History list
Ruled ordered list under a Title heading with a 2px Warm White rule and a count in Figure. Each row is a button: date and ticket number, badge and truncated description, price and km right-aligned, chevron that rotates 180 degrees and turns red when open. The expanded ticket opens in place on Carcass with the fade-in gesture.

## Do's and Don'ts

### Do:
- **Do** use Sidewall Red only for the primary action, brand marks, active/focus states and attention icons.
- **Do** use Signal Red Text for any red text or icon under 18px on a dark surface.
- **Do** set titles in Archivo 900 at 125% width, uppercase; set labels in the Label style (11px, 700, 0.16em, 115% width).
- **Do** use tabular figures at expanded width for plates, km, prices, dates and ticket numbers.
- **Do** separate content with 1px Rule lines; reach for a 2px rule only for a section heading or an error.
- **Do** keep corners at 2px for controls, 4px for the large plate, 0-3px for containers.
- **Do** show the plate as a Mercosur plate wherever a vehicle is identified.
- **Do** keep motion to the existing gestures: fade-in (280ms, 4px rise), plate-in (560ms), shake (360ms), all on cubic-bezier(0.16, 1, 0.3, 1), and respect reduced motion.

### Don't:
- **Don't** add shadows, gradients, glows or backdrop blur.
- **Don't** use pill shapes or radii above 4px.
- **Don't** introduce a second typeface or a monospace face; width and weight carry the hierarchy.
- **Don't** use red as a background wash, decorative band or category color.
- **Don't** use the default blue-tinted zinc; the overridden neutral scale is the only grey.
- **Don't** build a centered hero with a floating rounded card.
- **Don't** alter the brand logo (`public/logo.webp`); it is used as supplied.

### Known gaps (carried by the build, not part of the system):
- The admin panel is only partly brought into the world: tinted icon tiles (deep-red #880e14 at 20% with red borders), mixed-case and tracking-wider bold labels instead of the Label style, stock Tailwind `red-400`/`red-500` text and hover states, a `rounded-full` count pill, and emerald-tinted success panels. Do not copy these into new surfaces; new admin work follows the public components above.
- The service badge tints its category icon with stock Tailwind hues (cyan, amber, rose, violet, sky) and brand red for tyres. This is current behavior awaiting a decision, not a palette; do not extend it to other components.
