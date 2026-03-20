# Vali-Mediator Docs

Documentation site for [Vali-Mediator](https://www.nuget.org/packages/Vali-Mediator) — a lightweight .NET mediator library with full CQRS support, built-in Result pattern, extensible pipeline, and an optional ecosystem of packages for resilience, caching, observability, and idempotency.

Built with [Docusaurus 3](https://docusaurus.io/) and deployed to GitHub Pages.

---

## Packages

| Package | Description |
|---|---|
| `Vali-Mediator` | Core: mediator, pipeline, result pattern |
| `Vali-Mediator.AspNetCore` | Maps `Result<T>` to HTTP responses |
| `Vali-Mediator.Resilience` | Retry, Circuit Breaker, Timeout, Bulkhead, Hedge, Rate Limiter, Chaos, Fallback |
| `Vali-Mediator.Caching` | Declarative pipeline caching |
| `Vali-Mediator.Observability` | OpenTelemetry tracing, metrics, observers |
| `Vali-Mediator.Idempotency` | Idempotent request deduplication |

---

## Local Development

**Requirements:** Node >= 20, [Bun](https://bun.sh/)

```bash
bun install
bun run start
```

Opens a dev server at `http://localhost:3000` with live reload.

## Build

```bash
bun run build
```

Generates static output to the `build/` directory.

## Deploy

```bash
GIT_USER=<your-github-username> bun run deploy
```

Builds the site and pushes to the `gh-pages` branch for GitHub Pages hosting.

---

## Project Structure

```
docs/          # Documentation markdown files
src/           # React pages and custom CSS
static/        # Static assets (images, icons)
docusaurus.config.ts  # Site configuration, SEO, navbar, footer
sidebars.ts    # Sidebar navigation structure
```

---

## Author

**Felipe Rafael Montenegro Morriberon**
