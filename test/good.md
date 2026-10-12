# frobnicate

Turn CSV files into SQLite databases with one command. For people who
want to query spreadsheets with SQL without importing anything by hand.

![demo](demo.gif)

## Install

```bash
npm install -g frobnicate
```

## Usage

```bash
frobnicate data.csv -o data.db
sqlite3 data.db "select * from data limit 5"
```

Handles headers, type inference, and files up to a few hundred MB.

## Features

- Infers column types: integers, reals, dates, and text
- Streams input, so memory stays flat on large files
- `--table` flag to name the table, `--index` to add one after import
- Works with stdin: `cat data.csv | frobnicate - -o out.db`

## How it works

frobnicate reads the CSV header row, samples the first thousand lines to
guess a type per column, then streams the rest of the file into SQLite in
a single transaction. Bad rows are collected and reported at the end,
never silently dropped. Dates are stored as ISO strings so they stay
comparable as text.

## Docs

See [the guide](docs/guide.md) for flags and config.

## License

MIT
