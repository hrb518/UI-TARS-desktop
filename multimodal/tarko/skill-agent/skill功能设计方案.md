# Skill 功能设计方案

## 1. 设计背景

参考 `mcp-agent` 和 `mcp-agent-interface` 的实现结构，以及 `skill-agent` 中的参考实现，设计一套完整的 Skill 功能体系，用于加载、管理和使用各种技能。

## 2. 设计目标

- 实现 Skill 的自动发现和加载机制
- 提供统一的 Skill 管理接口
- 支持从多个目录加载 Skill
- 与现有的 Agent 体系集成
- 提供清晰的类型定义和错误处理

## 3. 目录结构

```
skill-agent/
├── src/
│   ├── index.ts
│   ├── skill-agent.ts
│   ├── skill-types.ts
│   └── skill-manager.ts
├── .gitignore
├── README.md
├── package.json
├── rslib.config.ts
└── tsconfig.json

skill-agent-interface/
├── src/
│   └── index.ts
├── .gitignore
├── README.md
├── package.json
├── rslib.config.ts
└── tsconfig.json
```

## 4. 核心组件设计

### 4.1 Skill 类型定义 (`skill-agent-interface`)

```typescript
import { AgentOptions, CommonFilterOptions } from '@tarko/agent-interface';

export type * from '@tarko/agent-interface';

/**
 * Skill 过滤选项
 */
export interface SkillFilterOptions extends CommonFilterOptions {}

/**
 * Skill Agent 选项
 */
export interface SkillAgentOptions extends AgentOptions {
  /**
   * Skill 目录配置
   */
  skillDirectories?: string[];

  /**
   * Skill 过滤选项
   */
  skillFilter?: SkillFilterOptions;

  /**
   * 是否禁用 Claude 技能
   * @defaultValue false
   */
  disableClaudeSkills?: boolean;
}

/**
 * Skill 信息
 */
export interface SkillInfo {
  name: string;
  description: string;
  location: string;
}

/**
 * Skill 注册中心
 */
export interface SkillRegistry {
  [skillName: string]: SkillInfo;
}
```

### 4.2 Skill 管理器 (`skill-manager.ts`)

