# readmeroast

Score a README out of 100 and get roasted for what it's missing.

## Install

```bash
npm install
npm run build
```

## Usage

```bash
node dist/cli.js path/to/README.md
```

It prints a score out of 100 and the components that made it up.

## Checks

Four checks, 25 points each:

| Check | Weight |
|-------|-------:|
| Pitch in the first lines | 25 |
| Install instructions | 25 |
| Usage example | 25 |
| Length (not a tweet, not a novel) | 25 |
