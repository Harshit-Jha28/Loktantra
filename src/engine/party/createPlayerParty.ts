
import type {
  CampaignState,
  PoliticalParty,
  PartyTreasury,
  CampaignEvent,
} from "@/types/campaign";

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
    headquartersStateId: campaign.player.foundingStateId,
    allianceId: null,
    organizationStrength: 1,
    electoralStrength: 1,
    popularity: 1,
    funds: 250000,
    isPlayerParty: true,
    isActive: true,
  };

  const treasury: PartyTreasury = {
    partyId,
    balance: 250000,
    transactions: [],
  };

  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "party",
    title: `${abbreviation} has been founded!`,
    description: `${name} has officially been established in ${campaign.player.foundingStateId}. Its political journey begins.`,
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
