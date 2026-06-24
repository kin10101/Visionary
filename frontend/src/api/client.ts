import type { Spec, SpecVersion, UploadedFile } from '../types';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  listSpecs: () => request<Spec[]>('/specs'),

  createSpec: (title: string, status = 'draft') =>
    request<Spec>('/specs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status }),
    }),

  getSpec: (id: string) => request<Spec>(`/specs/${id}`),

  updateSpec: (id: string, data: { title?: string; status?: string }) =>
    request<Spec>(`/specs/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  deleteSpec: (id: string) =>
    request<{ ok: boolean }>(`/specs/${id}`, { method: 'DELETE' }),

  uploadFiles: (specId: string, files: File[]) => {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    return request<UploadedFile[]>(`/specs/${specId}/files`, {
      method: 'POST',
      body: form,
    });
  },

  listFiles: (specId: string) =>
    request<UploadedFile[]>(`/specs/${specId}/files`),

  deleteFile: (specId: string, fileId: string) =>
    request<{ ok: boolean }>(`/specs/${specId}/files/${fileId}`, { method: 'DELETE' }),

  saveContent: (specId: string, content_markdown: string, change_description = 'Manual edit') =>
    request<{ version_number: number }>(`/specs/${specId}/content`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content_markdown, change_description }),
    }),

  listVersions: (specId: string) =>
    request<SpecVersion[]>(`/specs/${specId}/versions`),

  getVersion: (specId: string, versionNumber: number) =>
    request<SpecVersion>(`/specs/${specId}/versions/${versionNumber}`),
};
