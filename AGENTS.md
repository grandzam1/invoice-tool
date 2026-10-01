# Portal mobile kit — agent rules

## Always

- Prefer tokens from the host theme / CSS vars over hardcoded colors, widths, or nav labels.
- Reuse primitives (`FormField`, `SelectableCard`, `PageHero`, `CalloutCard`, `PortalPageHeader`) instead of one-off page markup.
- On mobile: `min-w-0`, `max-w-full`, `overflow-x-clip` on shell content; scroll wide tables **inside** a container.
- Bottom tab bar only on primary destinations, and only when the tab config has 2 or more items.
- Focused pages: hide tab bar + pass `back={{ href, label }}` (top-left, centered title). Never leave browser-back as the only escape.
- Toasts: neutral chrome; type color on icons only (no `richColors` green/red surfaces).

## Never

- Copy product domain pages (deposits, membership, billing) into this kit.
- Assume Laravel/Inertia — treat React pieces as an adapter; links are plain `<a>` unless the host app swaps them.

## This project (invoice-tool)

- The standalone invoice page (`/invoice/:id`) and the print page (`/invoices/:id/print`) stay outside `#portal-shell`. No tab bar, header, or shell padding on those screens.
- Do not put invoice, template, or editor domain code into the portal kit files under `src/adapters/react/`.
