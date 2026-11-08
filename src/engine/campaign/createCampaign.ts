import type {
  CampaignState,
  PoliticalParty,
  PoliticalAlliance,
  StateGovernment,
  PoliticalLeader,
  PartyTreasury,
} from "@/types/campaign";

import {
  INDIA_PARTIES,
  INDIA_REGIONS,
  INDIA_ASSEMBLY_TERM_ENDS,
  INDIA_WORLD_SNAPSHOT_DATE,
  INDIA_WORLD_VERSION,
} from "@/data/india2026";
import { seedConstituencyControl } from "./seedConstituencyControl";

export interface CreateCampaignOptions {
  campaignName: string;
  foundingStateId: string;
}

export function createCampaign(
  options: CreateCampaignOptions,
): CampaignState {
  const now = new Date().toISOString();
  const startDate = "2027-01-01";
  const campaignId = crypto.randomUUID();

  const parties: PoliticalParty[] = INDIA_PARTIES.map((seed) => ({
    id: seed.id,
    name: seed.name,
    abbreviation: seed.abbreviation,
    ideology: seed.ideology,
    description: seed.description,

    branding: {
      slogan: seed.slogan,
      symbol: seed.symbol,
      primaryColor: seed.primaryColor,
      secondaryColor: seed.secondaryColor,
    },

    foundedYear: 2000,
    headquartersStateId: null,
    allianceId: seed.allianceId,

    organizationStrength: seed.organizationStrength,
    electoralStrength: seed.electoralStrength,
    popularity: seed.popularity,

    funds: 25_000_000,
    isPlayerParty: false,
    isActive: true,
  }));

  // Build alliance membership from the party seed data.
  const allianceGroups = new Map<string, string[]>();

  for (const party of INDIA_PARTIES) {
    if (!party.allianceId) continue;

    const existingMembers = allianceGroups.get(party.allianceId) ?? [];
    existingMembers.push(party.id);
    allianceGroups.set(party.allianceId, existingMembers);
  }

  const allianceNames: Record<
    string,
    { name: string; abbreviation: string }
  > = {
    "national-democratic-alliance": {
      name: "National Democratic Alliance",
      abbreviation: "NDA",
    },
    "progressive-united-front": {
      name: "Progressive United Front",
      abbreviation: "PUF",
    },
    "eastern-regional-front": {
      name: "Eastern Regional Front",
      abbreviation: "ERF",
    },
    "meghalaya-democratic-alliance": {
      name: "Meghalaya Democratic Alliance",
      abbreviation: "MDA",
    },
    "progressive-democratic-alliance": {
      name: "Progressive Democratic Alliance",
      abbreviation: "PDA",
    },
  };

  const alliances: PoliticalAlliance[] = Array.from(
    allianceGroups.entries(),
  ).map(([allianceId, memberPartyIds]) => {
    const allianceDetails = allianceNames[allianceId];

    return {
      id: allianceId,
      name: allianceDetails?.name ?? allianceId,
      abbreviation: allianceDetails?.abbreviation ?? allianceId
        .split("-")
        .map((word) => word[0])
        .join("")
        .toUpperCase(),
      memberPartyIds,
      leaderPartyId: memberPartyIds[0] ?? null,
      isActive: true,
    };
  });

  const stateGovernments: StateGovernment[] = INDIA_REGIONS.map(
    (region) => ({
      stateId: region.id,
      rulingPartyId: region.rulingPartyId,
      rulingAllianceId: region.allianceId,
      chiefMinisterName: region.chiefMinisterName,
      governmentType: region.governmentType,
      assemblyTermEnd: INDIA_ASSEMBLY_TERM_ENDS[region.id] ?? null,
    }),
  );

  // Add the fictional Chief Ministers to the campaign's leader registry.
  const leaders: PoliticalLeader[] = INDIA_REGIONS
    .filter(
      (region) =>
        region.chiefMinisterName !== null &&
        region.rulingPartyId !== null,
    )
    .map((region) => ({
      id: `leader-cm-${region.id}`,
      partyId: region.rulingPartyId as string,
      name: region.chiefMinisterName as string,
      role: `Chief Minister · ${region.leaderArchetype ?? "consensus_builder"}`,
      stateId: region.id,
      popularity: 65,
      experience: 70,
      loyalty: 85,
    }));

  // Initial baseline party treasuries for AI parties
  const treasuries: PartyTreasury[] = parties.map((party) => ({
    partyId: party.id,
    balance: party.funds,
    transactions: [
      {
        id: crypto.randomUUID(),
        partyId: party.id,
        type: "income",
        category: "founding_funds",
        amount: party.funds,
        description: "Initial party treasury reserve",
        date: startDate,
      },
    ],
  }));

  // Seed deterministic starting constituency control for all 4,123 ACs & 543 PCs
  const constituencyControl = seedConstituencyControl();

  return {
    schemaVersion: 1,

    metadata: {
      id: campaignId,
      campaignName: options.campaignName.trim(),
      createdAt: now,
      updatedAt: now,
      gameVersion: `0.1.0+${INDIA_WORLD_VERSION}`,
    },

    calendar: {
      currentDate: startDate,
      startDate,
      currentTurn: 0,
      paused: false,
    },

    player: {
      partyId: null,
      foundingStateId: options.foundingStateId,
    },

    politicalWorld: {
      parties,
      alliances,
      stateGovernments,
      constituencyControl,
      relationships: [],
    },

    organization: {
      members: [],
      leaders,
    },

    economy: {
      treasuries,
    },

    elections: [],

    history: {
      events: [
        {
          id: crypto.randomUUID(),
          date: startDate,
          category: "campaign",
          title: "A new political journey begins",
          description:
            `The player has entered the political arena. The political world is initialised using the ${INDIA_WORLD_VERSION} snapshot, dated ${INDIA_WORLD_SNAPSHOT_DATE}.`,
          importance: "high",
        },
        {
          id: crypto.randomUUID(),
          date: startDate,
          category: "politics",
          title: "The national political landscape is established",
          description:
            `The simulation has initialised ${INDIA_REGIONS.length} states and Union Territories, ${parties.length} political parties, ${alliances.length} political alliances, and ${constituencyControl.length} legislative constituencies.`,
          importance: "high",
        },
      ],
    },
  };
}
