# Database Normal Forms — Interactive Blueprint

An interactive, click-to-normalize explainer for Database Normal Forms 1NF, 2NF, and 3NF, built as a single-file React artifact.

## What it does

- Explains what normalization is and when you actually need to care about it.
- Three tabs — one per normal form — each with:
  - A plain-language breakdown: **what happens**, **when to use it**, **tradeoff**.
  - A live "before" table that visibly violates that normal form, with the offending duplicated/repeating values highlighted.
  - A **Normalize** button that splits the table exactly the way that rule requires, with the new/moved values highlighted.
  - A **Reset** button to replay it.

## The three examples

| Form | Problem shown | Fix |
|---|---|---|
| **1NF** | An `orders` row stores multiple products in one comma-separated cell (repeating group). | Split into one atomic row per product. |
| **2NF** | An `order_items` table (composite key: `order_id` + `product_id`) repeats `product_name` / `product_price` on every order line — those columns only depend on `product_id`, not the whole key (partial dependency). | Move `product_name` / `product_price` into a separate `products` table. |
| **3NF** | A `customers` table repeats `city` for every customer sharing a `zip_code` — `city` really depends on `zip_code`, not directly on `customer_id` (transitive dependency). | Move `city` into a separate `zip_codes` lookup table. |

## Files

| File | Purpose |
|---|---|
| `normal-forms-blueprint.jsx` | The React component. Self-contained — styles, data, and logic all in one file. |


## Design notes

- Same engineering-blueprint visual language as the companion SCD (Slowly Changing Dimensions) blueprint — navy grid background, cyan rules, amber "redline" highlights, corner registration marks, IBM Plex Mono / IBM Plex Sans.
- **Responsive tables**: below the `sm` breakpoint, every table renders as stacked label/value cards instead of a wide table — no reliance on horizontal scrolling, since mobile browsers hide scrollbars by default.
- **Multi-table results**: 2NF and 3NF split one table into two. On `sm`+ screens the resulting tables sit side by side; on mobile they stack vertically, each still rendering as cards.
- **Data model**: each tab's `tablesFor*NF(applied)` function returns an array of `{ caption, columns, rows }` table specs, rendered by a shared `RecordTable` component — the same pattern used in the SCD blueprint, so the two artifacts share structure and are easy to keep in sync.

## Extending it

- To swap in your own example, edit the `tablesFor1NF` / `tablesFor2NF` / `tablesFor3NF` functions and the matching `action` string in `COPY`.
- To add BCNF, 4NF, or 5NF, add an entry to `TABS`, `COPY`, and a new `tablesForXNF` builder, then register it in `TABLE_BUILDERS`.

## Local development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`