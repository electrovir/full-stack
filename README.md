# full-stack

A full-stack web application template with a monorepo structure.

## Usage

After cloning this template, search the entire codebase for **`YOU SHOULD UPDATE THIS`** to find all the places that need to be customized for your project. These markers appear as comments in TypeScript, HTML, YAML, and other files.

Some files (like `package.json` and `LICENSE-MIT`) don't support comments, so those customization points are listed below.

### Files without comment support (update manually)

| File                      | What to update                                                        |
| ------------------------- | --------------------------------------------------------------------- |
| `package.json` (root)     | `name`, `homepage`, `bugs`, `repository`, `license`, `author`         |
| `packages/*/package.json` | npm scope (`@evir` -> your scope) in `name` and dependency references |
| `LICENSE-MIT`             | Replace with your license                                             |
| `LICENSE-CC0`             | Replace with your license                                             |
