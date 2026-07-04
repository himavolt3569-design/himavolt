# HimalHub Architecture & Engineering Principles

This document serves as the central record for major architectural decisions, engineering principles, and patterns used in the HimalHub ecosystem. 

## 1. Design System Architecture (Phase 0)

### Decision: Semantic CSS Variables for Theming
- **Approach**: All colors, typography, elevations, and spacings are driven by CSS variables defined in `src/app/globals.css` (e.g., `--canvas`, `--text-1`, `--brand-primary`). 
- **Reasoning**: It decouples business logic from design. Tailwind classes use these tokens (e.g., `bg-[var(--canvas)]`). This enables instant white-labeling, multi-vertical support (Food vs Hotels), and dynamic user-selected themes without recompiling CSS or sending massive payloads.
- **Alternatives Considered**: Using Tailwind's nested `theme` extensions or CSS-in-JS (Styled Components/Emotion). CSS-in-JS adds runtime overhead, and hardcoded Tailwind themes are difficult to swap dynamically per tenant at runtime.

### Decision: Strict Component Primitives via `cva`
- **Approach**: Base components (Button, Typography, Layout) use `class-variance-authority` (cva) to enforce strict variant constraints.
- **Reasoning**: Prevents arbitrary inline styling (`className="bg-red-500 p-4"`) from polluting the UI. Enforces a finite set of designed states (primary, secondary, ghost) guaranteeing visual consistency.
- **Alternatives Considered**: Accepting raw `className` everywhere. Rejected because it leads to "rogue styling" and technical debt.

### Decision: Radix UI / Headless Primitives
- **Approach**: Complex interactive components (Dialogs, Bottom Sheets, Selects) wrap headless, unstyled accessible primitives like Radix UI or native HTML APIs.
- **Reasoning**: Accessibility (a11y) is a first-class requirement. Building WAI-ARIA compliant focus traps, keyboard navigation, and screen-reader support from scratch for complex components is error-prone. Headless libraries provide the robust JS/a11y logic while giving us 100% control over the CSS variable styling.

### Decision: Composition Over Configuration
- **Approach**: Instead of `<Card image="" title="" actions={[]} />`, we build `<Card>`, `<CardImage>`, `<CardHeader>`, `<CardContent>`.
- **Reasoning**: Keeps the API surface small. When a new vertical needs a card with a rating badge instead of an action button, we don't have to add a new `showRatingBadge={true}` prop to a monolithic component. 

### Decision: CSS Transitions > JS Animation Libraries
- **Approach**: 90% of micro-interactions (hover, active, focus, simple reveals) use native CSS `transition` with custom cubic-bezier timing functions. Framer Motion is reserved strictly for shared-element layout transitions or complex physics-based orchestrations.
- **Reasoning**: Performance. CSS transitions run on the GPU and do not block the main thread. Heavy JS animation libraries increase bundle size and cause interaction latency on low-end mobile devices.

## 2. Directory Structure

```text
src/components/design-system/
├── tokens/               # SCSS/CSS variable definitions (spacing, elevation, typography)
├── primitives/           # Dumb, stateless, highly constrained UI (Button, Text, Layout)
├── composites/           # Stateful, assembled UI components (DatePicker, ListingCard)
└── patterns/             # Vertical-agnostic UX patterns (EmptyStates, Feedback)
```
*Note: This isolation allows the design system to eventually be extracted into its own `@himalhub/ui` package.*

## 3. State Management
- **Approach**: URL parameters act as the single source of truth for global filtering, sorting, and discovery states (e.g., `?adults=2&checkIn=...`).
- **Reasoning**: Enables SSR (Server-Side Rendering) out of the box, provides shareable links, and leverages native browser history (Back/Forward).

*(This document will be updated as new architectural decisions are made.)*
