# Playwright Regression Test Guard Rails

## Default Rule
- Treat Playwight tests as regression contracts.
- Do NOT modify tests or snapshots unless explicitly asked.

## When UI changes may break tests
1) Identify tests likely to fail.
2) Suggest UI adjustments that preserve selectors.
3) Ask for permission before updating tests.

## Selector Strategy
- Prefer getByRole and accessible selectors.
- Prefer data-testid over CSS classes.
- Do not rely on DOM structure or nth-child selectors.
