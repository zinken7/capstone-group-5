# Frontend

React and TypeScript frontend for the Autonomous Mining Equipment Market Map.

## Requirements

- Node.js 22
- npm

## Getting started

```sh
npm ci
npm run dev
```

Vite will print the local development URL in the terminal.

## Available scripts

- `npm run dev` starts the development server.
- `npm run build` type-checks and creates a production build in `dist/`.
- `npm run lint` runs ESLint with zero warnings allowed.
- `npm run typecheck` checks TypeScript without producing build output.
- `npm run preview` serves the production build locally.

## Source structure

The frontend uses feature-based organization. Planned directories are tracked
with `.gitkeep` so every team member starts from the same structure. Remove a
directory's `.gitkeep` after adding its first real file.

```text
src/
├── app/            # Application-wide router and providers
├── assets/         # Images, icons, and other static imports
├── components/ui/  # Reusable, domain-agnostic UI components
├── features/       # Code owned by a single product feature
├── layouts/        # Shared page layouts
├── lib/api/        # Shared HTTP client and API configuration
├── styles/         # Global styles and design tokens
├── types/          # Types shared across multiple features
├── App.tsx
└── main.tsx
```

Feature boundaries are `equipment`, `map`, `dashboard`, and `submissions`. Keep
feature-specific components, hooks, API functions, and types inside their
feature. Move code into a shared directory only after it is used by more than
one feature.

Tests should live next to the code they cover, for example
`EquipmentCard.test.tsx` beside `EquipmentCard.tsx`.
