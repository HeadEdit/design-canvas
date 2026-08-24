import { Button, Input, Modal } from 'antd';
import { Plus, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useStore } from 'zustand';

import type { ReferenceDocument, ReferenceDocumentFormat } from '../../domain/model';
import type { AppStore } from '../../state/use-app-store';

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;

function formatLabel(format: ReferenceDocumentFormat): string {
  return { md: 'md', txt: 'txt', manual: '手动' }[format] ?? format;
}

export function ReferenceLibraryDialog({
  open,
  onClose,
  store,
}: {
  open: boolean;
  onClose: () => void;
  store: AppStore;
}) {
  const documents = useStore(store, (state) => state.documents);
  const [query, setQuery] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const needle = query.trim().toLowerCase();
  const visible = useMemo(() => documents.filter((doc) => (
    !needle || doc.title.toLowerCase().includes(needle) || doc.content.toLowerCase().includes(needle)
  )), [documents, needle]);

  const startCreate = () => {
    setEditingId(undefined);
    setTitle('');
    setContent('');
    setEditorOpen(true);
  };

  const startEdit = (doc: ReferenceDocument) => {
    setEditingId(doc.id);
    setTitle(doc.title);
    setContent(doc.content);
    setEditorOpen(true);
  };

  const cancelEdit = () => {
    setEditorOpen(false);
    setEditingId(undefined);
    setTitle('');
    setContent('');
  };

  const save = () => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) return;
    if (editingId) {
      store.getState().updateDocument(editingId, { title: trimmedTitle, content: trimmedContent });
    } else {
      store.getState().addDocument({ title: trimmedTitle, content: trimmedContent, format: 'manual' });
    }
    cancelEdit();
  };

  const remove = (doc: ReferenceDocument) => {
    Modal.confirm({
      title: `删除「${doc.title}」？`,
      content: '引用它的节点将自动移除该篇。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => store.getState().deleteDocument(doc.id),
    });
  };

  const importFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    if (file.size > MAX_DOCUMENT_BYTES) {
      Modal.error({ title: '文档过大', content: '单文档上限 2MB。' });
      return;
    }
    const name = file.name || '';
    const ext = name.split('.').pop()?.toLowerCase();
    const format: ReferenceDocumentFormat = ext === 'md' || ext === 'markdown' ? 'md' : 'txt';
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '').trim();
      if (!text) {
        Modal.error({ title: '文档为空', content: '文件内容为空，未创建文档。' });
        return;
      }
      store.getState().addDocument({
        title: name.replace(/\.[^.]+$/, ''),
        content: text,
        format,
        sourceName: name,
      });
    };
    reader.onerror = () => Modal.error({ title: '读取失败', content: '无法读取该文件。' });
    reader.readAsText(file);
    event.currentTarget.value = '';
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title="资料库"
      width={640}
      styles={{ body: { maxHeight: '70vh', overflow: 'auto' } }}
    >
      <div className="reference-library-toolbar">
        <Input
          aria-label="检索文档"
          allowClear
          value={query}
          placeholder="关键词检索标题与正文…"
          onChange={(event) => setQuery(event.target.value)}
        />
        <Button type="primary" icon={<Plus size={15} />} onClick={startCreate}>手动输入</Button>
        <Button icon={<Upload size={15} />} onClick={() => fileInputRef.current?.click()}>导入文件</Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md,.txt,.markdown"
          style={{ display: 'none' }}
          aria-label="导入文件"
          onChange={importFile}
        />
      </div>

      {editorOpen && (
        <div className="reference-library-editor">
          <Input
            aria-label="文档标题"
            value={title}
            placeholder="文档标题"
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input.TextArea
            aria-label="文档内容"
            value={content}
            rows={6}
            placeholder="粘贴或输入文档 / 需求正文…"
            onChange={(event) => setContent(event.target.value)}
          />
          <div className="reference-library-editor__actions">
            <Button type="primary" onClick={save} disabled={!title.trim() || !content.trim()}>保存</Button>
            <Button onClick={cancelEdit}>取消</Button>
          </div>
        </div>
      )}

      <div className="reference-library-list">
        {visible.map((doc) => (
          <div key={doc.id} className="reference-library-row">
            <div className="reference-library-row__main">
              <div className="reference-library-row__title">
                <span className="reference-library-format">{formatLabel(doc.format)}</span>
                {doc.title}
              </div>
              <div className="reference-library-row__meta">
                {doc.sourceName ?? '手动输入'}
              </div>
              <div className="reference-library-row__snippet">{doc.content}</div>
            </div>
            <div className="reference-library-row__actions">
              <Button size="small" onClick={() => startEdit(doc)}>编辑</Button>
              <Button size="small" danger icon={<Trash2 size={13} />} onClick={() => remove(doc)} />
            </div>
          </div>
        ))}
        {visible.length === 0 && <p className="empty-state">没有匹配的文档。点「手动输入」或「导入文件」新增。</p>}
      </div>
    </Modal>
  );
}
