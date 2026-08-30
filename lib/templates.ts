import type { DocFileName } from "./types";

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  files: Record<DocFileName, string>;
};

export function fill(template: string, vars: { name: string }): string {
  return template.replaceAll("{{name}}", vars.name);
}

const README_WEB = `# {{name}}

Local-first web project tracked in ProjectHub.

## What this is

A short, honest description. One paragraph is enough.

## How to run

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Status

- [ ] First useful slice works
- [ ] README matches reality
- [ ] Ready to share

## See also

- [[PRODUCT]] — product brief
- [[AGENTS]] — working agreement
`;

const PRODUCT_WEB = `# Product: {{name}}

## Problem

Who is this for, and what are they already doing that does not work?

## Promise

After using this, they can ________.

## Non-goals

What we are not building in this pass.

## Next slice

The smallest thing that would make this worth opening tomorrow.
`;

const AGENTS_WEB = `# Agent notes: {{name}}

## Working directory

This repo.

## Do

- Keep changes small and reversible
- Update this file when the working agreement changes
- Prefer existing patterns over new abstractions

## Do not

- Rewrite the app unless asked
- Commit secrets or local paths that only exist on one machine

## Current focus

Write the next concrete task here.
`;

const README_LIB = `# {{name}}

A small library. Say what it exports and why someone would import it.

## Install

\`\`\`bash
pnpm add {{name}}
\`\`\`

## Usage

\`\`\`ts
import { something } from "{{name}}";
\`\`\`

## Status

Early. APIs may move.

## See also

- [[PRODUCT]] — product brief
- [[AGENTS]] — working agreement
`;

const PRODUCT_LIB = `# Product: {{name}}

## Audience

Developers who need ________.

## API surface

List the 3 functions or types that matter.

## Compatibility

Runtime, Node version, browser support.

## Release bar

What must be true before this is not an experiment.
`;

const AGENTS_LIB = `# Agent notes: {{name}}

## Shape

Keep the public API small. Tests should cover the exported surface.

## Do not

- Add a framework unless the library needs one
- Break exports without a note in README
`;

const README_EXPERIMENT = `# {{name}}

An experiment. The point is to learn something, not to ship a company.

## Hypothesis

If I ________, then ________.

## How to run

Document the one command that boots this.

## Keep / kill

After a week: keep, park, or delete.

## See also

- [[PRODUCT]] — experiment notes
- [[AGENTS]] — working agreement
`;

const PRODUCT_EXPERIMENT = `# Experiment notes: {{name}}

## What I am testing

One question.

## What would make this real

The signal that this should become a product.

## What I will ignore

Scope that can wait.
`;

const AGENTS_EXPERIMENT = `# Agent notes: {{name}}

This is a sandbox. Prefer speed and clarity over polish.

## Guardrails

- Do not invent a design system
- Leave a README that a future me can resume from
`;

const README_AGENT = `# {{name}}

An agent or MCP-style project. Say what it can do in one sentence.

## Tools

- tool: what it does

## Setup

\`\`\`bash
pnpm install
pnpm dev
\`\`\`

## Safety

What this agent must never do.

## See also

- [[PRODUCT]] — product brief
- [[AGENTS]] — working agreement
`;

const PRODUCT_AGENT = `# Product: {{name}}

## Job to be done

The user wants the agent to ________ so they can ________.

## Tools and data

What it can read, write, or call.

## Failure mode

What happens when it is wrong, and how a human takes over.
`;

const AGENTS_AGENT = `# Agent notes: {{name}}

## Role

You are helping with {{name}}. Stay inside the tools and paths listed here.

## Allowed actions

List them.

## Forbidden actions

Secrets, destructive commands, and anything outside this repo.
`;

const README_BLANK = `# {{name}}

What is this project, in two sentences.

## Next

- [ ] Write the real README

## See also

- [[PRODUCT]]
- [[AGENTS]]
`;

const PRODUCT_BLANK = `# Product: {{name}}

## Why this exists

## Who it is for

## Next slice
`;

const AGENTS_BLANK = `# Agent notes: {{name}}

Working agreement for humans and coding agents in this repo.

## Current task

`;

export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty README, PRODUCT, and AGENTS files. Your structure, your words.",
    files: { "README.md": README_BLANK, "PRODUCT.md": PRODUCT_BLANK, "AGENTS.md": AGENTS_BLANK },
  },
  {
    id: "web-app",
    name: "Web app",
    description: "Local web product: how to run it, what it promises, how agents should work.",
    files: { "README.md": README_WEB, "PRODUCT.md": PRODUCT_WEB, "AGENTS.md": AGENTS_WEB },
  },
  {
    id: "library",
    name: "Library",
    description: "A package others might install. API-first docs.",
    files: { "README.md": README_LIB, "PRODUCT.md": PRODUCT_LIB, "AGENTS.md": AGENTS_LIB },
  },
  {
    id: "experiment",
    name: "Experiment",
    description: "A parked idea you might kill. Hypothesis, keep/kill, no ceremony.",
    files: { "README.md": README_EXPERIMENT, "PRODUCT.md": PRODUCT_EXPERIMENT, "AGENTS.md": AGENTS_EXPERIMENT },
  },
  {
    id: "agent",
    name: "Agent / MCP",
    description: "Tools, setup, and hard limits for an agent project.",
    files: { "README.md": README_AGENT, "PRODUCT.md": PRODUCT_AGENT, "AGENTS.md": AGENTS_AGENT },
  },
];

export function getTemplate(id: string | null | undefined): ProjectTemplate {
  return PROJECT_TEMPLATES.find((item) => item.id === id) || PROJECT_TEMPLATES[0];
}

export function renderTemplateFiles(templateId: string | null | undefined, name: string): Record<DocFileName, string> {
  const template = getTemplate(templateId);
  const vars = { name };
  return {
    "README.md": fill(template.files["README.md"], vars),
    "PRODUCT.md": fill(template.files["PRODUCT.md"], vars),
    "AGENTS.md": fill(template.files["AGENTS.md"], vars),
  };
}

export function listTemplates(): ProjectTemplate[] {
  return PROJECT_TEMPLATES.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    files: item.files,
  }));
}
