import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown } from 'tiptap-markdown';
import { useEffect, useImperativeHandle, forwardRef } from 'react';

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
    const editor = useEditor({
      extensions: [
        StarterKit,
        Markdown,
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

    useImperativeHandle(ref, () => ({
      getMarkdown: () => {
        if (!editor) return '';
        return editor.storage.markdown.getMarkdown();
      },
      setMarkdown: (md: string) => {
        if (!editor) return;
        editor.commands.setContent(md);
      },
      appendText: (text: string) => {
        if (!editor) return;
        const currentMd = editor.storage.markdown.getMarkdown();
        editor.commands.setContent(currentMd + text);
      },
    }));

    return (
      <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <EditorContent editor={editor} />
      </div>
    );
  }
);

TiptapEditor.displayName = 'TiptapEditor';
export default TiptapEditor;
