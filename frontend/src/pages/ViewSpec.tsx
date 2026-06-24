import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSSE } from '../hooks/useSSE';
import TiptapEditor from '../components/TiptapEditor';
import type { TiptapEditorRef } from '../components/TiptapEditor';
import type { Spec, SpecVersion } from '../types';
import { diffLines } from 'diff';
import {
  ArrowLeft, Edit3, Save, X, Menu, Clock,
  ChevronLeft, ChevronRight, Loader2, RotateCcw,
  MessageSquarePlus, Download, CheckCircle2,
} from 'lucide-react';

export default function ViewSpec() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [spec, setSpec] = useState<Spec | null>(null);
  const [versions, setVersions] = useState<SpecVersion[]>([]);
  const [editing, setEditing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [versionPanelOpen, setVersionPanelOpen] = useState(true);
  const [reviseSection, setReviseSection] = useState<string | null>(null);
  const [reviseFeedback, setReviseFeedback] = useState('');
  const [revisingSection, setRevisingSection] = useState<string | null>(null);
  const [streamedContent, setStreamedContent] = useState('');
  const [diffVersion, setDiffVersion] = useState<SpecVersion | null>(null);
  const editorRef = useRef<TiptapEditorRef>(null);
  const { startStream, isStreaming } = useSSE();

  useEffect(() => {
    if (!id) return;
    loadSpec();
    loadVersions();
  }, [id]);

  const loadSpec = async () => {
    const s = await api.getSpec(id!);
    setSpec(s);
  };

  const loadVersions = async () => {
    const v = await api.listVersions(id!);
    setVersions(v);
  };

  const handleSave = async () => {
    if (!editorRef.current || !id) return;
    const md = editorRef.current.getMarkdown();
    await api.saveContent(id, md);
    await loadSpec();
    await loadVersions();
    setEditing(false);
  };

  const handleRevise = async (sectionTitle: string) => {
    if (!reviseFeedback.trim() || !id) return;
    setRevisingSection(sectionTitle);
    setStreamedContent('');
    setReviseSection(null);

    await startStream(
      `/api/specs/${id}/revise`,
      { section: sectionTitle, feedback: reviseFeedback },
      {
        onToken: (token) => {
          setStreamedContent((prev) => prev + token);
        },
        onDone: async () => {
          await loadSpec();
          await loadVersions();
          setRevisingSection(null);
          setStreamedContent('');
          setReviseFeedback('');
        },
        onError: (err) => {
          alert(`Revision failed: ${err}`);
          setRevisingSection(null);
          setStreamedContent('');
        },
      }
    );
  };

  const handleRestore = async (version: SpecVersion) => {
    if (!confirm(`Restore version ${version.version_number}?`)) return;
    const full = await api.getVersion(id!, version.version_number);
    if (full.content_markdown) {
      await api.saveContent(id!, full.content_markdown, `Restored v${version.version_number}`);
      await loadSpec();
      await loadVersions();
      setDiffVersion(null);
    }
  };

  const handleExport = useCallback(() => {
    if (!spec?.content_markdown) return;
    const blob = new Blob([spec.content_markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${spec.title.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [spec]);

  const handleApprove = async () => {
    if (!id) return;
    await api.updateSpec(id, { status: 'approved' });
    await loadSpec();
  };

  const sections = extractSections(spec?.content_markdown || '');

  if (!spec) {
    return <div className="flex items-center justify-center h-screen text-sm text-gray-400">Loading...</div>;
  }

  return (
    <div className="flex h-screen">
      {/* Left sidebar */}
      <aside className={`bg-gray-50 border-r border-gray-200 transition-all ${sidebarOpen ? 'w-56' : 'w-14'} flex flex-col`}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-4 hover:bg-gray-100">
          <Menu size={18} />
        </button>
        {sidebarOpen && (
          <nav className="px-3 py-2 space-y-1">
            <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 w-full text-left px-2 py-1 rounded">
              <ArrowLeft size={14} /> All specs
            </button>
            <hr className="my-2" />
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">Sections</p>
            {sections.map((s) => (
              <button
                key={s.title}
                className="block w-full text-left px-2 py-1 rounded text-sm text-gray-600 hover:bg-gray-200 truncate"
                onClick={() => {
                  const el = document.getElementById(`section-${s.title}`);
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {s.title}
              </button>
            ))}
          </nav>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">{spec.title}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              spec.status === 'approved' ? 'bg-green-100 text-green-700' :
              spec.status === 'final' ? 'bg-green-100 text-green-700' :
              spec.status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {spec.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 text-sm font-medium text-gray-700 rounded hover:bg-gray-50"
            >
              <Download size={14} /> Export .md
            </button>
            {editing ? (
              <>
                <button onClick={handleSave} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700">
                  <Save size={14} /> Save
                </button>
                <button onClick={() => { setEditing(false); editorRef.current?.setMarkdown(spec.content_markdown || ''); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-sm font-medium text-gray-700 rounded hover:bg-gray-300">
                  <X size={14} /> Cancel
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700">
                <Edit3 size={14} /> Edit
              </button>
            )}
            <button onClick={() => setVersionPanelOpen(!versionPanelOpen)} className="p-2 text-gray-400 hover:text-gray-600">
              {versionPanelOpen ? <ChevronRight size={16} /> : <Clock size={16} />}
            </button>
          </div>
        </header>

        {/* Document body */}
        <div className="flex-1 overflow-auto p-6">
          {editing ? (
            <TiptapEditor
              ref={editorRef}
              initialContent={spec.content_markdown || ''}
              editable={true}
            />
          ) : (
            <div className="max-w-3xl mx-auto">
              {sections.map((section) => (
                <div key={section.title} id={`section-${section.title}`} className="mb-8">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-base font-semibold text-gray-900">{section.title}</h2>
                    <button
                      onClick={() => {
                        setReviseSection(reviseSection === section.title ? null : section.title);
                        setReviseFeedback('');
                      }}
                      disabled={isStreaming}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        reviseSection === section.title
                          ? 'bg-blue-100 text-blue-700 border border-blue-300'
                          : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200'
                      } disabled:opacity-40`}
                    >
                      <MessageSquarePlus size={12} />
                      Revise
                    </button>
                  </div>

                  {revisingSection === section.title ? (
                    <div className="relative">
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        <Loader2 size={12} className="animate-spin" /> Revising...
                      </div>
                      <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/30 min-h-[60px]">
                        <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                          {streamedContent || <span className="text-sm text-gray-400 italic">Generating revised content...</span>}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: highlightAssumptions(section.content) }}
                    />
                  )}

                  {reviseSection === section.title && !revisingSection && (
                    <div className="mt-3 border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                      <label className="block text-sm font-medium text-blue-700 mb-1.5">
                        How should this section be revised?
                      </label>
                      <textarea
                        value={reviseFeedback}
                        onChange={(e) => setReviseFeedback(e.target.value)}
                        placeholder="e.g., Add more detail about authentication requirements..."
                        rows={3}
                        autoFocus
                        className="w-full px-3 py-2 border border-blue-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => handleRevise(section.title)}
                          disabled={!reviseFeedback.trim()}
                          className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Revise Section
                        </button>
                        <button
                          onClick={() => { setReviseSection(null); setReviseFeedback(''); }}
                          className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {sections.length > 0 && spec.status !== 'approved' && (
                <div className="mt-10 pt-6 border-t border-gray-200 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Ready to finalize?</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Approving locks in this version as the accepted specification.
                    </p>
                  </div>
                  <button
                    onClick={handleApprove}
                    className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircle2 size={16} /> Approve Spec
                  </button>
                </div>
              )}
              {sections.length > 0 && spec.status === 'approved' && (
                <div className="mt-10 pt-6 border-t border-gray-200 flex items-center gap-3">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-green-700">Spec approved</p>
                    <p className="text-xs text-gray-400">This specification has been accepted. You can still make edits — a new revision will reset it to draft.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Right version panel */}
      {versionPanelOpen && (
        <aside className="w-64 border-l border-gray-200 bg-gray-50 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Versions</h3>
            <button onClick={() => setVersionPanelOpen(false)} className="text-gray-400 hover:text-gray-600">
              <ChevronLeft size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {versions.map((v) => (
              <div
                key={v.id}
                className={`p-2.5 rounded text-xs border ${
                  v.version_number === spec.current_version
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-900">v{v.version_number}</span>
                  {v.version_number === spec.current_version && (
                    <span className="text-[11px] font-medium text-blue-600">current</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5 truncate">{v.change_description}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {new Date(v.created_at).toLocaleString()}
                </p>
                {v.version_number !== spec.current_version && (
                  <div className="flex gap-2 mt-1.5">
                    <button
                      onClick={async () => {
                        const full = await api.getVersion(id!, v.version_number);
                        setDiffVersion(full);
                      }}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      View diff
                    </button>
                    <button
                      onClick={() => handleRestore(v)}
                      className="text-xs font-medium text-green-600 hover:underline flex items-center gap-0.5"
                    >
                      <RotateCcw size={10} /> Restore
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* Diff modal */}
      {diffVersion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b">
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Version {diffVersion.version_number} vs Current (v{spec.current_version})
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">{diffVersion.change_description}</p>
              </div>
              <button onClick={() => setDiffVersion(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <DiffView
                oldText={diffVersion.content_markdown || ''}
                newText={spec.content_markdown || ''}
              />
            </div>
            <div className="px-5 py-3 border-t flex justify-end gap-2">
              <button
                onClick={() => handleRestore(diffVersion)}
                className="px-4 py-2 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700"
              >
                Restore this version
              </button>
              <button onClick={() => setDiffVersion(null)} className="px-4 py-2 bg-gray-200 text-sm font-medium text-gray-700 rounded hover:bg-gray-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DiffView({ oldText, newText }: { oldText: string; newText: string }) {
  const changes = diffLines(oldText, newText);

  return (
    <div className="font-mono text-xs leading-relaxed">
      {changes.map((part, i) => {
        if (part.added) {
          return (
            <div key={i} className="bg-green-50 border-l-4 border-green-400 pl-3 py-0.5">
              {part.value.split('\n').filter(Boolean).map((line, j) => (
                <div key={j} className="text-green-800">+ {line}</div>
              ))}
            </div>
          );
        }
        if (part.removed) {
          return (
            <div key={i} className="bg-red-50 border-l-4 border-red-400 pl-3 py-0.5">
              {part.value.split('\n').filter(Boolean).map((line, j) => (
                <div key={j} className="text-red-800">- {line}</div>
              ))}
            </div>
          );
        }
        const lines = part.value.split('\n').filter(Boolean);
        if (lines.length <= 6) {
          return (
            <div key={i} className="pl-3 py-0.5 text-gray-500">
              {lines.map((line, j) => (
                <div key={j}>&nbsp; {line}</div>
              ))}
            </div>
          );
        }
        return (
          <div key={i} className="pl-3 py-0.5 text-gray-400">
            <div>&nbsp; {lines[0]}</div>
            <div>&nbsp; {lines[1]}</div>
            <div className="text-center text-xs text-gray-300 my-1">
              ··· {lines.length - 4} unchanged lines ···
            </div>
            <div>&nbsp; {lines[lines.length - 2]}</div>
            <div>&nbsp; {lines[lines.length - 1]}</div>
          </div>
        );
      })}
    </div>
  );
}

function extractSections(markdown: string): { title: string; content: string }[] {
  const lines = markdown.split('\n');
  const sections: { title: string; content: string }[] = [];
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)/);
    if (match) {
      if (currentTitle) {
        sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
      }
      currentTitle = match[1];
      currentContent = [];
    } else if (currentTitle) {
      currentContent.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, content: currentContent.join('\n').trim() });
  }
  return sections;
}

function highlightAssumptions(text: string): string {
  return text.replace(
    /\*\*\*(.+?)\*\*\*/g,
    '<span class="border-l-4 border-amber-400 bg-amber-50 px-2 py-0.5 italic font-medium text-amber-800 inline-block my-0.5">$1</span>'
  );
}
