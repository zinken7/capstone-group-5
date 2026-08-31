# Backend

Express and TypeScript backend for the Autonomous Mining Equipment Market Map.

## Requirements

- Node.js 22
- npm

## Getting started

```sh
npm ci
npm run dev
```

The API starts on `http://localhost:3000` by default. Use the `PORT` environment
variable to select another port.

## Available scripts

- `npm run dev` starts the API with automatic reloads.
- `npm run build` compiles TypeScript into `dist/`.
- `npm start` runs the compiled server.
- `npm run lint` runs ESLint with zero warnings allowed.
- `npm run typecheck` checks TypeScript without producing build output.

## Health check

```text
GET /health
```
