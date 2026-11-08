
export const SAVE_FILE_EXTENSION = ".lok";
export const SAVE_FORMAT_VERSION = 1;
export const MAX_SAVE_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

/**
 * The structure stored inside every .lok save file.
 */
export interface LoktantraSave<T extends object = Record<string, unknown>> {
  format: "loktantra-save";
  formatVersion: number;
  gameVersion: string;
  createdAt: string;
  savedAt: string;
  campaignName: string;
  campaign: T;
}

/**
 * Result returned when validating a save file.
 */
export interface SaveValidationResult<T extends object> {
  valid: boolean;
  save?: LoktantraSave<T>;
  error?: string;
}

/**
 * Safely converts unknown input into a plain object.
 */
function isPlainObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

/**
 * Creates a save envelope around the current campaign.
 */
export function createSaveEnvelope<T extends object>(
  campaign: T,
  existingCreatedAt?: string
): LoktantraSave<T> {
  const now = new Date().toISOString();

  const campaignRecord = campaign as Record<string, unknown>;

  const metadata = isPlainObject(campaignRecord.metadata)
    ? campaignRecord.metadata
    : {};

  const campaignName =
    typeof metadata.campaignName === "string" &&
    metadata.campaignName.trim().length > 0
      ? metadata.campaignName.trim()
      : "Untitled Campaign";

  const createdAt =
    existingCreatedAt ??
    (typeof metadata.createdAt === "string"
      ? metadata.createdAt
      : now);

  const gameVersion =
    typeof metadata.gameVersion === "string"
      ? metadata.gameVersion
      : "0.1.0";

  return {
    format: "loktantra-save",
    formatVersion: SAVE_FORMAT_VERSION,
    gameVersion,
    createdAt,
    savedAt: now,
    campaignName,
    campaign,
  };
}

/**
 * Migrates an older save format to the current format.
 *
 * Version 1 is currently the first supported format.
 * Add future migration steps here when the save structure changes.
 */
export function migrateSave<T extends object>(
  rawSave: Record<string, unknown>
): LoktantraSave<T> {
  const version = rawSave.formatVersion;

  if (typeof version !== "number") {
    throw new Error("Save file is missing its format version.");
  }

  if (version > SAVE_FORMAT_VERSION) {
    throw new Error(
      `This save was created with a newer version of LOKTANTRA. ` +
        `Save version: ${version}, supported version: ${SAVE_FORMAT_VERSION}.`
    );
  }

  if (version < 1) {
    throw new Error("This save file uses an unsupported format.");
  }

  // Version 1 requires no migration.
  return rawSave as unknown as LoktantraSave<T>;
}

/**
 * Validates the outer save-file structure and migrates it if needed.
 */
export function validateSave<T extends object = Record<string, unknown>>(
  raw: unknown
): SaveValidationResult<T> {
  if (!isPlainObject(raw)) {
    return {
      valid: false,
      error: "The selected file is not a valid LOKTANTRA save.",
    };
  }

  if (raw.format !== "loktantra-save") {
    return {
      valid: false,
      error: "This file is not a LOKTANTRA save file.",
    };
  }

  if (typeof raw.formatVersion !== "number") {
    return {
      valid: false,
      error: "The save file has no valid format version.",
    };
  }

  if (raw.formatVersion > SAVE_FORMAT_VERSION) {
    return {
      valid: false,
      error:
        "This save file was created by a newer version of LOKTANTRA. Update your game to load it.",
    };
  }

  if (!isPlainObject(raw.campaign)) {
    return {
      valid: false,
      error: "The save file does not contain valid campaign data.",
    };
  }

  if (typeof raw.createdAt !== "string" ||
      typeof raw.savedAt !== "string") {
    return {
      valid: false,
      error: "The save file is missing its creation or save timestamp.",
    };
  }

  try {
    const migratedSave = migrateSave<T>(raw);

    return {
      valid: true,
      save: migratedSave,
    };
  } catch (error) {
    return {
      valid: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to validate this save file.",
    };
  }
}

/**
 * Downloads campaign data as a .lok file.
 */
export function downloadSaveFile<T extends object>(
  save: LoktantraSave<T>
): void {
  const json = JSON.stringify(save, null, 2);

  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const safeName = save.campaignName
    .trim()
    .replace(/[^a-z0-9-_ ]/gi, "")
    .replace(/\s+/g, "_")
    .slice(0, 60) || "LOKTANTRA_Campaign";

  const date = new Date()
    .toISOString()
    .slice(0, 10);

  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = `${safeName}_${date}${SAVE_FILE_EXTENSION}`;

  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Reads and validates a .lok file selected by the player.
 */
export async function readSaveFile<T extends object = Record<string, unknown>>(
  file: File
): Promise<LoktantraSave<T>> {
  if (!file.name.toLowerCase().endsWith(SAVE_FILE_EXTENSION)) {
    throw new Error("Please select a valid .lok save file.");
  }

  if (file.size === 0) {
    throw new Error("The selected save file is empty.");
  }

  if (file.size > MAX_SAVE_FILE_SIZE) {
    throw new Error("The save file exceeds the 25 MB size limit.");
  }

  let parsed: unknown;

  try {
    const content = await file.text();
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      "Unable to read this save file. It may be damaged or corrupted."
    );
  }

  const result = validateSave<T>(parsed);

  if (!result.valid || !result.save) {
    throw new Error(
      result.error ?? "The selected save file is invalid."
    );
  }

  return result.save;
}
