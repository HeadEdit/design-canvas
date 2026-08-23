import { Button, Input, Switch } from 'antd';
import { useEffect, useState } from 'react';
import type { AiSettings } from '../../domain/model';
import { AppDialog } from '../../components/AppDialog';
import { AiClientError } from '../../ai/client';
import { getAiErrorMessage } from '../../ai/error-messages';

export interface AiSettingsDialogProps {
  open: boolean;
  initial?: AiSettings;
  onClose: () => void;
  onSave: (settings: AiSettings) => Promise<void>;
  onClearKey: () => Promise<void>;
  onTestConnection: (settings: AiSettings) => Promise<void>;
}

const empty: AiSettings = {
  baseUrl: '',
  apiKey: '',
  model: '',
  thinkingEnabled: false,
};

export function AiSettingsDialog({ open, initial = empty, onClose, onSave, onClearKey, onTestConnection }: AiSettingsDialogProps) {
  const [settings, setSettings] = useState<AiSettings>(initial);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setSettings(initial); setStatus(''); } }, [open, initial]);
  const update = (key: 'baseUrl' | 'apiKey' | 'model') => (event: React.ChangeEvent<HTMLInputElement>) => setSettings((current) => ({ ...current, [key]: event.target.value }));
  const run = async (operation: () => Promise<void>, success: string) => {
    setBusy(true); setStatus('');
    try { await operation(); setStatus(success); }
    catch (error) {
      const message = error instanceof AiClientError ? getAiErrorMessage(error.kind) : '操作失败，请检查配置后重试';
      setStatus(message);
    } finally { setBusy(false); }
  };
  return <AppDialog open={open} title="AI 设置" onClose={onClose}>
    <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void run(() => onSave(settings), '设置已保存'); }}>
      <p className="settings-notice">API Key 仅保存在当前浏览器的本地 IndexedDB 中，请勿在共享设备使用。</p>
      <label htmlFor="ai-base-url">Base URL</label>
      <Input id="ai-base-url" type="url" value={settings.baseUrl} onChange={update('baseUrl')} placeholder="https://api.example.com/v1" required />
      <label htmlFor="ai-api-key">API Key</label>
      <Input.Password id="ai-api-key" value={settings.apiKey} onChange={update('apiKey')} autoComplete="off" required />
      <label htmlFor="ai-model">模型</label>
      <Input id="ai-model" value={settings.model} onChange={update('model')} required />
      <div className="settings-toggle-row">
        <label htmlFor="ai-thinking-enabled">思考模式</label>
        <Switch
          id="ai-thinking-enabled"
          aria-label="思考模式"
          checked={settings.thinkingEnabled}
          onChange={(thinkingEnabled) => setSettings((current) => ({
            ...current,
            thinkingEnabled,
          }))}
        />
      </div>
      <div className="settings-actions">
        <Button aria-label="保存" type="primary" htmlType="submit" loading={busy}>保存</Button>
        <Button aria-label="清除 Key" type="default" disabled={busy} onClick={() => void run(async () => { await onClearKey(); setSettings((current) => ({ ...current, apiKey: '' })); }, 'API Key 已清除')}>清除 Key</Button>
        <Button aria-label="测试连接" disabled={busy} onClick={() => void run(() => onTestConnection(settings), '连接测试成功')}>测试连接</Button>
        <Button aria-label="关闭" onClick={onClose}>关闭</Button>
      </div>
      <div className="settings-status" role="status" aria-live="polite">{status}</div>
    </form>
  </AppDialog>;
}
