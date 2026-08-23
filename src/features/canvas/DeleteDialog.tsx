import { Button } from 'antd';
import { AppDialog } from '../../components/AppDialog';

export interface DeleteImpact { nodes: number; edges: number; runs: number; cards: number; sessions: number; scope?: 'node' | 'workflow' }
export function DeleteDialog({ open, impact, onClose, onConfirm }: { open: boolean; impact: DeleteImpact; onClose: () => void; onConfirm: () => Promise<void> | void }) {
  const scope = impact.scope === 'node' ? '节点子树' : '工作流';
  return <AppDialog open={open} variant="popup" title={`删除${scope}`} onClose={onClose}>
    <p>此操作将删除 {impact.nodes} 个节点、{impact.edges} 条连接、{impact.runs} 次运行、{impact.cards} 张卡片和 {impact.sessions} 条对话记录。</p>
    <div className="settings-actions confirm-actions"><Button onClick={onClose}>取消</Button><Button danger type="primary" onClick={() => void onConfirm()}>确认删除</Button></div>
  </AppDialog>;
}
