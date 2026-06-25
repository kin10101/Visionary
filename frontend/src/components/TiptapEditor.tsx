import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useImperativeHandle, forwardRef, useRef, useCallback } from 'react';

export type TiptapEditorRef = {
  getMarkdown: () => string;
  setMarkdown: (md: string) => void;
  appendText: (text: string) => void;
};

type TiptapEditorProps = {
  initialContent?: string;
  editable?: boolean;
  className?: string;
};

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  ({ initialContent = '', editable = true, className = '' }, ref) => {
    const bufferRef = useRef<string>(initialContent);
    const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const editor = useEditor({
      extensions: [
        StarterKit,
        Markdown.configure({
          transformPastedText: true,
          transformCopiedText: true,
        }),
      ],
      content: initialContent,
      editable,
      editorProps: {
        attributes: {
          class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4',
        },
      },
    });

    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    const flushBuffer = useCallback(() => {
      if (!editor) return;
      const scrollParent = editor.view.dom.closest('.overflow-auto');
      const isAtBottom = scrollParent
        ? scrollParent.scrollHeight - scrollParent.scrollTop - scrollParent.clientHeight < 50
        : true;
      editor.commands.setContent(bufferRef.current);
      if (isAtBottom && scrollParent) {
        requestAnimationFrame(() => {
          scrollParent.scrollTop = scrollParent.scrollHeight;
        });
      }
    }, [editor]);

    useImperativeHandle(ref, () => ({
      getMarkdown: () => {
        if (!editor) return '';
        return editor.storage.markdown.getMarkdown();
      },
      setMarkdown: (md: string) => {
        if (!editor) return;
        bufferRef.current = md;
        editor.commands.setContent(md);
      },
      appendText: (text: string) => {
        bufferRef.current += text;
        if (flushTimerRef.current) return;
        flushTimerRef.current = setTimeout(() => {
          flushTimerRef.current = null;
          flushBuffer();
        }, 80);
      },
    }));

    useEffect(() => {
      return () => {
        if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      };
    }, []);

    return (
      <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <EditorContent editor={editor} />
      </div>
    );
  }
);

TiptapEditor.displayName = 'TiptapEditor';
export default TiptapEditor;
