import type { CampaignState, FinanceTransaction, CampaignEvent, PartyMember } from "@/types/campaign";
import {
  generateCadreBatch,
  buildDistrictOffice,
} from "@/engine/party/cadreSystem";

export type PoliticalActionType =
  | "membership_drive"
  | "district_office"
  | "public_rally"
  | "media_campaign"
  | "policy_convention";

export interface PoliticalActionDefinition {
  type: PoliticalActionType;
  name: string;
  cost: number;
  description: string;
  effectSummary: string;
}

export const POLITICAL_ACTIONS: PoliticalActionDefinition[] = [
  {
    type: "membership_drive",
    name: "Grassroots Membership Drive",
    cost: 15000,
    description: "Deploy youth organizers into neighborhoods to enroll registered voters and recruit grassroots volunteers into party committees.",
    effectSummary: "+75 to 150 active party members, +5 dedicated volunteers, +2 organization strength, +1 popularity.",
  },
  {
    type: "district_office",
    name: "Open District Party Office",
    cost: 45000,
    description: "Establish a permanent district headquarters in any chosen district across India with staff, meeting hall, and communication center.",
    effectSummary: "Select any district in India, +5 organization strength, deploys 1 District Organizer and 3 active Cadre Workers.",
  },
  {
    type: "public_rally",
    name: "Organize Public Mass Rally",
    cost: 75000,
    description: "Erect a stage, hire sound systems, and mobilize thousands of citizens for a major speech by party leadership.",
    effectSummary: "+3 to 5 popularity in state, +4 grassroots cadre, boosts upcoming electoral vote share.",
  },
  {
    type: "media_campaign",
    name: "Launch State Press & Digital Campaign",
    cost: 60000,
    description: "Broadcast advertisements across regional newspapers, social channels, and local television networks.",
    effectSummary: "+2 national popularity, elevates candidate visibility across constituencies.",
  },
  {
    type: "policy_convention",
    name: "Hold Policy & Manifesto Convention",
    cost: 30000,
    description: "Convene delegates, trade representatives, and intellectuals to formulate the party's official policy agenda.",
    effectSummary: "+3 organization strength, +2 credibility, solidifies ideological standing.",
  },
];

