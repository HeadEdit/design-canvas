import type {
  StructuredPlanDependencyGraph,
  StructuredPlanLayer,
  StructuredPlanModule,
  StructuredPlanPriority,
} from './config';

const LAYER_ORDER: readonly StructuredPlanLayer[] = [
  'foundation', 'core', 'feature', 'presentation', 'polish',
];

const PRIORITY_ORDER: readonly StructuredPlanPriority[] = [
  'mvp', 'vertical-slice', 'alpha', 'full-vision',
];

const BOTTLENECK_DEPENDENT_THRESHOLD = 3;

export interface StructuredPlanSystemIndexItem {
  moduleId: string;
  title: string;
  layer: StructuredPlanLayer;
  priority: StructuredPlanPriority;
  bottleneck: boolean;
  inCycle: boolean;
}

export interface StructuredPlanSystemIndex {
  layers: Array<{ layer: StructuredPlanLayer; items: StructuredPlanSystemIndexItem[] }>;
  designOrder: StructuredPlanSystemIndexItem[];
  bottlenecks: Array<{ moduleId: string; title: string; dependentCount: number }>;
  cycles: string[][];
}

function priorityRank(priority: StructuredPlanPriority): number {
  return PRIORITY_ORDER.indexOf(priority);
}

function compareModules(left: StructuredPlanModule, right: StructuredPlanModule): number {
  const byPriority = priorityRank(left.priority) - priorityRank(right.priority);
  return byPriority !== 0 ? byPriority : left.title.localeCompare(right.title);
}

function toItem(
  module: StructuredPlanModule,
  bottleneck: boolean,
  inCycle: boolean,
): StructuredPlanSystemIndexItem {
  return {
    moduleId: module.id,
    title: module.title,
    layer: module.layer,
    priority: module.priority,
    bottleneck,
    inCycle,
  };
}

function findCycleGroups(
  modules: readonly StructuredPlanModule[],
  adjacency: ReadonlyMap<string, readonly string[]>,
): string[][] {
  let indexCounter = 0;
  const indices = new Map<string, number>();
  const lowLinks = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const groups: string[][] = [];

  function strongConnect(moduleId: string): void {
    indices.set(moduleId, indexCounter);
    lowLinks.set(moduleId, indexCounter);
    indexCounter += 1;
    stack.push(moduleId);
    onStack.add(moduleId);

    for (const target of adjacency.get(moduleId) ?? []) {
      if (!indices.has(target)) {
        strongConnect(target);
        lowLinks.set(moduleId, Math.min(lowLinks.get(moduleId)!, lowLinks.get(target)!));
      } else if (onStack.has(target)) {
        lowLinks.set(moduleId, Math.min(lowLinks.get(moduleId)!, indices.get(target)!));
      }
    }

    if (lowLinks.get(moduleId) === indices.get(moduleId)) {
      const group: string[] = [];
      let member: string | undefined;
      do {
        member = stack.pop();
        if (member !== undefined) {
          onStack.delete(member);
          group.push(member);
        }
      } while (member !== moduleId);
      if (group.length > 1) groups.push(group);
    }
  }

  for (const module of modules) {
    if (!indices.has(module.id)) strongConnect(module.id);
  }
  return groups;
}

export function buildStructuredPlanSystemIndex(
  modules: readonly StructuredPlanModule[],
  graph: StructuredPlanDependencyGraph | null,
): StructuredPlanSystemIndex {
  const moduleById = new Map(modules.map((module) => [module.id, module]));
  const sortedModules = [...modules].sort(compareModules);

  const adjacency = new Map<string, string[]>(modules.map((module) => [module.id, []]));
  const inDegree = new Map<string, number>(modules.map((module) => [module.id, 0]));
  const dependentCount = new Map<string, number>();

  for (const edge of graph?.edges ?? []) {
    if (!adjacency.has(edge.sourceModuleId) || !inDegree.has(edge.targetModuleId)) continue;
    adjacency.get(edge.sourceModuleId)!.push(edge.targetModuleId);
    inDegree.set(edge.targetModuleId, (inDegree.get(edge.targetModuleId) ?? 0) + 1);
    dependentCount.set(edge.sourceModuleId, (dependentCount.get(edge.sourceModuleId) ?? 0) + 1);
  }

  const ready = [...inDegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  const order: string[] = [];
  while (ready.length > 0) {
    ready.sort((left, right) => compareModules(moduleById.get(left)!, moduleById.get(right)!));
    const id = ready.shift()!;
    order.push(id);
    for (const target of adjacency.get(id) ?? []) {
      const next = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, next);
      if (next === 0) ready.push(target);
    }
  }

  const inCycleIds = new Set(
    [...inDegree.entries()].filter(([, degree]) => degree > 0).map(([id]) => id),
  );
  const bottleneckIds = new Set(
    [...dependentCount.entries()]
      .filter(([, count]) => count >= BOTTLENECK_DEPENDENT_THRESHOLD)
      .map(([id]) => id),
  );

  const itemFor = (module: StructuredPlanModule) => toItem(
    module,
    bottleneckIds.has(module.id),
    inCycleIds.has(module.id),
  );

  const cycleOrder = [...inCycleIds].sort(
    (left, right) => compareModules(moduleById.get(left)!, moduleById.get(right)!),
  );
  const designOrder = [...order, ...cycleOrder].map((id) => moduleById.get(id)!).map(itemFor);

  const layers = LAYER_ORDER
    .map((layer) => ({
      layer,
      items: sortedModules.filter((module) => module.layer === layer).map(itemFor),
    }))
    .filter((group) => group.items.length > 0);

  const bottlenecks = [...dependentCount.entries()]
    .filter(([, count]) => count >= BOTTLENECK_DEPENDENT_THRESHOLD)
    .map(([id, count]) => ({
      moduleId: id,
      title: moduleById.get(id)?.title ?? id,
      dependentCount: count,
    }))
    .sort((left, right) => right.dependentCount - left.dependentCount);

  const cycles = findCycleGroups(modules, adjacency);

  return { layers, designOrder, bottlenecks, cycles };
}
