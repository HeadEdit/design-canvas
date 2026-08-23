import type { NodeDefinition } from '../domain/node-definitions';
import type { NodeExecutionRegistration, NodeRunner } from '../execution/runner-types';
import type {
  HostCapabilityKey,
  NodeAvailability,
  NodePlugin,
} from './types';

const INSTALLED_CAPABILITIES: readonly HostCapabilityKey[] = [
  'workflow',
  'execution',
  'cards',
  'sessions',
  'ai',
];

export type ErasedNodePlugin = NodePlugin<unknown>;

export interface NodePlatform {
  readonly plugins: ReadonlyMap<string, ErasedNodePlugin>;
  lookup(kind: string): ErasedNodePlugin | undefined;
  inspectNode(kind: string, config: unknown): NodeAvailability;
  parseConfig(kind: string, config: unknown): { ok: true; config: unknown } | { ok: false; message: string };
  cloneDefaultConfig(kind: string): unknown;
  definitions(): readonly NodeDefinition[];
  getDefinition(kind: string): NodeDefinition | undefined;
  getExecution(kind: string): NodeExecutionRegistration | undefined;
  getUi(kind: string): ErasedNodePlugin['ui'] | undefined;
}

function uniquePortIds(definition: NodeDefinition): boolean {
  const ids = [
    ...definition.inputs.map((port) => `in:${port.id}`),
    ...definition.outputs.map((port) => `out:${port.id}`),
  ];
  return new Set(ids).size === ids.length;
}

function asRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function createNodePlatform(
  plugins: readonly NodePlugin<any>[],
  installedCapabilities: readonly HostCapabilityKey[] = INSTALLED_CAPABILITIES,
): NodePlatform {
  const map = new Map<string, ErasedNodePlugin>();

  for (const plugin of plugins) {
    if (!plugin.kind) {
      throw new Error('Node plugin kind must be a non-empty string');
    }
    if (map.has(plugin.kind)) {
      throw new Error(`Duplicate node kind: ${plugin.kind}`);
    }
    if (plugin.definition.kind !== plugin.kind) {
      throw new Error(`Plugin kind ${plugin.kind} does not match definition`);
    }
    if (!uniquePortIds(plugin.definition)) {
      throw new Error(`Duplicate port id in ${plugin.kind}`);
    }
    const parsedDefault = plugin.configSchema.safeParse(plugin.definition.defaultConfig);
    if (!parsedDefault.success) {
      throw new Error(`Illegal defaultConfig for ${plugin.kind}`);
    }
    if (!asRecord(parsedDefault.data)) {
      throw new Error(`Config root for ${plugin.kind} must be a JSON object`);
    }
    for (const key of plugin.requiredCapabilities ?? []) {
      if (!installedCapabilities.includes(key)) {
        throw new Error(`Missing host capability ${key} required by ${plugin.kind}`);
      }
    }
    map.set(plugin.kind, plugin as ErasedNodePlugin);
  }

  const lookup = (kind: string): ErasedNodePlugin | undefined => map.get(kind);

  const parseConfig = (kind: string, config: unknown) => {
    const plugin = lookup(kind);
    if (!plugin) {
      return { ok: false as const, message: '节点插件不可用' };
    }
    const parsed = plugin.configSchema.safeParse(config);
    if (!parsed.success) {
      return { ok: false as const, message: '节点配置无效' };
    }
    return { ok: true as const, config: parsed.data };
  };

  const platform: NodePlatform = {
    plugins: map,
    lookup,
    parseConfig,
    inspectNode(kind, config) {
      const plugin = lookup(kind);
      if (!plugin) {
        return { status: 'plugin-unavailable', kind };
      }
      const parsed = parseConfig(kind, config);
      if (!parsed.ok) {
        return { status: 'invalid-config', kind, message: parsed.message };
      }
      return { status: 'available', kind };
    },
    cloneDefaultConfig(kind) {
      const definition = lookup(kind)?.definition;
      if (!definition) {
        return undefined;
      }
      return structuredClone(definition.defaultConfig);
    },
    definitions() {
      return [...map.values()].map((plugin) => plugin.definition);
    },
    getDefinition(kind) {
      return lookup(kind)?.definition;
    },
    getExecution(kind) {
      const plugin = lookup(kind);
      if (!plugin?.execution) {
        return undefined;
      }
      const contribution = plugin.execution;
      const runner: NodeRunner = {
        kind,
        requiresAi: contribution.requiresAi,
        async run(context) {
          const parsed = plugin.configSchema.safeParse(context.node.config);
          if (!parsed.success) {
            return { ok: false, errorKind: 'invalid-response' };
          }
          return contribution.run({
            ...context,
            config: parsed.data,
          });
        },
      };
      return {
        mode: 'standard' as const,
        runner,
        descendantInvalidation: contribution.descendantInvalidation ?? 'on-run-start',
      };
    },
    getUi(kind) {
      return lookup(kind)?.ui;
    },
  };

  return Object.freeze(platform);
}