export function executePoliticalAction(
  campaign: CampaignState,
  actionType: PoliticalActionType,
  targetStateId?: string,
  targetDistrictName?: string,
): { campaign: CampaignState; resultMessage: string } {
  if (!campaign.player.partyId) {
    throw new Error("You must establish your political party before taking actions.");
  }

  const stateId = targetStateId ?? campaign.player.foundingStateId;

  // Delegate district office directly to buildDistrictOffice if district is specified
  if (actionType === "district_office" && targetDistrictName) {
    return buildDistrictOffice(campaign, stateId, targetDistrictName);
  }

  const actionDef = POLITICAL_ACTIONS.find((a) => a.type === actionType);
  if (!actionDef) {
    throw new Error("Unknown political action.");
  }

  const treasuryIndex = campaign.economy.treasuries.findIndex(
    (t) => t.partyId === campaign.player.partyId,
  );
  if (treasuryIndex === -1) {
    throw new Error("Party treasury record could not be found.");
  }

  const treasury = campaign.economy.treasuries[treasuryIndex];
  if (treasury.balance < actionDef.cost) {
    throw new Error(
      `Insufficient party funds. Required: ₹${actionDef.cost.toLocaleString("en-IN")}, Available: ₹${treasury.balance.toLocaleString("en-IN")}.`,
    );
  }

  const newBalance = treasury.balance - actionDef.cost;

  const transaction: FinanceTransaction = {
    id: crypto.randomUUID(),
    partyId: campaign.player.partyId,
    type: "expense",
    category: "campaign_action",
    amount: actionDef.cost,
    description: `${actionDef.name} (${stateId}${targetDistrictName ? ` - ${targetDistrictName}` : ""})`,
    date: campaign.calendar.currentDate,
  };

  const updatedTreasuries = [...campaign.economy.treasuries];
  updatedTreasuries[treasuryIndex] = {
    ...treasury,
    balance: newBalance,
    transactions: [...treasury.transactions, transaction],
  };

  let newMembers: PartyMember[] = [];
  let orgStrengthGain = 0;
  let popularityGain = 0;
  let electoralGain = 0;
  let resultMessage = "";

  switch (actionType) {
    case "membership_drive": {
      const count = Math.floor(75 + Math.random() * 75);
      orgStrengthGain = 2;
      popularityGain = 1;
      electoralGain = 1;

      // Generate authentic cadre volunteers in this state/district
      newMembers = generateCadreBatch(
        campaign.player.partyId,
        stateId,
        targetDistrictName ?? null,
        "volunteer",
        5,
        campaign.calendar.currentDate,
      );

      resultMessage = `Grassroots membership drive in ${stateId} enrolled ${count} registered members and recruited 5 active volunteers into your local committees!`;
      break;
    }
    case "district_office": {
      orgStrengthGain = 5;
      electoralGain = 2;
      const district = targetDistrictName ?? "Central District";

      // Generate 1 district organizer and 2 workers
      const organizer = generateCadreBatch(campaign.player.partyId, stateId, district, "district_organizer", 1, campaign.calendar.currentDate);
      const workers = generateCadreBatch(campaign.player.partyId, stateId, district, "worker", 2, campaign.calendar.currentDate);
      newMembers = [...organizer, ...workers];

      resultMessage = `New district party office inaugurated in ${district}, ${stateId}. Organizational reach expanded.`;
      break;
    }
    case "public_rally": {
      popularityGain = Math.floor(3 + Math.random() * 3);
      electoralGain = 3;
      orgStrengthGain = 1;

      // Mass rally inspires 3 volunteers and 1 active worker
      const volunteers = generateCadreBatch(campaign.player.partyId, stateId, targetDistrictName ?? null, "volunteer", 3, campaign.calendar.currentDate);
      const worker = generateCadreBatch(campaign.player.partyId, stateId, targetDistrictName ?? null, "worker", 1, campaign.calendar.currentDate);
      newMembers = [...volunteers, ...worker];

      resultMessage = `Mass rally held in ${stateId} with thousands in attendance! Public enthusiasm is surging (+${popularityGain} popularity, 4 new volunteers enrolled).`;
      break;
    }
    case "media_campaign": {
      popularityGain = 2;
      electoralGain = 2;
      resultMessage = `Statewide digital and print campaign successfully placed across major news networks.`;
      break;
    }
    case "policy_convention": {
      orgStrengthGain = 3;
      popularityGain = 1;
      resultMessage = `Delegates adopted the official party policy charter at the ${stateId} convention.`;
      break;
    }
  }

  const updatedParties = campaign.politicalWorld.parties.map((p) => {
    if (p.id === campaign.player.partyId) {
      return {
        ...p,
        funds: newBalance,
        organizationStrength: Math.min(100, p.organizationStrength + orgStrengthGain),
        popularity: Math.min(100, p.popularity + popularityGain),
        electoralStrength: Math.min(100, p.electoralStrength + electoralGain),
      };
    }
    return p;
  });

  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "campaign_action",
    title: actionDef.name,
    description: `${resultMessage} (Cost: ₹${actionDef.cost.toLocaleString("en-IN")})`,
    importance: "medium",
  };

  const updatedCampaign: CampaignState = {
    ...campaign,
    politicalWorld: {
      ...campaign.politicalWorld,
      parties: updatedParties,
    },
    organization: {
      ...campaign.organization,
      members: [...campaign.organization.members, ...newMembers],
    },
    economy: {
      ...campaign.economy,
      treasuries: updatedTreasuries,
    },
    history: {
      ...campaign.history,
      events: [...campaign.history.events, event],
    },
  };

  return { campaign: updatedCampaign, resultMessage };
}
