# Attendance Platform Design Language

This file is the frontend design source of truth for humans and agents working on new interfaces in this project.

If a screen looks polished in isolation but does not match this system, it is wrong.

## 1. Product Character

The product should feel:

- institutional
- calm
- administrative
- trustworthy
- structured
- document-centric

This is not a startup landing page. Do not design flashy dashboards, glossy gradients, oversized cards, or decorative motion-heavy interfaces.

The visual priority is operational clarity:

- users should find actions quickly
- tables should remain readable
- statuses should be obvious
- forms should feel stable and predictable
- modals should support review and decision workflows

## 2. Core Palette

The palette below comes from the provided brand reference and should drive all new UI work.

| Role | Hex | Usage |
| --- | --- | --- |
| Primary | `#1E3A8A` | primary actions, active navigation, important headings, selected states |
| Secondary | `#0D9488` | supportive emphasis, validated states, positive guidance, secondary highlights |
| Background | `#F9FAFB` | app canvas, page background |
| Surface | `#FFFFFF` | cards, modals, dropdowns, panels |
| Text Primary | `#1F2937` | primary copy, headings, strong labels |
| Text Secondary | `#6B7280` | metadata, helper text, secondary labels |
| Border | `#E5E7EB` | dividers, card borders, table separators, input outlines |
| Danger | `#DC2626` | destructive actions, rejected states, error emphasis |
| Warning | `#F59E0B` | warning banners, pending attention, caution states |

## 3. Token Mapping

These roles should map to the theme tokens in [`frontend/src/styles.css`](./src/styles.css):

| Design role | Token |
| --- | --- |
| Primary | `--color-primary` |
| Secondary | `--color-secondary` |
| Background | `--color-background` |
| Surface | `--color-surface` |
| Text Primary | `--color-principalText` |
| Text Secondary | `--color-secondaryText` |
| Border | `--color-line` |
| Danger | `--color-danger` |
| Warning | `--color-warning` |

Use tokens, not raw hex values, in implementation work.

## 4. Supporting Neutrals

The codebase already defines supporting neutrals that should be reused instead of improvised:

- `--color-background-elevated`: slightly raised app backgrounds
- `--color-surface-subtle`: quiet panel fills
- `--color-surface-muted`: muted blocks and light emphasis areas
- `--color-nav-active`: active navigation background
- `--color-nav-text`: default sidebar and utility navigation text
- `--color-line-strong`: stronger separators when normal borders are too weak
- `--color-muted`: tertiary text and low-priority metadata

If a new interface needs another neutral, add a token first. Do not spray `gray-*` utilities across templates.

## 5. Typography

The default application font is `Roboto`.

Use typography to create hierarchy, not decoration:

- page titles: strong, compact, high contrast
- section titles: clear and slightly smaller than page titles
- body text: neutral and readable
- metadata: secondary text color, never lower contrast than usability allows
- labels and badges: concise and direct

Do not create one-off type sizes unless the pattern is reusable and deserves a tokenized style.

## 6. Layout Rules

Default application layout:

- left sidebar for persistent navigation
- top utility bar for context and actions
- content canvas on a light background
- white cards and panels over the canvas

Spacing should feel ordered and dense enough for admin work, not spacious for marketing theater.

Use:

- consistent card padding
- visible but quiet section separation
- moderately rounded corners
- restrained shadows

Avoid:

- giant empty gaps
- pill-heavy layouts
- floating elements with dramatic elevation
- random alignment changes between screens

## 7. Component Patterns

### Cards

- White surface on light background
- Subtle border
- Soft shadow
- Clear title and supporting metadata

### Tables

- High legibility first
- Strong header clarity
- Quiet row separators
- Compact actions
- No decorative styling that reduces scan speed

### Forms

- Inputs must feel stable and plain
- Labels should be explicit
- Errors should be specific and visible
- Destructive or risky actions must be visually distinct

### Status Badges

- Compact, text-led, and semantic
- Use restrained tinted backgrounds when needed
- Do not turn every state into a loud solid pill

### Modals

- Wide enough for review workflows
- Structured into sections when content is dense
- Preserve strong action hierarchy

## 8. Color Usage Rules

- Primary blue is the anchor color. Use it for important actions and navigation emphasis.
- Secondary teal is not decoration. Use it for supportive emphasis, positive confirmation, and validated states.
- Danger red is for destructive or failed states only.
- Warning amber is for caution and pending attention.
- Background and surface neutrals should carry most of the UI.

Do not:

- introduce random accent colors
- replace the blue with trend-driven brand colors
- use saturated gradients as a shortcut for hierarchy
- overload a screen with too many colored badges, banners, or icons

## 9. Accessibility Rules

- Meet WCAG AA contrast minimums
- Keep visible focus states on every interactive control
- Give icon-only actions an accessible name
- Preserve keyboard navigation through forms, tables, menus, and modals
- Prefer clarity over strict visual fidelity if the design and accessibility conflict

If the raw mockup is inaccessible, fix it. Copying a weak design is not accuracy. It is negligence.

## 10. Motion And Visual Effects

Use motion sparingly:

- subtle entrance or fade for system feedback
- quiet hover or focus transitions
- no decorative bouncing, scaling, or parallax

Shadows should separate surfaces, not perform branding work.

## 11. Implementation Rules For Agents

- Start from existing tokens in [`frontend/src/styles.css`](./src/styles.css)
- Reuse existing layout and shared UI patterns before inventing new ones
- Prefer token-backed classes over hardcoded values
- Extract repeatable patterns into shared components
- Keep new screens visually consistent with the current shell and dashboard direction

Reject these implementation smells:

- raw hex colors in templates
- Tailwind default grays used in final UI when a project token exists
- one-off spacing and radius values with no pattern
- flashy hero-section styling inside admin screens
- inconsistent card, table, or badge treatments across pages

## 12. Quick Checklist

Before shipping a new interface, verify:

1. It uses the palette roles above, not invented colors.
2. It relies on existing tokens or adds new tokens intentionally.
3. It looks like part of the same administrative product family.
4. Text contrast, focus states, and keyboard support are intact.
5. Tables, forms, cards, and badges remain readable under real data density.
