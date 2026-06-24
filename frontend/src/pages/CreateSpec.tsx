import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useSSE } from '../hooks/useSSE';
import FileUploader from '../components/FileUploader';
import TiptapEditor from '../components/TiptapEditor';
import type { TiptapEditorRef } from '../components/TiptapEditor';
import { ArrowLeft, Loader2, Sparkles, CheckCircle2 } from 'lucide-react';

type Phase = 'form' | 'generating' | 'done';

export default function CreateSpec() {
  const [title, setTitle] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [additionalContext, setAdditionalContext] = useState('');
  const [phase, setPhase] = useState<Phase>('form');
  const [createdSpecId, setCreatedSpecId] = useState<string | null>(null);
  const editorRef = useRef<TiptapEditorRef>(null);
  const navigate = useNavigate();
  const { startStream, isStreaming } = useSSE();

  const showPreview = phase === 'generating' || phase === 'done';

  const handleGenerate = async () => {
    if (!title.trim()) return alert('Give your spec a title first.');
    if (files.length === 0) return alert('Upload at least one context file so the AI has something to work with.');

    setPhase('generating');
    try {
      const spec = await api.createSpec(title);
      setCreatedSpecId(spec.id);
      await api.uploadFiles(spec.id, files);

      editorRef.current?.setMarkdown('');
      await startStream(
        `/api/specs/${spec.id}/generate`,
        { additional_context: additionalContext },
        {
          onToken: (token) => {
            editorRef.current?.appendText(token);
          },
          onDone: () => {
            setPhase('done');
          },
          onError: (err) => {
            setPhase('form');
            alert(`Generation failed: ${err}`);
          },
        }
      );
    } catch (err: unknown) {
      setPhase('form');
      alert(`Error: ${(err as Error).message}`);
    }
  };

  const handleViewSpec = () => {
    if (createdSpecId) {
      navigate(`/specs/${createdSpecId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} /> All specs
        </button>
        <h1 className="text-xl font-semibold text-gray-900 mt-2">New Spec</h1>
        <p className="text-xs text-gray-400 mt-1">
          Upload your raw ideas and let the AI turn them into a structured, actionable specification.
        </p>
      </header>

      <div className="flex transition-all duration-500 ease-in-out min-h-[calc(100vh-105px)]">
        {/* Left: form in card */}
        <div className={`transition-all duration-500 ease-in-out ${showPreview ? 'w-5/12' : 'w-full'} p-6 flex justify-center`}>
          <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5 w-full ${showPreview ? '' : 'max-w-2xl'}`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                What are you building?
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., AI Customer Support Bot, Internal HR Portal"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={showPreview}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Context files
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Drop in anything that describes the idea — meeting notes, feature requests, mockups, workflow diagrams, brain dumps.
              </p>
              <FileUploader files={files} onFilesChange={setFiles} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Anything else the AI should know?
              </label>
              <textarea
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                placeholder="e.g., Must use React + FastAPI, target audience is internal ops team, needs SSO..."
                rows={3}
                disabled={showPreview}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={showPreview}
              className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {phase === 'generating' || isStreaming ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Drafting spec...
                </>
              ) : (
                <>
                  <Sparkles size={18} /> Generate Draft
                </>
              )}
            </button>

            {!showPreview && (
              <p className="text-xs text-gray-400 text-center">
                The AI will make reasonable assumptions where details are missing and highlight them for your review.
              </p>
            )}
          </div>
        </div>

        {/* Right: live preview */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${showPreview ? 'w-7/12 opacity-100' : 'w-0 opacity-0'}`}>
          {showPreview && (
            <div className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {phase === 'generating' || isStreaming ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-blue-600" />
                      <span className="text-sm font-medium text-gray-600">Generating draft...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} className="text-green-600" />
                      <span className="text-sm font-medium text-green-700">Draft ready</span>
                    </>
                  )}
                </div>
                {phase === 'done' && (
                  <button
                    onClick={handleViewSpec}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Review Spec
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-auto bg-white rounded-xl border border-gray-200 shadow-sm">
                <TiptapEditor ref={editorRef} editable={false} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
