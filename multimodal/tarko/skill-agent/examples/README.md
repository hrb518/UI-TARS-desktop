# Skill Agent Examples

This directory contains examples demonstrating how to use the Skill Agent.

## Prerequisites

- Node.js 18+
- Bun (for running the examples)
- A valid API key for your chosen model (e.g., OpenAI)

## Setup

1. Install dependencies in the root directory:

```bash
npm install
```

2. Build the skill-agent packages:

```bash
# Build skill-agent-interface
cd ../skill-agent-interface
npm run build

# Build skill-agent
cd ../skill-agent
npm run build
```

3. Create a `.env` file with your API key:

```env
OPENAI_API_KEY=your-api-key-here
```

## Running Examples

### Basic Usage Example

Demonstrates the basic functionality of the Skill Agent:

```bash
cd examples
bun basic-usage.ts
```

### Advanced Usage Example

Demonstrates advanced features like custom skill directories and composite agents:

```bash
cd examples
bun advanced-usage.ts
```

## Creating Custom Skills

To create your own skills, follow these steps:

1. Create a directory structure like:

```
my-skills/
└── my-skill/
    └── SKILL.md
```

2. In the `SKILL.md` file, add frontmatter with skill information:

```yaml
---
name: my-skill
description: A demonstration skill
---

# My Skill

This is a demonstration skill.
```

3. Configure the skill directory in your agent options:

```typescript
const agent = new SkillAgent({
  // ...
  skillDirectories: ['./my-skills']
});
```

## Troubleshooting

### No Skills Loaded

- Check that your skill directories are correctly configured
- Ensure your `SKILL.md` files have valid frontmatter
- Verify that the skill files are accessible

### Skill Not Working

- Check the skill's `SKILL.md` file for correct formatting
- Ensure the skill's functionality is properly implemented
- Check the agent logs for any error messages

## More Information

For more information about the Skill Agent architecture and implementation, see the main documentation.
