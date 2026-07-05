
You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

## Figma Design System Rules

These rules apply to every Figma-driven frontend change for this repository. The current source design is the Figma file `Academic Attendance Platform` (`https://www.figma.com/design/Vym1gOw6bVrK5aiDxPFpxb/Academic-Attendance-Platform?node-id=0-1`).

IMPORTANT: Read [`frontend/DESIGN_LANGUAGE.md`](./DESIGN_LANGUAGE.md) before designing or implementing new UI. That file is the reusable design-language source of truth for this project.

### Source Of Truth

- IMPORTANT: Treat Figma as the visual source of truth for layout, hierarchy, spacing, and states.
- IMPORTANT: Treat code as the implementation source of truth for tokens, accessibility, and component reuse.
- IMPORTANT: The Figma file currently exposes no usable variables from MCP. Do not mirror that weakness into code. Extract missing tokens into `frontend/src/styles.css` before or during implementation.

### Design Language

- The product design language is institutional, calm, and administrative, not startup-flashy.
- The UI should feel trustworthy, structured, and document-centric.
- Visual direction:
  - light surfaces
  - soft borders
  - restrained shadows
  - dense but readable information layout
  - blue as the primary action color
  - teal used for positive or validated states
- The design avoids heavy gradients, loud saturation, oversized rounded blobs, and decorative motion.
- Cards, tables, modals, and navigation should feel precise and clean, with subtle elevation rather than dramatic contrast.
- Copy hierarchy should support operational workflows first: section labels, card metrics, timestamps, status labels, and administrative actions.
- When implementing new screens, favor clarity and auditability over visual novelty.

### Visual Patterns

- The main application shell is a left sidebar plus top utility bar plus content canvas.
- Primary surfaces are white or near-white cards over a very light neutral page background.
- Corners are moderately rounded, not pill-heavy except for badges and chips.
- Borders are visible but subtle.
- Shadows are soft and low-contrast; use them to separate surfaces, not to decorate.
- Status chips are compact, lightly tinted, and text-led rather than loud solid pills.
- Modals are wide, structured, and split into information columns when the workflow is document-heavy.
- Tables are administrative tables, not marketing tables: high legibility, clear headers, restrained separators, compact actions.

### Color Palette

- The palette below is inferred from the Figma screenshots and should be normalized into tokens in `frontend/src/styles.css`.
- Primary brand:
  - deep academic blue for primary actions, navigation emphasis, chart lines, and major headings
  - current code token: `--color-primary`
- Secondary/supporting accent:
  - teal for approved, validated, and supportive informational states
  - current code token: `--color-secondary`
- Neutrals:
  - soft off-white page background
  - white card and modal surfaces
  - muted slate body text
  - lighter secondary text for labels and metadata
  - pale gray borders and separators
- Semantic states:
  - success/approved: teal-to-green family
  - warning: amber family
  - error/rejected: restrained red family
  - info: blue family
  - on-hold/pending review: orange family
- IMPORTANT: The palette is low-noise and professional. Do not introduce saturated random accents that are absent from the Figma system.
- IMPORTANT: Add explicit neutral tokens for surface, surface-subtle, border, border-strong, muted text, chip backgrounds, and shadow colors. The current token set is not sufficient.

### Page Inventory And Product Areas

- Current implemented routes in code:
  - `/` login screen
  - `/popup-callback` auth callback handoff
  - `/dashboard` admin dashboard
- Product areas visible in the Figma navigation and layouts:
  - Dashboard
  - Students
  - Teachers
  - Structure
  - Attendance
  - Justifications
  - Alerts
  - Statistics
- Workflow surfaces visible in the Figma:
  - login/auth entry
  - admin dashboard with KPIs, trend chart, recent sessions table, and quick actions
  - justification detail modal with student info, absence details, supporting document preview, administrative comment, and timeline/history
- Treat those areas as one connected system. They should share the same shell, tokens, card primitives, table treatment, badge logic, and action hierarchy.
- Do not redesign each page independently. Navigation, headers, cards, chips, tables, and modal sections must read as one product family.

### Required Figma Flow

1. Run `get_design_context` for the exact node being built.
2. If the node is too large or the response is truncated, run `get_metadata`, then re-fetch only the required child nodes with `get_design_context`.
3. Run `get_screenshot` for the same node to verify visual parity.
4. Translate the Figma output into Angular standalone components and this repo's styling conventions. Do not copy generated React or raw Tailwind output blindly.
5. Before finishing, compare the implemented screen against the Figma screenshot for spacing, borders, shadows, icon sizing, and states.

### Framework And Styling

