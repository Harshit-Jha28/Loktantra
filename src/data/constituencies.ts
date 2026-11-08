import rawData from "@/data/raw/india_pc_crosswalk.json";
import { INDIA_REGIONS } from "@/data/india2026";

import type {
    AssemblyConstituency,
    ConstituencyDataset,
    ConstituencySegment,
    LokSabhaConstituency,
    ReservationCategory,
} from "@/types/constituency";

interface RawAssembly {
    ac_code: string;
    ac_no: number;
    ac_name: string;
    ac_reserved: string;
    district_order?: string;
}

interface RawParliamentary {
    pc_code: string;
    pc_no: number;
    pc_name: string;
    state_ut: string;
    reserved_status: string;
    districts_order?: string;
    acs: RawAssembly[];
}

interface RawDataset {
    version: string;
    generated_at: string;
    rows: RawParliamentary[];
}

const source = rawData as RawDataset;

// Normalize region names to make matching consistent.
function normalize(value: string): string {
    return value
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/[^a-z0-9]/g, "");
}

// Convert source state/UT names into IDs from INDIA_REGIONS.
function getStateId(stateName: string): string {
    const normalized = normalize(stateName);

    // Match using normalized region names.
    const region = INDIA_REGIONS.find((item) => {
        const regionName = normalize(item.name);

        return (
            regionName === normalized ||
            regionName.includes(normalized) ||
            normalized.includes(regionName)
        );
    });

    if (region) {
        return region.id;
    }

    // Explicit fallback for known source naming variations.
    const aliases: Record<string, string> = {
        andamannicobar: "Andaman and Nicobar Islands",
        andamannicobarislands: "Andaman and Nicobar Islands",
        andamannicobarterritory: "Andaman and Nicobar Islands",
        dadraandnagarhavelianddamananddiu:
            "Dadra and Nagar Haveli and Daman and Diu",
        dadranagarhavelianddamananddiu:
            "Dadra and Nagar Haveli and Daman and Diu",
        jammuandkashmir: "Jammu and Kashmir",
        delhinct: "Delhi",
        nationalcapitalterritoryofdelhi: "Delhi",
    };

    const aliasName = aliases[normalized];

    if (aliasName) {
        const aliasRegion = INDIA_REGIONS.find(
            (item) => normalize(item.name) === normalize(aliasName),
        );

        if (aliasRegion) {
            return aliasRegion.id;
        }
    }

    throw new Error(
        `Unknown region: "${stateName}". Available IDs: ${INDIA_REGIONS.map((item) => `${item.name} (${item.id})`).join(", ")
        }`,
    );
}

// Convert reservation labels into the game's reservation categories.
function parseReservation(value: string): ReservationCategory {
    const normalized = value?.toUpperCase().trim();

    if (normalized === "SC") return "sc";
    if (normalized === "ST") return "st";

    return "general";
}

// Build Lok Sabha constituencies.
const lokSabhaConstituencies: LokSabhaConstituency[] =
    source.rows.map((pc) => ({
        id: pc.pc_code,
        name: pc.pc_name,
        stateId: getStateId(pc.state_ut),
        constituencyNumber: pc.pc_no,
        districtNames: pc.districts_order
            ? pc.districts_order.split(";").map((name) => name.trim())
            : [],
        reservation: parseReservation(pc.reserved_status),
    }));

// Build Assembly constituencies and their Lok Sabha relationships.
const assemblyConstituencies: AssemblyConstituency[] = [];
const segments: ConstituencySegment[] = [];

for (const pc of source.rows) {
    const stateId = getStateId(pc.state_ut);

    for (const ac of pc.acs ?? []) {
        const assemblyId = ac.ac_code;

        assemblyConstituencies.push({
            id: assemblyId,
            name: ac.ac_name,
            stateId,
            constituencyNumber: ac.ac_no,
            districtNames: ac.district_order
                ? [ac.district_order]
                : [],
            reservation: parseReservation(ac.ac_reserved),
            lokSabhaConstituencyId: pc.pc_code,
        });

        segments.push({
            id: `${pc.pc_code}-${assemblyId}`,
            lokSabhaConstituencyId: pc.pc_code,
            assemblyConstituencyId: assemblyId,
        });
    }
}

// Sikkim's special non-territorial 32nd Assembly constituency (Sangha)
// Sangha represents the Buddhist monastic community across Sikkim and has no single PC or geographic territory.
const sikkimStateId = getStateId("Sikkim");
const sanghaExists = assemblyConstituencies.some(
    (item) => item.stateId === sikkimStateId && normalize(item.name) === "sangha"
);

if (!sanghaExists) {
    assemblyConstituencies.push({
        id: "sikkim-sangha-32",
        name: "Sangha",
        stateId: sikkimStateId,
        constituencyNumber: 32,
        districtNames: [],
        reservation: "sangha",
        lokSabhaConstituencyId: null,
    });
}

// Basic source-data integrity checks.
if (!Array.isArray(source.rows)) {
    throw new Error("Invalid constituency dataset: rows are missing.");
}

if (lokSabhaConstituencies.length !== 543) {
    console.warn(
        `Expected 543 Lok Sabha constituencies, found ${lokSabhaConstituencies.length}.`,
    );
}

const assemblyIds = new Set(
    assemblyConstituencies.map((item) => item.id),
);

if (assemblyIds.size !== assemblyConstituencies.length) {
    throw new Error("Duplicate Assembly constituency IDs found.");
}

const parliamentaryIds = new Set(
    lokSabhaConstituencies.map((item) => item.id),
);

if (parliamentaryIds.size !== lokSabhaConstituencies.length) {
    throw new Error("Duplicate Lok Sabha constituency IDs found.");
}

// Export the complete dataset.
export const INDIA_CONSTITUENCY_DATASET: ConstituencyDataset = {
    version: source.version,
    snapshotDate: source.generated_at
        ? source.generated_at.slice(0, 10)
        : "unknown",
    assemblyConstituencies,
    lokSabhaConstituencies,
    segments,
};

// Convenient individual exports.
export const INDIA_LOK_SABHA_CONSTITUENCIES =
    INDIA_CONSTITUENCY_DATASET.lokSabhaConstituencies;

export const INDIA_ASSEMBLY_CONSTITUENCIES =
    INDIA_CONSTITUENCY_DATASET.assemblyConstituencies;

export const INDIA_CONSTITUENCY_SEGMENTS =
    INDIA_CONSTITUENCY_DATASET.segments;

// Get Assembly constituencies belonging to a state/UT.
export function getAssemblyConstituenciesByState(stateId: string) {
    return INDIA_ASSEMBLY_CONSTITUENCIES.filter(
        (item) => item.stateId === stateId,
    );
}

// Get Lok Sabha constituencies belonging to a state/UT.
export function getLokSabhaConstituenciesByState(stateId: string) {
    return INDIA_LOK_SABHA_CONSTITUENCIES.filter(
        (item) => item.stateId === stateId,
    );
}

// Get Assembly segments belonging to a Lok Sabha constituency.
export function getAssemblySegmentsByLokSabha(
    lokSabhaConstituencyId: string,
) {
    return INDIA_ASSEMBLY_CONSTITUENCIES.filter(
        (item) =>
            item.lokSabhaConstituencyId === lokSabhaConstituencyId,
    );
}
