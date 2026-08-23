import { z } from 'zod';

export const DEFAULT_BRIEF_GENERATION_PROMPT =
  '请根据上游聊天内容，整理成游戏系统策划 Brief。只提取已确认信息；不确定的写进范围外或省略。\n'
  + '\n'
  + '填写时尽量对应这些策划要点（没有就不写，不要编造）：\n'
  + '- 标题：工作标题或电梯稿里的游戏名\n'
  + '- 背景与问题：要解决的体验缺口、核心幻想\n'
  + '- 目标玩家：主要/次要玩家类型，以及明确不服务谁\n'
  + '- 设计目标：支柱（含一句设计检验）、核心动词、核心循环（约 30 秒与一局）\n'
  + '- 硬约束：工期、平台、体量，以及「我们不会做 X，因为它伤害支柱 Y」\n'
  + '- 成功指标：怎样算核心循环成立\n'
  + '- 范围外：反支柱、MVP 不做的系统\n'
  + '\n'
  + '硬约束不要和设计目标混写。语气简洁，面向程序/美术/策划评审。';

export const briefConfigSchema = z.object({
  title: z.string().default(''),
  background: z.string().default(''),
  targetPlayers: z.string().default(''),
  designGoals: z.string().default(''),
  constraints: z.string().default(''),
  successMetrics: z.string().default(''),
  outOfScope: z.string().default(''),
  generationPrompt: z.string().default(DEFAULT_BRIEF_GENERATION_PROMPT),
  referenceDocumentIds: z.array(z.string()).default([]),
});

export type BriefConfig = z.infer<typeof briefConfigSchema>;

export const defaultBriefConfig: BriefConfig = briefConfigSchema.parse({});

const BRIEF_SECTIONS: Array<{ key: keyof BriefConfig; heading: string }> = [
  { key: 'background', heading: '背景与问题' },
  { key: 'targetPlayers', heading: '目标玩家' },
  { key: 'designGoals', heading: '设计目标' },
  { key: 'constraints', heading: '硬约束' },
  { key: 'successMetrics', heading: '成功指标' },
  { key: 'outOfScope', heading: '范围外' },
];

const REQUIRED_KEYS = [
  'title',
  'background',
  'targetPlayers',
  'designGoals',
  'constraints',
  'successMetrics',
] as const;

export function formatBriefText(config: BriefConfig): string {
  const lines = [`# ${config.title.trim() || '未命名 Brief'}`, ''];
  for (const section of BRIEF_SECTIONS) {
    const value = String(config[section.key] ?? '').trim();
    if (!value) continue;
    lines.push(`## ${section.heading}`, value, '');
  }
  return lines.join('\n').trim();
}

export function countBriefRequiredFields(config: BriefConfig): { filled: number; total: 6 } {
  const filled = REQUIRED_KEYS.filter((key) => config[key].trim()).length;
  return { filled, total: 6 };
}
