import { planControlRun } from '../domain/control-flow';
import type { Workflow } from '../domain/model';

/**
 * 控制流协调器：把「按控制流顺序编排节点执行、失败即停、可被 stop 打断」
 * 的职责从 AppStore 中抽出。协调器内部维护一个 epoch 计数，任何一次 stop
 * 都会递增 epoch，使正在运行的 run 在下一个检查点提前退出。
 */
export interface ControlFlowCoordinatorDeps {
  getWorkflow(): Workflow | undefined;
  rerunNode(nodeId: string): Promise<void>;
  stopNode(nodeId: string): void;
}

export interface ControlFlowCoordinator {
  run(selectedNodeId?: string): Promise<void>;
  stop(nodeId: string): void;
}

export function createControlFlowCoordinator(
  deps: ControlFlowCoordinatorDeps,
): ControlFlowCoordinator {
  let epoch = 0;

  return {
    async run(selectedNodeId) {
      const currentEpoch = ++epoch;
      const plan = planControlRun(deps.getWorkflow(), selectedNodeId);
      if (!plan.ok) return;

      for (const nodeId of plan.nodeIds) {
        if (currentEpoch !== epoch) return;
        const current = deps.getWorkflow()?.nodes.find((node) => node.id === nodeId);
        if (!current) return;

        await deps.rerunNode(nodeId);

        if (currentEpoch !== epoch) return;
        const live = deps.getWorkflow()?.nodes.find((node) => node.id === nodeId);
        if (!live || (live.status !== 'succeeded' && live.status !== 'partial')) return;
      }
    },

    stop(nodeId) {
      epoch += 1;
      deps.stopNode(nodeId);
    },
  };
}
