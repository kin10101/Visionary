import { useCallback, useState } from 'react';
import { Upload, X } from 'lucide-react';

interface FileUploaderProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
}

export default function FileUploader({ files, onFilesChange }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      onFilesChange([...files, ...dropped]);
    },
    [files, onFilesChange]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selected = Array.from(e.target.files);
        onFilesChange([...files, ...selected]);
      }
    },
    [files, onFilesChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      onFilesChange(files.filter((_, i) => i !== index));
    },
    [files, onFilesChange]
  );

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={28} />
        <p className="text-sm text-gray-600">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Supports PDF, DOCX, MD, TXT, PNG, JPG
        </p>
        <input
          id="file-input"
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.md,.txt,.png,.jpg,.jpeg,.gif,.webp"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {files.map((file, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700"
            >
              {file.name}
              <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500">
                <X size={14} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
