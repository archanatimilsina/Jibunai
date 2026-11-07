---
version: alpha
name: Jibunai Quiet Paper
description: Offline-first personal companion — warm paper, ink text, one forest-green action color. Steering-wheel nav is the single memorable element; everything else stays quiet.
colors:
  primary: "#2D6A4F"
  primary-dark: "#245741"
  secondary: "#1A1A2E"
  tertiary: "#E4F1EA"
  neutral: "#5C574C"
  surface: "#FFFFFF"
  surface-alt: "#EFEDE4"
  on-surface: "#1A1A2E"
  on-primary: "#FFFFFF"
  on-secondary: "#FFFFFF"
  on-tertiary: "#1A1A2E"
  error: "#C0392B"
  on-error: "#FFFFFF"
  success: "#2D6A4F"
  on-success: "#FFFFFF"
  border: "#D8D4CC"
  muted: "#ECEAE3"
typography:
  display:
    fontFamily: "DM Sans"
    fontSize: "40px"
    fontWeight: 800
    lineHeight: "48px"
    letterSpacing: "1.5px"
  h1:
    fontFamily: "DM Sans"
    fontSize: "28px"
    fontWeight: 800
    lineHeight: "34px"
    letterSpacing: "-0.5px"
  h2:
    fontFamily: "DM Sans"
    fontSize: "22px"
    fontWeight: 800
    lineHeight: "29px"
    letterSpacing: "-0.3px"
  h3:
    fontFamily: "DM Sans"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "25px"
    letterSpacing: "-0.2px"
  body-lg:
    fontFamily: "DM Sans"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
    letterSpacing: "0px"
  body-md:
    fontFamily: "DM Sans"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "21px"
    letterSpacing: "0px"
  body-sm:
    fontFamily: "DM Sans"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "19px"
    letterSpacing: "0px"
  label:
    fontFamily: "DM Sans"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
    letterSpacing: "0.6px"
rounded:
  sm: "8px"
  md: "12px"
  lg: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary-active:
    backgroundColor: "{colors.primary-dark}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary-disabled:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.neutral}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  badge:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-tertiary}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  chip:
    backgroundColor: "{colors.surface-alt}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "{spacing.xs}"
  tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.neutral}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  toast:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.on-secondary}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  banner-error:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-error}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  banner-sync:
    backgroundColor: "{colors.success}"
    textColor: "{colors.on-success}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.full}"
    padding: "{spacing.sm}"
  divider:
    backgroundColor: "{colors.border}"
    textColor: "{colors.neutral}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
---

## Overview

Jibunai is an offline-first personal companion: one wheel to reach every system, quiet paper screens underneath. The feel is quiet, paper-warm, and tactile — calm surfaces, ink text, a single forest-green action color. The steering-wheel navigation is the one memorable element; every other surface stays disciplined and still. Light theme only, matching `userInterfaceStyle: light`. Display type is DM Sans ExtraBold for the wordmark and screen titles; body and labels are DM Sans; DM Mono is reserved for code and timestamps, never for labels.

## Colors

- Forest `primary` #2D6A4F — the only action color. Buttons, selected states, active wheel segment, focus rings.
- Deep forest `primary-dark` #245741 — hover and pressed states only, white text stays on top.
- Ink `secondary` #1A1A2E — headings, wheel hub, primary text on light surfaces.
- Mist `tertiary` #E4F1EA — selected fills and soft highlights, always paired with ink text `on-tertiary`.
- Warm gray `neutral` #5C574C — secondary text on white. Darkened from the old soft tone so body text passes contrast.
- Paper `surface` #FFFFFF — cards, sheets, inputs, wheel segments.
- Warm paper `surface-alt` #EFEDE4 — alternating wheel segments and quiet fills, ink text on top.
- Text `on-surface` #1A1A2E — default ink on paper.
- Inverse text `on-primary` #FFFFFF, `on-secondary` #FFFFFF — white on forest and ink.
- Signal `error` #C0392B with `on-error` #FFFFFF — destructive actions and error banners only, never as decoration.
- Confirm `success` #2D6A4F with `on-success` #FFFFFF — same forest as primary so success and action agree.
- Hairline `border` #D8D4CC — 1 to 1.5pt dividers and card outlines.
- Fill `muted` #ECEAE3 — disabled fills and skeleton base, always paired with neutral text.

## Typography