- The frontend is Angular `21.x` with the Angular application builder configured in `frontend/angular.json`.
- Styling is Tailwind CSS v4 through `@import 'tailwindcss'` and `@theme` in `frontend/src/styles.css`.
- Global theme tokens belong in `frontend/src/styles.css`.
- Component-specific visual behavior belongs in the component stylesheet, as shown by `frontend/src/app/shared/components/toast/toast-outlet.css`.
- Prefer token-backed utility classes in templates. Use component CSS when the styling is complex, animated, layered, or repeated.
- Do not introduce a second styling system.

### Token Rules

- IMPORTANT: Never hardcode hex colors in templates or component class strings.
- IMPORTANT: Never rely on Tailwind default grays (`text-gray-*`, `bg-gray-*`, `border-gray-*`) for final Figma work when a project token should exist.
- Define and use tokens in `frontend/src/styles.css` for:
  - brand colors
  - text colors
  - page and surface backgrounds
  - borders
  - status colors
  - shadows
  - radii
  - spacing primitives that repeat across screens
- The current token set already includes `--font-body`, `--color-background`, `--color-primary`, `--color-secondary`, `--color-principalText`, `--color-secondaryText`, `--color-danger`, `--color-success`, `--color-warning`, `--color-info`, and `--color-onHold`.
- Extend that token set instead of bypassing it. The dashboard design clearly needs additional neutral surface, muted border, and badge tokens.
- When touching existing UI that uses hardcoded utility colors, replace those values with tokens if the work is in scope. Do not preserve inconsistency out of laziness.

### Typography

- Default application typography uses the `Roboto` family defined in `frontend/src/styles.css`.
- Map Figma text styles to semantic usage first: page title, section title, body, caption, label, and badge text.
- If a Figma screen introduces repeatable typography that is not represented yet, add a tokenized utility pattern instead of scattering one-off text sizes like `text-[14px]`.

### Component Organization

- Shared reusable UI components belong in `frontend/src/app/shared/components/`.
- Feature-specific components belong under their owning feature in `frontend/src/app/features/`.
- Reuse existing shared components before creating new ones. Today that includes at least `button` and `toast`.
- If a Figma pattern appears in two or more places, promote it into a shared component instead of duplicating markup.
- Likely shared candidates from the current Figma file are dashboard cards, status badges, icon buttons, top-bar actions, side-nav items, and table shells.

### Angular Implementation Rules For Figma Work

- Build all new UI as standalone Angular components.
- Use `ChangeDetectionStrategy.OnPush`.
- Use `input()` and `output()` for component APIs.
- Prefer signals and `computed()` for local UI state.
- Keep Figma translation logic out of templates when it starts becoming conditional soup; move it into computed values or methods.
- For simple presentational wrappers, prefer inline templates. For larger screens and complex sections, use external HTML and CSS files.

### Assets And Icons

- Store static assets in `frontend/public/assets/`.
- Use `NgOptimizedImage` for static images whenever Angular supports the use case.
- Do not add new icon packages for Figma implementation work. This project already uses Font Awesome and Figma-provided vectors.
- If Figma provides a specific SVG or image asset through MCP, use that asset instead of approximating it with a different icon.
- Name new assets in lowercase kebab-case.

### Layout And Responsive Behavior

- Match the Figma desktop layout first, then adapt down to tablet and mobile without collapsing structure randomly.
- Use the existing Tailwind responsive utilities consistently. Do not mix arbitrary breakpoints unless the design demands it.
- Preserve the Figma information hierarchy: sidebar, top bar, KPI cards, charts, tables, modals, and action sections should remain distinct layout blocks.
- Keep consistent card primitives across dashboard surfaces: shared border color, radius, padding, and shadow treatment.

### Data Display Patterns

- Tables, KPI cards, banners, and status indicators should be implemented as reusable UI patterns, not one-off HTML blocks per page.
- Status presentation must be tokenized. Use semantic states such as success, warning, error, info, and on-hold instead of ad hoc color choices.
- Badge and alert styling must map back to the same token family used by toasts and other system feedback.

### Accessibility And Interaction

- All Figma-derived interactive elements must have visible focus states and keyboard support.
- Icon-only buttons require an accessible name.
- Preserve adequate contrast even if the raw Figma design is weak. Accessibility wins.
- Respect `prefers-reduced-motion` for non-essential animation, following the pattern already used in `toast-outlet.css`.

### Routing And App Structure

- Follow the existing route structure in `frontend/src/app/app.routes.ts`.
- Keep protected admin UI behind the existing auth guard flow.
- Do not bury shared design-system primitives inside feature folders.

### Implementation Smells To Reject

- Do not paste raw MCP-generated code into Angular files without adaptation.
- Do not create large page components full of repeated card, badge, and table markup when those patterns can be extracted.
- Do not ship Figma-perfect visuals with broken semantics or inaccessible controls.
- Do not add one-off arbitrary values when the pattern is clearly reusable.
