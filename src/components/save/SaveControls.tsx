
"use client";

import { useRef } from "react";
import {
  Download,
  FileUp,
  Save,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface SaveControlsProps {
  hasUnsavedChanges: boolean;
  isImporting: boolean;
  message: string | null;
  error: string | null;
  onSave: () => void;
  onLoad: (file: File) => void;
}

export default function SaveControls({
  hasUnsavedChanges,
  isImporting,
  message,
  error,
  onSave,
  onLoad,
}: SaveControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    if (file) {
      onLoad(file);
    }

    // Allows selecting the same file again.
    event.target.value = "";
  }

  return (
    <section className="border-[2px] border-[#392d25] bg-[#fff5e4] p-4 shadow-[5px_5px_0_#c9b99e]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#a9472c]">
            Campaign management
          </p>

          <h2 className="mt-1 font-serif text-xl text-[#392d25]">
            Your Campaign Save
          </h2>
        </div>

        <div
          className={`flex items-center gap-2 text-xs font-bold ${
            hasUnsavedChanges
              ? "text-[#b94e2e]"
              : "text-[#557c55]"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              hasUnsavedChanges
                ? "bg-[#d96b42]"
                : "bg-[#557c55]"
            }`}
          />

          {hasUnsavedChanges
            ? "UNSAVED CHANGES"
            : "ALL CHANGES SAVED"}
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="mt-4 flex items-start gap-3 border-2 border-[#d96b42] bg-[#fbe6d5] p-3">
          <AlertTriangle
            size={19}
            className="mt-0.5 shrink-0 text-[#b94e2e]"
          />

          <div>
            <p className="text-sm font-bold text-[#73351f]">
              Your political journey needs saving!
            </p>

            <p className="mt-1 text-xs text-[#805b48]">
              Your latest progress has not been downloaded.
              Save your campaign before leaving the game.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onSave}
          className="flex min-h-12 items-center justify-center gap-2 border-2 border-[#392d25] bg-[#d96b42] px-4 py-3 text-xs font-black uppercase tracking-wider text-white shadow-[3px_3px_0_#392d25] transition hover:-translate-y-0.5 hover:bg-[#c65c36] active:translate-y-0 active:shadow-none"
        >
          <Save size={17} />
          Save Campaign
          <Download size={15} />
        </button>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isImporting}
          className="flex min-h-12 items-center justify-center gap-2 border-2 border-[#392d25] bg-[#f1dfbd] px-4 py-3 text-xs font-black uppercase tracking-wider text-[#392d25] shadow-[3px_3px_0_#392d25] transition hover:-translate-y-0.5 hover:bg-[#e8d2a9] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <FileUp size={17} />
          {isImporting ? "Loading..." : "Load Save File"}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".lok,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {message && (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#557c55]">
          <CheckCircle2 size={15} />
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#b43d2b]">
          <AlertTriangle size={15} />
          {error}
        </p>
      )}

      <p className="mt-4 border-t border-dashed border-[#cbb997] pt-3 text-[10px] leading-relaxed text-[#806d59]">
        Your campaign is stored in a file on your device.
        Keep a backup of your latest .lok file. Loading an
        older save will replace the currently loaded campaign.
      </p>
    </section>
  );
}
