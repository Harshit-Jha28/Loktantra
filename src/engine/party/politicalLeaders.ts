import type { CampaignState, PoliticalLeader, FinanceTransaction, CampaignEvent } from "@/types/campaign";
import type { LeaderArchetype } from "@/data/india2026";

export interface RecruitableLeaderTemplate {
  id: string;
  name: string;
  archetype: LeaderArchetype;
  stateId: string;
  popularity: number;
  experience: number;
  loyalty: number;
  recruitmentCost: number;
  description: string;
  perkDescription: string;
}

export const RECRUITABLE_LEADERS: RecruitableLeaderTemplate[] = [
  {
    id: "leader-ananya-sen",
    name: "Ananya Sen",
    archetype: "grassroots_organiser",
    stateId: "west-bengal",
    popularity: 58,
    experience: 52,
    loyalty: 88,
    recruitmentCost: 35000,
    description: "Former student movement coordinator with deep ties to rural union branches and booth workers.",
    perkDescription: "+15% volunteer recruitment and reduced rally costs in eastern states.",
  },
  {
    id: "leader-vikram-shekhawat",
    name: "Vikram Shekhawat",
    archetype: "coalition_broker",
    stateId: "rajasthan",
    popularity: 54,
    experience: 74,
    loyalty: 76,
    recruitmentCost: 60000,
    description: "Seasoned parliamentary liaison with twenty years of legislative experience across multiple state assemblies.",
    perkDescription: "Improves alliance negotiation success and post-election coalition viability.",
  },
  {
    id: "leader-meera-nambiar",
    name: "Meera Nambiar",
    archetype: "technocratic_reformer",
    stateId: "karnataka",
    popularity: 62,
    experience: 65,
    loyalty: 82,
    recruitmentCost: 50000,
    description: "Public policy economist and former administrative advisor specializing in urban infrastructure.",
    perkDescription: "Boosts party credibility and policy campaign effectiveness.",
  },
  {
    id: "leader-kavita-patil",
    name: "Kavita Patil",
    archetype: "charismatic_populist",
    stateId: "maharashtra",
    popularity: 70,
    experience: 48,
    loyalty: 80,
    recruitmentCost: 75000,
    description: "Electrifying public orator who draws massive crowds at farmer rallies and youth conventions.",
    perkDescription: "+25% attendance and public awareness from rallies.",
  },
  {
    id: "leader-harbhajan-dhillon",
    name: "Harbhajan Dhillon",
    archetype: "welfare_mobiliser",
    stateId: "punjab",
    popularity: 60,
    experience: 58,
    loyalty: 85,
    recruitmentCost: 40000,
    description: "Respected cooperative society leader dedicated to rural credit networks and health dispensaries.",
    perkDescription: "Lowers district office running costs and boosts grassroots goodwill.",
  },
  {
    id: "leader-subhash-tiwari",
    name: "Subhash Tiwari",
    archetype: "institutional_veteran",
    stateId: "uttar-pradesh",
    popularity: 52,
    experience: 78,
    loyalty: 90,
    recruitmentCost: 65000,
    description: "Former state assembly deputy speaker with comprehensive knowledge of election regulations and district politics.",
    perkDescription: "Reduces candidate nomination penalties and legal risks.",
  },
  {
    id: "leader-selva-kumaran",
    name: "Selva Kumaran",
    archetype: "regional_identity_advocate",
    stateId: "tamil-nadu",
    popularity: 66,
    experience: 55,
    loyalty: 84,
    recruitmentCost: 45000,
    description: "Cultural advocate and publisher with strong grassroots credibility across southern districts.",
    perkDescription: "+20% regional voter resonance in federal and regional outreach.",
  },
  {
    id: "leader-tarun-gogoi-deuri",
    name: "Tarun Gogoi Deuri",
    archetype: "consensus_builder",
    stateId: "assam",
    popularity: 56,
    experience: 64,
    loyalty: 86,
    recruitmentCost: 40000,
    description: "Respected mediator who bridges linguistic and tribal community councils across the northeast.",
    perkDescription: "Prevents internal party disputes and stabilizes regional alliances.",
  },
];

export function recruitLeader(
  campaign: CampaignState,
  leaderTemplateId: string,
): CampaignState {
  if (!campaign.player.partyId) {
    throw new Error("You must establish a political party before recruiting leaders.");
  }

  const template = RECRUITABLE_LEADERS.find((l) => l.id === leaderTemplateId);
  if (!template) {
    throw new Error("Leader not found in the national directory.");
  }

  // Check if leader already recruited
  const alreadyRecruited = campaign.organization.leaders.some(
    (l) => l.id === template.id,
  );
  if (alreadyRecruited) {
    throw new Error(`${template.name} has already joined your party.`);
  }

  // Check party treasury
  const treasuryIndex = campaign.economy.treasuries.findIndex(
    (t) => t.partyId === campaign.player.partyId,
  );
  if (treasuryIndex === -1) {
    throw new Error("Party treasury record could not be found.");
  }

  const treasury = campaign.economy.treasuries[treasuryIndex];
  if (treasury.balance < template.recruitmentCost) {
    throw new Error(
      `Insufficient party funds. Required: ₹${template.recruitmentCost.toLocaleString("en-IN")}, Available: ₹${treasury.balance.toLocaleString("en-IN")}.`,
    );
  }

  const newBalance = treasury.balance - template.recruitmentCost;

  const transaction: FinanceTransaction = {
    id: crypto.randomUUID(),
    partyId: campaign.player.partyId,
    type: "expense",
    category: "recruitment",
    amount: template.recruitmentCost,
    description: `Recruitment honorarium for ${template.name}`,
    date: campaign.calendar.currentDate,
  };

  const newLeader: PoliticalLeader = {
    id: template.id,
    partyId: campaign.player.partyId,
    name: template.name,
    role: `Party Executive · ${template.archetype.replace(/_/g, " ")}`,
    stateId: template.stateId,
    popularity: template.popularity,
    experience: template.experience,
    loyalty: template.loyalty,
  };

  const updatedTreasuries = [...campaign.economy.treasuries];
  updatedTreasuries[treasuryIndex] = {
    ...treasury,
    balance: newBalance,
    transactions: [...treasury.transactions, transaction],
  };

  // Update party organizational & popularity metrics
  const updatedParties = campaign.politicalWorld.parties.map((p) => {
    if (p.id === campaign.player.partyId) {
      return {
        ...p,
        funds: newBalance,
        organizationStrength: Math.min(100, p.organizationStrength + 4),
        popularity: Math.min(100, p.popularity + Math.round(template.popularity * 0.05)),
      };
    }
    return p;
  });

  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "organization",
    title: `${template.name} joins the leadership`,
    description: `${template.name} (${template.archetype.replace(/_/g, " ")}) has officially joined the party committee in ${template.stateId}. ${template.perkDescription}`,
    importance: "medium",
  };

  return {
    ...campaign,
    politicalWorld: {
      ...campaign.politicalWorld,
      parties: updatedParties,
    },
    organization: {
      ...campaign.organization,
      leaders: [...campaign.organization.leaders, newLeader],
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
}
