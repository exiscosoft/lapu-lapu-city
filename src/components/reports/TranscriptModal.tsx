import { ExternalLink, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useFdpText } from '../../hooks/useFdpData';
import type { CatalogDocument } from '../../types/fdp';

/** Shows a document's transcription (generated markdown) beside its PDF link. */
export default function TranscriptModal({
  document: doc,
  onClose,
}: {
  document: CatalogDocument | null;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { data, loading, error } = useFdpText(doc ? `md/${doc.id}.md` : null);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (doc && !el.open) el.showModal();
    if (!doc && el.open) el.close();
  }, [doc]);

  // Drop the YAML front matter and the title (shown in the header instead).
  const body = (data || '')
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/^# .*\n/, '');

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={e => e.target === dialog.current && onClose()}
      className="m-auto h-[90vh] w-[min(72rem,calc(100vw-2rem))] max-w-none rounded-lg p-0 shadow-xl backdrop:bg-black/50"
      aria-labelledby="transcript-title"
    >
      {doc && (
        <div className="flex h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-gray-200 p-4">
            <div className="min-w-0">
              <h2
                id="transcript-title"
                className="text-lg font-semibold text-gray-900"
              >
                {doc.title}
              </h2>
              <a
                href={doc.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
              >
                Open the official PDF
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="flex-1 overflow-auto p-4 text-sm">
            {loading && <p className="text-gray-500">Loading transcription…</p>}
            {error && (
              <p className="text-red-700">
                This document has not been transcribed yet. Use the official PDF
                link above.
              </p>
            )}
            {!loading && !error && (
              <div className="fdp-transcript space-y-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {body}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
