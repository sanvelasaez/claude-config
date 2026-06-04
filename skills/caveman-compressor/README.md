# caveman-compressor

Token compression skill for Claude responses. Reduce output size by 57-75% while maintaining 100% technical precision.

## Quick Start

```
/caveman              # Compress last response (ultra mode, default)
/caveman lite         # Lite mode (30-40% reduction)
/caveman full         # Full mode (60-75% reduction)
```

## Files

- **SKILL.md** — Main skill definition and documentation
- **evals/** — Evaluation data and benchmarks
  - `evals.json` — Test case definitions
  - `iteration-1/` — Results from iteration 1 (lite and ultra modes)

## Compression Modes

| Mode | Reduction | Best For |
|---|---|---|
| **lite** | 30-40% | Natural readability, casual responses |
| **full** | 60-75% | Technical writing, code reviews |
| **ultra** | 57-75% | Maximum savings, research, analysis |

## Status

✅ **Lite Mode** — Production ready (35.2% reduction)  
✅ **Ultra Mode** — Production ready (57% reduction)  
⚠️ **Full Mode** — Iteration 2 (needs tuning, 26.7% reduction)

## How It Works

1. User types `/caveman` after any response
2. Skill re-compresses response in chosen mode
3. Statistics shown (% reduction, tokens saved)

Compression preserves:
- Code blocks (unchanged)
- Technical terms and names
- Logical connectors
- Critical qualifiers

## Development

See `evals/iteration-1/benchmark.json` for detailed results.

Next iteration: Improve full mode to reach 60-75% target.
