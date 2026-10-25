---
title: LLMs
description: The documentation for AI assistants — every page as Markdown, llms.txt and llms-full.txt, Copy page and Open in Claude or ChatGPT, the type declarations of your version.
---

These pages are written for people and coding agents alike. Every one of them is also plain Markdown, the whole site is one file, and the package's types document every export of the version you installed.

## Every page as Markdown

Add `.md` to a page's address: [`/three-map-terrain/materials/`](/three-map-terrain/materials/) is also [`/three-map-terrain/materials.md`](/three-map-terrain/materials.md). The Markdown is the rendered page flattened — components become their text, a live demo becomes its code — and each page points to it with `<link rel="alternate" type="text/markdown">`, so agents that look for it find it.

Above every title, **Copy page** puts that Markdown on the clipboard; its menu also opens it as text, or in a new chat in ChatGPT, Claude, Gemini, GitHub Copilot or Perplexity.

## llms.txt and llms-full.txt

Following [llmstxt.org](https://llmstxt.org):

| File                                                 | What                                                                      | For                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [`/llms.txt`](/three-map-terrain/llms.txt)           | The index: the library in a sentence, then every page with its summary    | An agent that fetches what it needs — give it this address                |
| [`/llms-full.txt`](/three-map-terrain/llms-full.txt) | Every page in one Markdown file, in the order of the guide (about 100 KB) | A model with a long context, a tool that indexes docs by URL, offline use |

The guide comes first in both, the reference after it. Prompts that work:

```text
Read https://whidrubeld.github.io/three-map-terrain/llms.txt, then add
OpenStreetMap buildings and roads to the map in src/scene.ts.
```

```text
Using https://whidrubeld.github.io/three-map-terrain/layers/vegetation.md,
plant orchards with low trees on my map.
```

## The API of your version

The pages describe the latest release. The package's type declarations describe the one you installed — every export with its documentation comment: `node_modules/three-map-terrain/dist/index.d.ts`, or [the latest on unpkg](https://unpkg.com/three-map-terrain/dist/index.d.ts). An agent unsure of an option's name or a signature should read them before guessing.

## The agent skill

For agents that load skills — Claude Code, Codex, Cursor and many more — [the skill](/three-map-terrain/skill/) is this documentation's essentials in one file: the model, recipes, pitfalls, and where to read more. One command installs it:

```bash
npx skills add whidrubeld/three-map-terrain
```
