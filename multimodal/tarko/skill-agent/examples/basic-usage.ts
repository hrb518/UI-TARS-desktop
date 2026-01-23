/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

import { SkillAgent } from '../src';

async function main() {
  console.log('=== Skill Agent 基本使用示例 ===\n');

  try {
    // 创建 Skill Agent 实例
    const agent = new SkillAgent({
      name: 'demo-skill-agent',
      description: 'A demonstration skill agent',
      model: 'gpt-4o', // 替换为你使用的模型
      disableClaudeSkills: false, // 启用 Claude 技能
      skillFilter: {
        // 可以在这里设置技能过滤规则
        // include: ['math', 'weather'],
        // exclude: ['deprecated']
      }
    });

    console.log('Initializing Skill Agent...');
    await agent.initialize();
    console.log('Skill Agent initialized successfully!\n');

    // 获取加载的技能
    const skills = agent.getSkills();
    console.log(`Loaded ${Object.keys(skills).length} skills:`);
    Object.entries(skills).forEach(([name, info]) => {
      console.log(`- ${name}: ${info.description}`);
    });
    console.log('');

    // 示例 1: 直接使用技能工具
    console.log('=== 示例 1: 直接使用技能工具 ===');
    if (Object.keys(skills).length > 0) {
      const firstSkillName = Object.keys(skills)[0];
      const skillToolId = `skill_${firstSkillName}`;

      console.log(`Using skill: ${firstSkillName}`);
      const toolResult = await agent.callTool(skillToolId, {
        input: 'Hello from the example!'
      });
      console.log('Tool result:', toolResult);
    } else {
      console.log('No skills available to test');
    }
    console.log('');

    // 示例 2: 通过自然语言使用技能
    console.log('=== 示例 2: 通过自然语言使用技能 ===');
    const prompt = 'Please use the available skills to help me with something';
    console.log('Prompt:', prompt);

    const result = await agent.run(prompt);
    console.log('Agent response:', result);
    console.log('');

    // 示例 3: 获取单个技能信息
    console.log('=== 示例 3: 获取单个技能信息 ===');
    if (Object.keys(skills).length > 0) {
      const skillName = Object.keys(skills)[0];
      const skillInfo = agent.getSkill(skillName);
      if (skillInfo) {
        console.log(`Skill name: ${skillInfo.name}`);
        console.log(`Description: ${skillInfo.description}`);
        console.log(`Location: ${skillInfo.location}`);
      }
    }
    console.log('');

    console.log('=== 示例完成 ===');

  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main().catch(console.error);
}
