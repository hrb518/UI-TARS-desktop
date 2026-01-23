/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agent, Tool } from '@tarko/agent';
import type { JSONSchema7 } from '@tarko/agent';
import { SkillAgentOptions, SkillRegistry } from './skill-types';
import { SkillManager } from './skill-manager';

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

      this.registerTool(tool);
    }
  }

  /**
   * 调用工具
   */
  async callTool(toolId: string, args: Record<string, unknown>): Promise<any> {
    const tool = this.getTool(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }
    return tool.function(args);
  }

  /**
   * 获取工具
   */
  getTool(toolId: string): any {
    const tools = this.getTools();
    return tools.find(tool => tool.id === toolId);
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
