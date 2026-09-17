// client/src/components/DocumentUpload.jsx
import { useRef, useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Documents } from '../lib/documents';

const ACCEPTED = '.pdf,.docx,.txt,.csv,.xlsx';

function UploadRow({ item }) {
  const icon =
    item.status === 'uploading' ? (
      <Loader2 className="h-4 w-4 animate-spin text-ink-faint" />
    ) : item.status === 'ready' ? (
      <CheckCircle2 className="h-4 w-4 text-teal-600" />
    ) : item.status === 'failed' ? (
      <XCircle className="h-4 w-4 text-error-600" />
    ) : (
      <Loader2 className="h-4 w-4 animate-spin text-gold-600" />
    );

  const statusLabel =
    item.status === 'uploading'
      ? 'Uploading…'
      : item.status === 'processing'
        ? 'Indexing for AI search…'
        : item.status === 'ready'
          ? 'Ready'
          : item.error || 'Failed';

  return (
    <div className="flex items-center gap-3 rounded-sm border border-border bg-surface px-3 py-2">
      <FileText className="h-4 w-4 shrink-0 text-ink-faint" />
      <span className="min-w-0 flex-1 truncate text-sm text-ink">{item.name}</span>
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-ink-soft">
        {icon}
        {statusLabel}
      </span>
    </div>
  );
}

export function DocumentUpload({ folderId, onUploaded }) {
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  async function uploadFiles(fileList) {
    const files = Array.from(fileList);
    for (const file of files) {
      const localId = `${file.name}-${Date.now()}`;
      setItems((prev) => [...prev, { id: localId, name: file.name, status: 'uploading' }]);

      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);

      try {
        const { document } = await Documents.upload(formData);
        setItems((prev) =>
          prev.map((it) => (it.id === localId ? { ...it, status: document.status } : it))
        );
        onUploaded?.(document);
      } catch (err) {
        setItems((prev) =>
          prev.map((it) =>
            it.id === localId ? { ...it, status: 'failed', error: err.message } : it
          )
        );
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragActive
            ? 'border-teal-600 bg-teal-50'
            : 'border-border-strong bg-surface hover:border-teal-600/50'
        }`}
      >
        <UploadCloud className="h-7 w-7 text-ink-faint" />
        <p className="text-sm font-medium text-ink">
          Drop files here, or <span className="text-teal-600">browse</span>
        </p>
        <p className="text-xs text-ink-faint">PDF, DOCX, TXT, CSV, or XLSX</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <div className="mt-3 space-y-2">
          {items.map((item) => (
            <UploadRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}