Families: DM Sans for everything the user reads (display, headings, body, labels); DM Mono for code, slugs, and timestamps only. Two families loaded, four weights maximum. Roles: `display` (40/48, wordmark and hero only), `h1` (28/34, screen titles), `h2` (22/29, section titles), `h3` (18/25, card titles), `body-lg` (16/24, long-form reading), `body-md` (14/21, default UI text), `body-sm` (13/19, meta and helper text), `label` (12/16 semibold, buttons and chips). Labels use normal case everywhere. Body line length stays under 80 characters; `body-lg` gets the loosest line height for reading comfort.

## Layout

One centered column per screen with a single spacing rhythm from tokens. Shell: header bar with back control on the left and centered title, content column below with 18pt gutters, maximum width 1180 on wide screens and full width under 700. Sections stack vertically with 16 to 48pt gaps from the spacing scale; cards and forms align to the same gutters on every page. Alignment is left for content with centered heroes only on Home. Breakpoints follow the existing width checks: compact under 380, standard to 700, wide at 700 and above, extra-wide reading measure at 900 for two-pane lists.

```
+--------------------------------------+
| back |      Screen title             |
+--------------------------------------+
|  gutter  content column (<=1180)     |
|  +--------------------------------+  |
|  | hero / page header             |  |
|  +--------------------------------+  |
|  | primary action (one per view)  |  |
|  +--------------------------------+  |
|  | cards / lists / forms          |  |
+--------------------------------------+
```

## Elevation & Depth

Depth is flat paper with borders first, shadow only to lift. Level 0: flat fills separated by 1pt `border` hairlines (lists, dividers). Level 1: cards and inputs with border plus a soft 8 to 12pt shadow at 0.06 opacity, elevation 2 to 3 (forms, list cards). Level 2: sheets, menus, and the wheel with 16 to 22pt shadow at 0.14 to 0.16 opacity, elevation 8 to 10. Shadows never carry color; the scrim behind the wheel is warm paper at 0.88 opacity so the current page stays visible but inert. `prefers-reduced-motion` and Android elevation follow the existing WheelNav behavior.

## Shapes

Radius is quiet and consistent: `sm` 8 for inputs, checkboxes, and small controls; `md` 12 for buttons, bars, and sheets; `lg` 16 for cards and modals; `full` 9999 for pills, chips, tabs, and the sync banner. The wheel stays fully round with round segments; its hub is a solid forest circle. Images keep a 16:10 ratio with `lg` radius and a hairline border. No square corners on interactive elements, no mixed radii on the same card.

## Components

Navigation and header: light bar with hairline bottom border, back control in a bordered `md` box, centered title in `h1` and group caption in small caps mono. Wheel nav: alternating paper segments, forest ring on the aligned segment, forest hub with white close glyph, readout pill above showing label and group. Buttons: `button-primary` is forest with white label; hover and active go deep forest; disabled is muted fill with neutral text and stays legible. `button-secondary` is paper with forest text and a hairline border. Inputs: paper fill, hairline border, ink text, visible forest focus ring. Cards: paper with border and level-1 shadow; lists vary treatment by hierarchy instead of repeating identical tiles. Badges and chips are pills in mist or warm paper with ink text. Tabs are pills with neutral text and a forest active state. Modals are paper `lg` sheets with level-2 shadow. Toasts are ink with white text; error banners are forest-on-error red with white text; the sync pill is success forest with white text. Icons come from one family (Feather) at one stroke scale; images share one ratio and radius.

## Do's and Don'ts

- Always pair text and background from the token pairs in this file; never invent a hex outside the front matter.
- Always keep one primary action per view; secondary and tertiary levels stay visually quieter.
- Always show state with more than color alone — add an icon, label, or underline for selected, error, and success.
- Always keep every `accessibilityLabel`, route key, storage key, and validation message exactly as-is.
- Always use `transform` and `opacity` for motion between 120 and 300ms on one easing curve; never animate layout properties.
- Never add ALL-CAPS eyebrow labels above headings, middle-dot meta strings, spaced-em-dash labels, trailing arrows on links, numbered 01 markers, or single-word accent coloring in headlines.
- Never use cream with terracotta, acid-green on near-black, purple-to-blue gradients, glassmorphism, or decorative dividers that carry no information.
- Never use Inter, Roboto, Arial, or system-ui as the primary face and never use monospace for small data labels.
