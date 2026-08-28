---
name: write-neot-docs
description: Write, edit, review, or add NEOT documentation pages, MDX content, documentation SVGs, sidebar entries, and page navigation under apps/neot/web/src/modules/docs. Use for every change to the NEOT Documentation workspace.
---

# Write NEOT Docs

## Required naming rule

- Use `Logicx Software India P Ltd` only on the Architecture page and its Architecture visual.
- Use `Company` for the organization on every other documentation page and visual.
- Do not use the full legal company name in page titles, descriptions, alt text, tables, examples, or metadata outside Architecture.
- Keep product names exact: `Project A`, `Project B`, `Project C`, and `Project N`.

## Product definition approval rule

- Treat every product purpose, industry, user group, workflow, capability, and scope as undefined by default.
- Do not infer a product definition from its name, domain, existing code, earlier text, or another product.
- Add or keep a product definition only when the owner explicitly approves or customizes that definition.
- When approval is absent, use: `Purpose, users, scope, and capabilities need owner approval.`
- Apply this rule to page text, tables, examples, diagrams, alt text, descriptions, labels, and metadata.
- Product names can appear without defining what the products do.

## Writing rules

- Use short, direct sentences for junior developers.
- Explain ownership, inputs, actions, outputs, checks, and approval points.
- Keep product business rules inside the product boundary.
- Describe shared platform capabilities without merging independent products.
- State planned or undefined behavior honestly.
- Keep credentials, secrets, and private data out of documentation examples.

## Page workflow

1. Read the current page, `docs.registry.ts`, and `docs.workspace.tsx`.
2. Search all Docs content for naming-rule violations.
3. Add or edit the MDX page under `content/`.
4. Import SVG assets through MDX so the production build emits them.
5. Register new pages in reading order under the correct group.
6. Keep Previous and Next navigation derived from the registry.
7. Preserve responsive behavior and accessible alt text.

## Visual rules

- Add one teaching visual to every documentation page. Use a diagram, flow chart, annotated image, or short visual note.
- Select a visual that explains a relationship, boundary, decision, sequence, or expected behavior.
- Do not add a decorative image that does not teach the reader.
- Add a short note below each visual. Tell the reader where to start and what the visual explains.
- Use responsive SVGs for architecture and flow diagrams.
- Keep connector lines and arrowheads outside all labels and cards.
- Leave visible space between labels, connector lines, arrowheads, cards, and converging paths.
- Split a connector around a centered label when the connector and label use the same lane.
- Use consistent card spacing, typography, colors, and arrow direction.
- Render each changed SVG and inspect spacing, alignment, clipping, contrast, and flow.

## Validation

Run the Docs formatting check, NEOT web typecheck, NEOT web lint, and platform web production build. Report only checks that ran.
