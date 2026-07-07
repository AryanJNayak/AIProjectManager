import type { Dispatch, SetStateAction } from "react";
import type { ExportPreviewResult } from "../api/tasksApi";

interface ExportPreviewModalProps {
  exportPreview: ExportPreviewResult;
  isDownloading: boolean;
  onDownload: () => void;
  onClose: () => void;
}

export function ExportPreviewModal({
  exportPreview,
  isDownloading,
  onDownload,
  onClose,
}: ExportPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <div className="border-b border-slate-800 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-100">
            Export preview
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Review the generated file details and download when ready.
          </p>
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                File
              </p>
              <p className="mt-2 text-sm text-slate-100">
                {exportPreview.filename}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {exportPreview.format.toUpperCase()} ·{" "}
                {(exportPreview.size / 1024).toFixed(1)} KB
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Created at: {new Date(exportPreview.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Summary
              </p>
              <div className="mt-3 space-y-2 text-sm text-slate-300">
                {exportPreview.tables.map((table) => (
                  <div
                    key={table.name}
                    className="flex items-center justify-between rounded-xl bg-slate-950/80 px-3 py-2"
                  >
                    <span>{table.name}</span>
                    <span className="font-mono text-sm text-slate-400">
                      {table.records}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Download link
            </p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onDownload}
                disabled={isDownloading}
                className="inline-flex w-full items-center justify-center rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDownloading ? "Downloading…" : "Download file"}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
