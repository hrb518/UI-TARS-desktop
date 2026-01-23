/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import z from "zod";
import { Filesystem } from "@/util/filesystem";
import { Global } from "@/global";
import { Log } from "@/util/log";
import { Config } from "@/config/config";
import { Instance } from "@/project/instance";
import { ConfigMarkdown } from "@/config/markdown";
import { Bus } from "@/bus";
import { Session } from "@/session";
import { NamedError } from "@opencode-ai/util/error";
import { SkillInfo, SkillRegistry, SkillFilterOptions } from "./skill-types";
import { filterItems } from "@tarko/shared-utils";

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

    const parsed = this.SkillInfoSchema.safeParse(md.data);
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
