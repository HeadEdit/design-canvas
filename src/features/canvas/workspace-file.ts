import {
  WORKSPACE_EXPORT_MAX_BYTES,
  type WorkspaceExportFileV1,
} from '../../state/workspace-transfer';

export type WorkspaceFileErrorReason =
  | 'invalid-extension'
  | 'too-large'
  | 'invalid-json'
  | 'read-failed';

export class WorkspaceFileError extends Error {
  readonly reason: WorkspaceFileErrorReason;

  constructor(reason: WorkspaceFileErrorReason) {
    super('无法读取工作区文件');
    this.name = 'WorkspaceFileError';
    this.reason = reason;
  }
}

export function workspaceExportFilename(name: string, exportedAt: string): string {
  const safeName = name
    .normalize('NFKC')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 80) || 'workspace';
  const date = new Date(exportedAt);
  const stamp = Number.isNaN(date.getTime())
    ? 'export'
    : date.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  return `${safeName}-${stamp}.json`;
}

export async function readWorkspaceExportFile(file: File): Promise<unknown> {
  if (!file.name.toLowerCase().endsWith('.json')) {
    throw new WorkspaceFileError('invalid-extension');
  }
  if (file.size > WORKSPACE_EXPORT_MAX_BYTES) {
    throw new WorkspaceFileError('too-large');
  }
  let source: string;
  try {
    source = await file.text();
  } catch {
    throw new WorkspaceFileError('read-failed');
  }
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new WorkspaceFileError('invalid-json');
  }
}

export function downloadWorkspaceExport(file: WorkspaceExportFileV1): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  try {
    anchor.href = url;
    anchor.download = workspaceExportFilename(file.snapshot.workflow.name, file.exportedAt);
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
