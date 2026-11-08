import {
    INDIA_ASSEMBLY_CONSTITUENCIES,
    INDIA_LOK_SABHA_CONSTITUENCIES,
    INDIA_CONSTITUENCY_SEGMENTS,
} from "@/data/constituencies";

import { INDIA_REGIONS } from "@/data/india2026";

export function validateIndiaConstituencies() {
    const errors: string[] = [];

    const assembly = INDIA_ASSEMBLY_CONSTITUENCIES;
    const parliamentary = INDIA_LOK_SABHA_CONSTITUENCIES;
    const segments = INDIA_CONSTITUENCY_SEGMENTS;

    const assemblyIds = new Set(assembly.map((item) => item.id));
    const parliamentaryIds = new Set(
        parliamentary.map((item) => item.id),
    );

    if (assemblyIds.size !== assembly.length) {
        errors.push("Duplicate Assembly constituency IDs.");
    }

    if (parliamentaryIds.size !== parliamentary.length) {
        errors.push("Duplicate Lok Sabha constituency IDs.");
    }

    for (const region of INDIA_REGIONS) {
        const actualAssembly = assembly.filter(
            (item) => item.stateId === region.id,
        ).length;

        const actualParliamentary = parliamentary.filter(
            (item) => item.stateId === region.id,
        ).length;

        if (actualParliamentary !== region.lokSabhaSeats) {
            errors.push(
                `${region.name}: expected ${region.lokSabhaSeats} Lok Sabha seats, found ${actualParliamentary}.`,
            );
        }

        if (
            region.assemblySeats !== null &&
            actualAssembly !== region.assemblySeats
        ) {
            errors.push(
                `${region.name}: expected ${region.assemblySeats} Assembly seats, found ${actualAssembly}.`,
            );
        }
    }

    for (const constituency of assembly) {
        // Special non-territorial constituencies do not have a
        // corresponding Lok Sabha constituency.
        if (constituency.lokSabhaConstituencyId === null) {
            continue;
        }

        if (
            !parliamentaryIds.has(
                constituency.lokSabhaConstituencyId,
            )
        ) {
            errors.push(
                `${constituency.name}: invalid Lok Sabha relationship.`,
            );
        }
    }

    for (const segment of segments) {
        if (!assemblyIds.has(segment.assemblyConstituencyId)) {
            errors.push(`Missing Assembly seat: ${segment.assemblyConstituencyId}`);
        }

        if (!parliamentaryIds.has(segment.lokSabhaConstituencyId)) {
            errors.push(`Missing Lok Sabha seat: ${segment.lokSabhaConstituencyId}`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        totals: {
            assembly: assembly.length,
            lokSabha: parliamentary.length,
            segments: segments.length,
        },
    };
}