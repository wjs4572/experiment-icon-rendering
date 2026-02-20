## Change control for "fix" requests

- When I ask you to "fix" something (bug, failing build, failing test, broken UI, regression, performance issue, etc.), do not implement changes immediately.
- First, identify the likely root cause(s) and clearly state what you think is happening.
- Then propose 1 to 3 distinct fix options.
- For each option, list pros and cons (including risk, scope, and likely side effects).
- Ask me which option to pursue.
- Only after I explicitly choose an option may you implement the fix.

## Side effects and approval gate

- Before making any change, explicitly call out any expected or plausible side effects, even if they are unlikely.
- If the change could introduce unexpected behavior, alter user flows, change data contracts, affect performance, impact accessibility, modify dependencies, change tests, or affect security, pause and ask for approval before proceeding.
- If side effects are discovered during implementation, stop and report them immediately, then ask for approval before continuing.
