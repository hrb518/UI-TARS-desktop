/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SkillAgent } from '../src';
import { MCPAgent } from '@tarko/mcp-agent';

/**
 * 高级使用示例 - 与 MCP Agent 集成
 */
async function runAdvancedExample() {
  console.log('=== Skill Agent 高级使用示例 ===\n');

  try {
    // 示例 1: 使用自定义技能目录
    console.log('=== 示例 1: 使用自定义技能目录 ===');
    
    const customAgent = new SkillAgent({
      name: 'custom-skill-agent',
      description: 'Agent with custom skill directories',
      model: 'gpt-4o',
      skillDirectories: [
        './custom-skills',
        '~/.my-skills'
      ]
    });

    console.log('Initializing agent with custom skill directories...');
    await customAgent.initialize();
    console.log('Agent initialized successfully!\n');

    const customSkills = customAgent.getSkills();
    console.log(`Loaded ${Object.keys(customSkills).length} skills from custom directories:`);
    Object.entries(customSkills).forEach(([name, info]) => {
      console.log(`- ${name}: ${info.description}`);
    });
    console.log('');

    // 示例 2: 创建复合 Agent (MCP + Skill)
    console.log('=== 示例 2: 创建复合 Agent (MCP + Skill) ===');
    
    class CompositeAgent extends MCPAgent {
      private skillAgent: SkillAgent;

      constructor(options: any) {
        super(options);
        this.skillAgent = new SkillAgent(options);
      }

      async initialize(): Promise<void> {
        // 初始化 MCP Agent
        await super.initialize();
        
        // 初始化 Skill Agent
        await this.skillAgent.initialize();

        // 合并技能工具到当前 Agent
        const skillTools = this.skillAgent.getTools();
        for (const tool of skillTools) {
          this.registerTool(tool);
        }

        console.log(`Composite agent initialized with ${skillTools.length} skill tools`);
      }

      // 代理 getSkills 方法
      getSkills() {
        return this.skillAgent.getSkills();
      }
    }

    // 创建复合 Agent 实例
    const compositeAgent = new CompositeAgent({
      name: 'composite-agent',
      description: 'Agent with both MCP and Skill support',
      model: 'gpt-4o',
      mcpServers: {
        // 这里可以配置 MCP 服务器
      },
      skillFilter: {
        include: ['math', 'weather']
      }
    });

    console.log('Initializing composite agent...');
    await compositeAgent.initialize();
    console.log('Composite agent initialized successfully!\n');

    const compositeSkills = compositeAgent.getSkills();
    console.log(`Composite agent has ${Object.keys(compositeSkills).length} skills available`);
    console.log('');

    // 示例 3: 技能过滤
    console.log('=== 示例 3: 技能过滤 ===');
    
    const filteredAgent = new SkillAgent({
      name: 'filtered-skill-agent',
      description: 'Agent with filtered skills',
      model: 'gpt-4o',
      skillFilter: {
        include: ['math'] // 只包含数学相关技能
      }
    });

    console.log('Initializing filtered agent...');
    await filteredAgent.initialize();
    console.log('Filtered agent initialized successfully!\n');

    const filteredSkills = filteredAgent.getSkills();
    console.log(`Filtered agent loaded ${Object.keys(filteredSkills).length} skills:`);
    Object.entries(filteredSkills).forEach(([name, info]) => {
      console.log(`- ${name}: ${info.description}`);
    });
    console.log('');

    console.log('=== 高级示例完成 ===');

  } catch (error) {
    console.error('Error in advanced example:', error);
  }
}

// 运行示例
runAdvancedExample();
