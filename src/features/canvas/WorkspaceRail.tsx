import { Button, Input, message } from 'antd';
import { ChevronLeft, ChevronRight, Download, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useStore } from 'zustand';

import { AppDialog } from '../../components/AppDialog';
import type { Workflow } from '../../domain/model';
import type { AppStore } from '../../state/use-app-store';
import { downloadWorkspaceExport, readWorkspaceExportFile } from './workspace-file';

const RECENT_MS = 7 * 24 * 60 * 60 * 1000;

export function relativeTime(iso: string, now = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return iso.slice(0, 10);
}

function isRecent(iso: string, now = Date.now()): boolean {
  return now - new Date(iso).getTime() <= RECENT_MS;
}

export function WorkspaceRail({
  store,
  collapsed,
  onToggleCollapsed,
}: {
  store: AppStore;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const workflows = useStore(store, (state) => state.workflows);
  const activeId = useStore(store, (state) => state.workflow?.id);
  const activeCards = useStore(store, (state) => state.cards.length);
  const transferBusy = useStore(store, (state) => (
    state.workflow?.nodes.some((node) => node.status === 'running') ?? false
  ));
  const [query, setQuery] = useState('');
  const [renameId, setRenameId] = useState<string>();
  const [renameValue, setRenameValue] = useState('');
  const [deleteId, setDeleteId] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const sorted = [...workflows].sort((left, right) => (
      right.updatedAt.localeCompare(left.updatedAt) || left.id.localeCompare(right.id)
    ));
    const needle = query.trim().toLowerCase();
    if (!needle) return sorted;
    return sorted.filter((item) => item.name.toLowerCase().includes(needle));
  }, [query, workflows]);

  const recent = filtered.filter((item) => isRecent(item.updatedAt));
  const older = filtered.filter((item) => !isRecent(item.updatedAt));
  const deleteTarget = workflows.find((item) => item.id === deleteId);

  const openRename = (workflow: Workflow) => {
    setRenameId(workflow.id);
    setRenameValue(workflow.name);
  };

  const confirmRename = async () => {
    if (!renameId) return;
    await store.getState().renameWorkflow(renameId, renameValue);
    setRenameId(undefined);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await store.getState().deleteWorkflow(deleteId);
    setDeleteId(undefined);
  };

  const createWorkspace = async () => {
    const id = await store.getState().createWorkflow();
    const created = store.getState().workflows.find((item) => item.id === id);
    if (created) openRename(created);
  };

  const exportWorkspace = async () => {
    const result = await store.getState().exportCurrentWorkspace();
    if (!result.ok) {
      void message.error(result.reason === 'busy' ? '工作流运行中，暂时无法导出' : '导出工作区失败，请重试');
      return;
    }
    try {
      downloadWorkspaceExport(result.file);
      void message.success('工作区已导出');
    } catch {
      void message.error('导出工作区失败，请重试');
    }
  };

  const importWorkspace = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const value = await readWorkspaceExportFile(file);
      const result = await store.getState().importWorkspaceExport(value);
      if (!result.ok) {
        const text = result.reason === 'busy'
          ? '工作流运行中，暂时无法导入'
          : result.reason === 'storage'
            ? '保存导入的工作区失败，请重试'
            : '工作区文件无效或版本不受支持';
        void message.error(text);
        return;
      }
      void message.success('工作区已导入为新副本');
    } catch {
      void message.error('工作区文件无法读取或内容无效');
    } finally {
      input.value = '';
    }
  };

  return (
    <aside className="workspace-rail" aria-label="工作区列表">
      {collapsed ? (
        <div className="workspace-rail__collapsed">
          <button className="workspace-rail__fold" type="button" aria-label="展开工作区" title="展开工作区" onClick={onToggleCollapsed}>
            <ChevronRight size={16} />
          </button>
          <span className="workspace-rail__collapsed-label">工作区</span>
        </div>
      ) : (
        <>
          <div className="workspace-rail__header">
            <h2>工作区</h2>
            <span className="workspace-rail__count">{workflows.length}</span>
            <button className="workspace-rail__fold" type="button" aria-label="折叠工作区" title="折叠工作区" onClick={onToggleCollapsed}>
              <ChevronLeft size={16} />
            </button>
          </div>
          <div className="workspace-rail__search">
            <Input
              allowClear
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索工作区…"
              aria-label="搜索工作区"
            />
          </div>
          <div className="workspace-rail__list" role="listbox" aria-label="工作区">
            {filtered.length === 0 ? (
              <p className="workspace-rail__empty">没有匹配的工作区</p>
            ) : (
              <>
                {recent.length > 0 && <div className="workspace-rail__section">最近</div>}
                {recent.map((item) => (
                  <WorkspaceCard
                    key={item.id}
                    workflow={item}
                    active={item.id === activeId}
                    cardCount={item.id === activeId ? activeCards : undefined}
                    onSelect={() => { void store.getState().openWorkflow(item.id); }}
                    onRename={() => openRename(item)}
                    onDelete={() => setDeleteId(item.id)}
                    onExport={item.id === activeId ? exportWorkspace : undefined}
                    transferBusy={transferBusy}
                  />
                ))}
                {older.length > 0 && <div className="workspace-rail__section">更早</div>}
                {older.map((item) => (
                  <WorkspaceCard
                    key={item.id}
                    workflow={item}
                    active={item.id === activeId}
                    cardCount={item.id === activeId ? activeCards : undefined}
                    onSelect={() => { void store.getState().openWorkflow(item.id); }}
                    onRename={() => openRename(item)}
                    onDelete={() => setDeleteId(item.id)}
                    onExport={item.id === activeId ? exportWorkspace : undefined}
                    transferBusy={transferBusy}
                  />
                ))}
              </>
            )}
          </div>
          <div className="workspace-rail__footer">
            <input
              ref={fileInputRef}
              className="workspace-rail__file-input"
              type="file"
              accept="application/json,.json"
              aria-label="选择工作区文件"
              onChange={(event) => { void importWorkspace(event); }}
            />
            <button
              className="workspace-rail__import"
              type="button"
              aria-label="导入工作区"
              title={transferBusy ? '工作流运行中，暂时无法导入' : '导入工作区'}
              disabled={transferBusy}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
            </button>
            <button className="workspace-rail__new" type="button" onClick={() => { void createWorkspace(); }}>
              <Plus size={16} />
              新建工作区
            </button>
          </div>
        </>
      )}
      <AppDialog open={renameId !== undefined} variant="popup" title="重命名工作区" onClose={() => setRenameId(undefined)}>
        <p>工作区名称仅保存在本地，不影响节点数据。</p>
        <Input
          aria-label="工作区名称"
          value={renameValue}
          maxLength={60}
          onChange={(event) => setRenameValue(event.target.value)}
          onPressEnter={() => { void confirmRename(); }}
        />
        <div className="settings-actions confirm-actions">
          <Button aria-label="取消" onClick={() => setRenameId(undefined)}>取消</Button>
          <Button aria-label="保存" type="primary" onClick={() => { void confirmRename(); }}>保存</Button>
        </div>
      </AppDialog>
      <AppDialog open={deleteId !== undefined} variant="popup" title="删除工作区" onClose={() => setDeleteId(undefined)}>
        <p>确定删除「{deleteTarget?.name}」？此操作不可撤销，节点、卡片和对话记录将一并删除。</p>
        <div className="settings-actions confirm-actions">
          <Button aria-label="取消" onClick={() => setDeleteId(undefined)}>取消</Button>
          <Button aria-label="确认删除" danger type="primary" onClick={() => { void confirmDelete(); }}>确认删除</Button>
        </div>
      </AppDialog>
    </aside>
  );
}

