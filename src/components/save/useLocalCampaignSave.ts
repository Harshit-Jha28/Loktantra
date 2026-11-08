"use client";

import { useCallback, useState } from "react";

import {
  type CampaignData,
  createSaveEnvelope,
  downloadSaveFile,
  readSaveFile,
} from "./saveFormat";

export function useLocalCampaignSave<T extends CampaignData>(
  campaign: T | null,
  onLoadCampaign: (campaign: T) => void,
) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const markDirty = useCallback(() => {
    setHasUnsavedChanges(true);
    setMessage("Your campaign has unsaved changes.");
    setError(null);
  }, []);

  const saveNow = useCallback(() => {
    if (!campaign) {
      setError("There is no active campaign to save.");
      return;
    }

    try {
      const save = createSaveEnvelope(campaign);
      downloadSaveFile(save);
      setHasUnsavedChanges(false);
      setError(null);
      setMessage("Campaign save downloaded successfully.");
    } catch {
      setError("Unable to export your campaign.");
    }
  }, [campaign]);

  const loadFile = useCallback(
    async (file: File) => {
      setIsImporting(true);
      setError(null);
      setMessage(null);

      try {
        const save = await readSaveFile(file);

        // Pass validated campaign data to the game.
        onLoadCampaign(save.campaign as T);

        setHasUnsavedChanges(false);
        setMessage(`Loaded campaign: ${save.campaignName}`);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load this campaign.",
        );
      } finally {
        setIsImporting(false);
      }
    },
    [onLoadCampaign],
  );

  return {
    hasUnsavedChanges,
    isImporting,
    message,
    error,
    markDirty,
    saveNow,
    loadFile,
    clearMessages: () => {
      setMessage(null);
      setError(null);
    },
  };
}
