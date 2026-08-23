# UI Coding Standards

## Components

- All UI must be built from **shadcn components** (`src/components/ui/`, added via the shadcn CLI). Do not hand-write custom components — no bespoke buttons, inputs, cards, date pickers, etc.
- If a screen needs a component that isn't installed yet, add it with the CLI (`npx shadcn add <component>`) and then compose the page from it. Do not write a one-off replacement instead.
- Compose feature UI directly out of shadcn primitives in the page/route file rather than wrapping them in new custom components. If a shadcn primitive needs project-specific configuration (variant, className, default props), configure it inline at the call site.
- Native HTML form elements (`<input>`, `<select>`, plain `<button>`, etc.) must not be used directly in feature UI — use the shadcn equivalent instead.
  - Date selection uses the shadcn `Calendar` + `Popover` pattern (see the [shadcn Date Picker recipe](https://ui.shadcn.com/docs/components/date-picker)), not a native `<input type="date">`.

## Date formatting

- All date display goes through [`date-fns`](https://date-fns.org/) — do not use `Intl.DateTimeFormat`, `Date.prototype.toLocaleDateString`, or hand-rolled formatting.
- Standard display format is ordinal day + abbreviated month + full year, produced with the `date-fns` format string `"do MMM yyyy"`:

  ```ts
  import { format } from "date-fns";

  format(new Date("2026-09-01"), "do MMM yyyy"); // "1st Sep 2026"
  format(new Date("2026-08-02"), "do MMM yyyy"); // "2nd Aug 2026"
  format(new Date("2026-10-03"), "do MMM yyyy"); // "3rd Oct 2026"
  ```

- Use this format consistently anywhere a date is shown to the user (workout dates, timestamps, etc.), unless a specific screen has an explicitly documented exception.