```typescript
import z from "zod";
import { Filesystem } from "@/util/filesystem";
import { Global } from "@/global";
import { Log } from "../util/log";
import { Config } from "../config/config";
import { Instance } from "../project/instance";
import { ConfigMarkdown } from "../config/markdown";
import { Bus } from "@/bus";
import { Session } from "@/session";
import { NamedError } from "@opencode-ai/util/error";
import { SkillInfo, SkillRegistry } from "../skill-types";

export class SkillManager {
  private static log = Log.create({ service: "skill-manager" });
  
  private static readonly OPENCODE_SKILL_GLOB = new Bun.Glob("{skill,skills}/**/SKILL.md");
  private static readonly CLAUDE_SKILL_GLOB = new Bun.Glob("skills/**/SKILL.md");

  /**
   * Skill 信息验证模式
   */
  private static readonly SkillInfoSchema = z.object({
    name: z.string(),
    description: z.string(),
    location: z.string(),
  });

  /**
   * 加载所有 Skill
   */
  static async loadSkills(disableClaudeSkills: boolean = false): Promise<SkillRegistry> {
    const skills: SkillRegistry = {};

    // 加载 Claude 技能
    if (!disableClaudeSkills) {
      await this.loadClaudeSkills(skills);
    }

    // 加载 Opencode 技能
    await this.loadOpencodeSkills(skills);

    return skills;
  }

  /**
   * 加载 Claude 技能
   */
  private static async loadClaudeSkills(skills: SkillRegistry): Promise<void> {
    // 扫描 .claude/skills/ 目录（项目级别）
    const claudeDirs = await Array.fromAsync(
      Filesystem.up({
        targets: [".claude"],
        start: Instance.directory,
        stop: Instance.worktree,
      }),
    );

    // 还包括全局 ~/.claude/skills/
    const globalClaude = `${Global.Path.home}/.claude`;
    if (await Filesystem.isDir(globalClaude)) {
      claudeDirs.push(globalClaude);
    }

    for (const dir of claudeDirs) {
      const matches = await Array.fromAsync(
        this.CLAUDE_SKILL_GLOB.scan({
          cwd: dir,
          absolute: true,
          onlyFiles: true,
          followSymlinks: true,
          dot: true,
        }),
      ).catch((error) => {
        this.log.error("failed .claude directory scan for skills", { dir, error });
        return [];
      });

      for (const match of matches) {
        await this.addSkill(skills, match);
      }
    }
  }

  /**
   * 加载 Opencode 技能
   */
  private static async loadOpencodeSkills(skills: SkillRegistry): Promise<void> {
    // 扫描 .opencode/skill/ 目录
    for (const dir of await Config.directories()) {
      for await (const match of this.OPENCODE_SKILL_GLOB.scan({
        cwd: dir,
        absolute: true,
        onlyFiles: true,
        followSymlinks: true,
      })) {
        await this.addSkill(skills, match);
      }
    }
  }

  /**
   * 添加技能到注册表
   */
  private static async addSkill(skills: SkillRegistry, match: string): Promise<void> {
    const md = await ConfigMarkdown.parse(match).catch((err) => {
      const message = ConfigMarkdown.FrontmatterError.isInstance(err)
        ? err.data.message
        : `Failed to parse skill ${match}`;
      Bus.publish(Session.Event.Error, { error: new NamedError.Unknown({ message }).toObject() });
      this.log.error("failed to load skill", { skill: match, err });
      return undefined;
    });

    if (!md) return;

    const parsed = this.SkillInfoSchema.pick({ name: true, description: true }).safeParse(md.data);
    if (!parsed.success) return;

    // 警告重复的技能名称
    if (skills[parsed.data.name]) {
      this.log.warn("duplicate skill name", {
        name: parsed.data.name,
        existing: skills[parsed.data.name].location,
        duplicate: match,
      });
    }

    skills[parsed.data.name] = {
      name: parsed.data.name,
      description: parsed.data.description,
      location: match,
    };
  }

  /**
   * 过滤技能
   */
  static filterSkills(
    skills: SkillRegistry,
    filterOptions?: SkillFilterOptions
  ): SkillRegistry {
    if (!filterOptions || (!filterOptions.include && !filterOptions.exclude)) {
      return skills;
    }

    // 转换技能注册表为可过滤项
    const skillItems = Object.entries(skills).map(([name, info]) => ({
      name,
      info,
    }));

    // 应用过滤
    const filteredSkills = filterItems(skillItems, filterOptions, 'Skills');

    // 转换回注册表格式
    const filteredRegistry: SkillRegistry = {};
    filteredSkills.forEach(({ name, info }) => {
      filteredRegistry[name] = info;
    });

    return filteredRegistry;
  }
}
```

### 4.3 Skill Agent (`skill-agent.ts`)

```typescript
import { Agent, Tool } from '@tarko/agent';
import type { JSONSchema7 } from '@tarko/agent';
import { SkillAgentOptions, SkillRegistry } from './skill-types';
import { SkillManager } from './skill-manager';
import { filterItems } from '@tarko/shared-utils';

export class SkillAgent<T extends SkillAgentOptions = SkillAgentOptions> extends Agent<T> {
  static label = '@tarko/skill-agent';
  private skills: SkillRegistry = {};

  constructor(options: SkillAgentOptions) {
    // 使用基础选项创建新的 agent
    super(options);
  }

  async initialize(): Promise<void> {
    // 加载技能
    const allSkills = await SkillManager.loadSkills(this.options.disableClaudeSkills);

    // 应用技能过滤
    this.skills = SkillManager.filterSkills(
      allSkills,
      this.options.skillFilter
    );

    // 注册技能工具
    this.registerSkillTools();

    this.logger.success(`✅ Loaded ${Object.keys(this.skills).length} skills`);

    super.initialize();
  }

  /**
   * 注册技能工具
   */
  private registerSkillTools(): void {
    for (const [skillName, skillInfo] of Object.entries(this.skills)) {
      const tool = new Tool({
        id: `skill_${skillName}`,
        description: `Skill: ${skillInfo.description}`,
        parameters: {
          type: 'object',
          properties: {
            input: {
              type: 'string',
              description: 'Input for the skill',
            },
          },
          required: ['input'],
        } as JSONSchema7,
        function: async (args: Record<string, unknown>) => {
          // 这里实现技能的调用逻辑
          // 暂时返回一个占位符
          return `Skill ${skillName} called with input: ${args.input}`;
        },
      });

      this.registerTool(tool as unknown as Tool);
    }
  }

  /**
   * 获取所有技能
   */
  getSkills(): SkillRegistry {
    return this.skills;
  }

  /**
   * 获取单个技能
   */
  getSkill(name: string): SkillRegistry[string] | undefined {
    return this.skills[name];
  }
}
```