function WorkspaceCard({
  workflow,
  active,
  cardCount,
  onSelect,
  onRename,
  onDelete,
  onExport,
  transferBusy,
}: {
  workflow: Workflow;
  active: boolean;
  cardCount?: number;
  onSelect: () => void;
  onRename: () => void;
  onDelete: () => void;
  onExport?: () => void;
  transferBusy: boolean;
}) {
  return (
    <div className={`workspace-card${active ? ' is-active' : ''}`} role="option" aria-selected={active} aria-label={workflow.name}>
      <button className="workspace-card__select" type="button" aria-label={workflow.name} onClick={onSelect}>
        <span className="workspace-card__name">{workflow.name}</span>
        <span className="workspace-card__meta">
          <span>{relativeTime(workflow.updatedAt)}</span>
          <span className="workspace-card__badge">{workflow.nodes.length} 节点</span>
          {cardCount ? <span className="workspace-card__badge">{cardCount} 卡</span> : null}
        </span>
      </button>
      <div className="workspace-card__actions">
        {onExport ? (
          <button
            className="workspace-card__action workspace-card__export"
            type="button"
            aria-label="导出当前工作区"
            title={transferBusy ? '工作流运行中，暂时无法导出' : '导出当前工作区'}
            disabled={transferBusy}
            onClick={() => { void onExport(); }}
          >
            <Download size={13} />
          </button>
        ) : null}
        <button className="workspace-card__action" type="button" onClick={onRename}>
          <Pencil size={12} /> 重命名
        </button>
        <button className="workspace-card__action is-danger" type="button" onClick={onDelete}>
          <Trash2 size={12} /> 删除
        </button>
      </div>
    </div>
  );
}
