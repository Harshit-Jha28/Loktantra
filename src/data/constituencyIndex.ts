import { INDIA_REGIONS } from "@/data/india2026";
import { INDIA_CONSTITUENCY_DATASET } from "@/data/constituencies";

import type {
  ConstituencyDataset,
  ConstituencyValidationResult,
} from "@/types/constituency";

export const CONSTITUENCY_DATA_VERSION = "india-constituencies-v1";
export const CONSTITUENCY_SNAPSHOT_DATE = "2026-11-07";

/**
 * Expected constituency counts for every state and UT.
 * Values are sourced from the existing static India snapshot.
 */
export const CONSTITUENCY_INDEX = INDIA_REGIONS.map((region) => ({
  stateId: region.id,
  stateName: region.name,
  regionType: region.kind,

  expectedAssemblySeats: region.assemblySeats ?? 0,
  expectedLokSabhaSeats: region.lokSabhaSeats,
}));

export const EXPECTED_ASSEMBLY_SEATS =
  CONSTITUENCY_INDEX.reduce(
    (total, region) => total + region.expectedAssemblySeats,
    0,
  );

export const EXPECTED_LOK_SABHA_SEATS =
  CONSTITUENCY_INDEX.reduce(
    (total, region) => total + region.expectedLokSabhaSeats,
    0,
  );

/**
 * Validates the actual constituency records before they are
 * used by the political simulation.
 */
export function validateConstituencyDataset(
  dataset: ConstituencyDataset = INDIA_CONSTITUENCY_DATASET,
): ConstituencyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const assembly = dataset.assemblyConstituencies;
  const lokSabha = dataset.lokSabhaConstituencies;
  const segments = dataset.segments;

  const assemblyIds = new Set(assembly.map((item) => item.id));
  const lokSabhaIds = new Set(lokSabha.map((item) => item.id));

  if (assemblyIds.size !== assembly.length) {
    errors.push("Duplicate Assembly constituency IDs found.");
  }

  if (lokSabhaIds.size !== lokSabha.length) {
    errors.push("Duplicate Lok Sabha constituency IDs found.");
  }

  // Validate state-wise seat totals.
  for (const region of CONSTITUENCY_INDEX) {
    const actualAssembly = assembly.filter(
      (item) => item.stateId === region.stateId,
    ).length;

    const actualLokSabha = lokSabha.filter(
      (item) => item.stateId === region.stateId,
    ).length;

    if (actualAssembly !== region.expectedAssemblySeats) {
      errors.push(
        `${region.stateName}: expected ${region.expectedAssemblySeats} Assembly seats, found ${actualAssembly}.`,
      );
    }

    if (actualLokSabha !== region.expectedLokSabhaSeats) {
      errors.push(
        `${region.stateName}: expected ${region.expectedLokSabhaSeats} Lok Sabha seats, found ${actualLokSabha}.`,
      );
    }
  }

  // Validate Assembly -> Lok Sabha relationships.
  for (const constituency of assembly) {
    if (constituency.lokSabhaConstituencyId === null) {
      // Special non-territorial seats (like Sangha in Sikkim) do not have a territorial PC
      continue;
    }
    if (!lokSabhaIds.has(constituency.lokSabhaConstituencyId)) {
      errors.push(
        `${constituency.name}: linked Lok Sabha constituency does not exist.`,
      );
    }
  }

  // Validate segment relationships.
  const segmentIds = new Set<string>();

  for (const segment of segments) {
    if (segmentIds.has(segment.id)) {
      errors.push(`Duplicate segment ID: ${segment.id}`);
    }

    segmentIds.add(segment.id);

    if (!lokSabhaIds.has(segment.lokSabhaConstituencyId)) {
      errors.push(
        `Segment ${segment.id}: Lok Sabha constituency does not exist.`,
      );
    }

    if (!assemblyIds.has(segment.assemblyConstituencyId)) {
      errors.push(
        `Segment ${segment.id}: Assembly constituency does not exist.`,
      );
    }

    const assemblySeat = assembly.find(
      (item) => item.id === segment.assemblyConstituencyId,
    );

    const lokSabhaSeat = lokSabha.find(
      (item) => item.id === segment.lokSabhaConstituencyId,
    );

    if (
      assemblySeat &&
      lokSabhaSeat &&
      assemblySeat.stateId !== lokSabhaSeat.stateId
    ) {
      errors.push(
        `Segment ${segment.id}: Assembly and Lok Sabha constituencies belong to different states.`,
      );
    }
  }

  // Every territorial Assembly seat must belong to exactly one Lok Sabha segment.
  for (const constituency of assembly) {
    if (constituency.lokSabhaConstituencyId === null) {
      continue;
    }
    const matchingSegments = segments.filter(
      (segment) =>
        segment.assemblyConstituencyId === constituency.id,
    );

    if (matchingSegments.length !== 1) {
      errors.push(
        `${constituency.name}: expected exactly one Lok Sabha segment relationship, found ${matchingSegments.length}.`,
      );
    }
  }

  // Every Lok Sabha seat with an elected assembly should have segments.
  for (const constituency of lokSabha) {
    const matchingSegments = segments.filter(
      (segment) =>
        segment.lokSabhaConstituencyId === constituency.id,
    );

    if (matchingSegments.length === 0) {
      warnings.push(
        `${constituency.name}: no Assembly segments have been assigned yet.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    totals: {
      assembly: assembly.length,
      lokSabha: lokSabha.length,
      segments: segments.length,
    },
  };
}