### 4.4 入口文件 (`index.ts`)

```typescript
import { SkillAgent } from './skill-agent';
export * from './skill-types';
export { SkillAgent };
export default SkillAgent;
```

## 5. 集成方案

### 5.1 与现有 Agent 集成

可以通过以下方式与现有的 Agent 集成：

```typescript
import { SkillAgent } from '@tarko/skill-agent';

const agent = new SkillAgent({
  name: 'my-skill-agent',
  description: 'Agent with skill support',
  model: 'gpt-4o',
  skillDirectories: [
    './skills',
    '~/.opencode/skills'
  ],
  skillFilter: {
    include: ['math', 'weather']
  }
});

await agent.initialize();

// 使用技能
const result = await agent.run('Calculate 2 + 2 using the math skill');
console.log(result);
```

### 5.2 与 MCP Agent 集成

可以创建一个复合 Agent，同时支持 MCP 和 Skill 功能：

```typescript
import { MCPAgent } from '@tarko/mcp-agent';
import { SkillAgent } from '@tarko/skill-agent';

class CompositeAgent extends MCPAgent {
  private skillAgent: SkillAgent;

  constructor(options: any) {
    super(options);
    this.skillAgent = new SkillAgent(options);
  }

  async initialize(): Promise<void> {
    await super.initialize();
    await this.skillAgent.initialize();

    // 合并技能工具到当前 Agent
    const skillTools = this.skillAgent.getTools();
    for (const tool of skillTools) {
      this.registerTool(tool);
    }
  }
}
```

## 6. 实现计划

1. 创建 `skill-agent-interface` 目录和相关文件
2. 实现 `skill-agent-interface` 中的类型定义
3. 创建 `skill-agent` 目录和相关文件
4. 实现 `skill-manager.ts` 中的技能管理功能
5. 实现 `skill-agent.ts` 中的 Skill Agent 类
6. 实现 `index.ts` 入口文件
7. 编写测试用例
8. 编写文档

## 7. 技术依赖

- `@tarko/agent` - 基础 Agent 实现
- `@tarko/agent-interface` - Agent 接口定义
- `@tarko/shared-utils` - 共享工具函数
- `zod` - 数据验证
- `@opencode-ai/util/error` - 错误处理
- `@/util/filesystem` - 文件系统操作
- `@/global` - 全局配置
- `@/util/log` - 日志工具
- `@/config/config` - 配置管理
- `@/project/instance` - 项目实例管理
- `@/config/markdown` - Markdown 配置解析
- `@/bus` - 事件总线
- `@/session` - 会话管理

## 8. 注意事项

- 确保技能的加载路径正确，避免重复加载
- 处理技能解析错误，确保系统稳定性
- 实现合理的技能过滤机制，提高系统性能
- 与现有 Agent 体系保持兼容
- 提供清晰的错误信息和日志

## 9. 未来扩展

- 支持技能的热加载和卸载
- 实现技能的版本管理
- 提供技能的评分和推荐机制
- 支持技能的远程加载
- 实现技能的依赖管理

## 10. 结论

本设计方案参考了 `mcp-agent` 和 `mcp-agent-interface` 的结构，以及 `skill-agent` 中的参考实现，提供了一套完整的 Skill 功能体系。通过这种设计，可以方便地加载、管理和使用各种技能，为 Agent 提供更丰富的能力。