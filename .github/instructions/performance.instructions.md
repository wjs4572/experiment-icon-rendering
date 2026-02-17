# Performance Guard Rails

## Rendering
- Avoid unnecessary re-renders.
- Keep DOM structure efficient.

## Loading Strategy
- Lazy load large components and routes.
- Avoid render-blocking scripts.

## Performance Experiment Exception
- If the repository is performing performance benchmarks or rendering comparisons, do NOT optimize assets or loading behavior unless asked.
- Do not replace image formats, compress assets, or change loading strategy when doing performance measurements.
- Preserve experimental conditions so results remain valid.

## Assets (non-experimental code)
- Optimize images and use modern formats.
- Avoid loading large assets above the fold.
