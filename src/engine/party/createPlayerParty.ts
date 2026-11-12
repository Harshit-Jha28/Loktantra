import type {
  CampaignState,
  PoliticalParty,
  PartyTreasury,
  CampaignEvent,
  PartyDistrictOffice,
} from "@/types/campaign";
import { getDistrictsForState } from "@/data/indiaDistricts";
import {
  generateCadreBatch,
  generateCadreMember,
} from "@/engine/party/cadreSystem";

export type PartyIdeology =
  | "Progressive"
  | "Centrist"
  | "Nationalist"
  | "Regionalist";

export interface CreatePlayerPartyInput {
  name: string;
  abbreviation: string;
  ideology: PartyIdeology;
  description: string;
  slogan: string;
  symbol: string;
  primaryColor: string;
  secondaryColor: string;
}

export function createPlayerParty(
  campaign: CampaignState,
  input: CreatePlayerPartyInput
): CampaignState {
  if (campaign.player.partyId) {
    throw new Error("A player party has already been founded.");
  }

  const name = input.name.trim();
  const abbreviation = input.abbreviation.trim().toUpperCase();

  if (name.length < 3 || name.length > 50) {
    throw new Error("Party name must be between 3 and 50 characters.");
  }

  if (abbreviation.length < 2 || abbreviation.length > 8) {
    throw new Error("Abbreviation must be between 2 and 8 characters.");
  }

  const duplicate = campaign.politicalWorld.parties.some(
    (party) =>
      party.name.toLowerCase() === name.toLowerCase() ||
      party.abbreviation.toLowerCase() === abbreviation.toLowerCase()
  );

  if (duplicate) {
    throw new Error("A party with that name or abbreviation already exists.");
  }

  const partyId = crypto.randomUUID();
  const foundingYear = Number(campaign.calendar.currentDate.slice(0, 4));
  const foundingStateId = campaign.player.foundingStateId;

  const party: PoliticalParty = {
    id: partyId,
    name,
    abbreviation,
    ideology: input.ideology,
    description: input.description.trim(),
    branding: {
      slogan: input.slogan.trim(),
      symbol: input.symbol,
      primaryColor: input.primaryColor,
      secondaryColor: input.secondaryColor,
    },
    foundedYear: foundingYear,
    headquartersStateId: foundingStateId,
    allianceId: null,
    organizationStrength: 5,
    electoralStrength: 2,
    popularity: 2,
    funds: 250000,
    isPlayerParty: true,
    isActive: true,
  };

  const treasury: PartyTreasury = {
    partyId,
    balance: 250000,
    transactions: [
      {
        id: crypto.randomUUID(),
        partyId,
        type: "income",
        category: "founding_funds",
        amount: 250000,
        description: "Initial seed treasury from founding members",
        date: campaign.calendar.currentDate,
      },
    ],
  };

  // Seed founding district and cadre committee
  const stateDistricts = getDistrictsForState(foundingStateId);
  const foundingDistrict = stateDistricts[0] ?? "Central District";

  const foundingOrganizer = generateCadreMember(
    partyId,
    foundingStateId,
    foundingDistrict,
    "district_organizer",
    campaign.calendar.currentDate
  );
  const foundingCoordinators = generateCadreBatch(
    partyId,
    foundingStateId,
    foundingDistrict,
    "booth_coordinator",
    2,
    campaign.calendar.currentDate
  );
  const foundingWorkers = generateCadreBatch(
    partyId,
    foundingStateId,
    foundingDistrict,
    "worker",
    2,
    campaign.calendar.currentDate
  );
  const foundingVolunteers = generateCadreBatch(
    partyId,
    foundingStateId,
    foundingDistrict,
    "volunteer",
    3,
    campaign.calendar.currentDate
  );

  const foundingCadre = [
    foundingOrganizer,
    ...foundingCoordinators,
    ...foundingWorkers,
    ...foundingVolunteers,
  ];

  const foundingOffice: PartyDistrictOffice = {
    id: `office-${crypto.randomUUID()}`,
    partyId,
    stateId: foundingStateId,
    districtName: foundingDistrict,
    establishedDate: campaign.calendar.currentDate,
    level: 2, // Headquarters
    cadreCount: foundingCadre.length,
  };

  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "party",
    title: `${abbreviation} has been founded!`,
    description: `${name} has officially been established with founding headquarters in ${foundingDistrict}, ${foundingStateId}. A founding committee of 8 dedicated cadre has been mobilized.`,
    importance: "high",
  };

  return {
    ...campaign,

    metadata: {
      ...campaign.metadata,
      updatedAt: new Date().toISOString(),
    },

    player: {
      ...campaign.player,
      partyId,
    },

    politicalWorld: {
      ...campaign.politicalWorld,
      parties: [...campaign.politicalWorld.parties, party],
    },

    organization: {
      ...campaign.organization,
      members: [...campaign.organization.members, ...foundingCadre],
      offices: [...(campaign.organization.offices ?? []), foundingOffice],
    },

    economy: {
      ...campaign.economy,
      treasuries: [...campaign.economy.treasuries, treasury],
    },

    history: {
      ...campaign.history,
      events: [...campaign.history.events, event],
    },
  };
}
