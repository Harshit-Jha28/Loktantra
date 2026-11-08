import type { CampaignState, CampaignEvent } from "@/types/campaign";

export interface PolicyDecision {
  id: string;
  category: "welfare" | "infrastructure" | "education" | "healthcare" | "agriculture" | "employment";
  title: string;
  cost: number;
  description: string;
  approvalImpact: number;
  popularityImpact: number;
  effectDescription: string;
}

export const NATIONAL_POLICIES: PolicyDecision[] = [
  {
    id: "policy-health-mission",
    category: "healthcare",
    title: "Rural Health Sub-Centre Network",
    cost: 50000,
    description: "Equip sub-centres with diagnostic tools, essential medicines, and trained healthcare workers across tier-2 and tier-3 districts.",
    approvalImpact: 4,
    popularityImpact: 3,
    effectDescription: "+4% Public Approval, +3% Party Popularity, improved maternal and child health outcomes.",
  },
  {
    id: "policy-agri-water",
    category: "agriculture",
    title: "Farmer Canal & Drip Irrigation Program",
    cost: 65000,
    description: "Subsidize solar-powered drip irrigation kits and canal branch maintenance for small and marginal landholders.",
    approvalImpact: 5,
    popularityImpact: 4,
    effectDescription: "+5% Rural Public Approval, +4% Popularity, protects against seasonal drought shocks.",
  },
  {
    id: "policy-primary-edu",
    category: "education",
    title: "Smart Classrooms & Foundational Literacy",
    cost: 45000,
    description: "Modernize government primary schools with multilingual library kits, digital boards, and midday nutritional supplements.",
    approvalImpact: 3,
    popularityImpact: 2,
    effectDescription: "+3% Approval, +2% Popularity among young families and educators.",
  },
  {
    id: "policy-skills-youth",
    category: "employment",
    title: "State Youth Apprenticeship Stipend",
    cost: 60000,
    description: "Partner with industrial clusters and tech parks to co-sponsor 6-month paid internships for technical graduates.",
    approvalImpact: 4,
    popularityImpact: 3,
    effectDescription: "+4% Youth Approval, +3% Urban Popularity, expands workforce readiness.",
  },
  {
    id: "policy-roads-linkage",
    category: "infrastructure",
    title: "All-Weather District Feeder Roads",
    cost: 80000,
    description: "Pave all-weather asphalt links between agricultural market yards (mandis) and state highways.",
    approvalImpact: 5,
    popularityImpact: 3,
    effectDescription: "+5% General Approval, lowers transport times, boosts regional trade.",
  },
];

export function enactPolicy(
  campaign: CampaignState,
  policyId: string,
): { campaign: CampaignState; resultMessage: string } {
  if (!campaign.player.partyId) {
    throw new Error("You must establish a party first.");
  }

  const policy = NATIONAL_POLICIES.find((p) => p.id === policyId);
  if (!policy) {
    throw new Error("Policy not found.");
  }

  const treasuryIndex = campaign.economy.treasuries.findIndex(
    (t) => t.partyId === campaign.player.partyId,
  );
  if (treasuryIndex === -1) {
    throw new Error("Party treasury not found.");
  }

  const treasury = campaign.economy.treasuries[treasuryIndex];
  if (treasury.balance < policy.cost) {
    throw new Error(
      `Insufficient funds to sponsor policy. Required: ₹${policy.cost.toLocaleString("en-IN")}, Available: ₹${treasury.balance.toLocaleString("en-IN")}.`,
    );
  }

  const newBalance = treasury.balance - policy.cost;

  const updatedTreasuries = [...campaign.economy.treasuries];
  updatedTreasuries[treasuryIndex] = {
    ...treasury,
    balance: newBalance,
    transactions: [
      ...treasury.transactions,
      {
        id: crypto.randomUUID(),
        partyId: campaign.player.partyId,
        type: "expense",
        category: "policy_sponsorship",
        amount: policy.cost,
        description: `Policy Initiative: ${policy.title}`,
        date: campaign.calendar.currentDate,
      },
    ],
  };

  const updatedParties = campaign.politicalWorld.parties.map((p) => {
    if (p.id === campaign.player.partyId) {
      return {
        ...p,
        funds: newBalance,
        popularity: Math.min(100, p.popularity + policy.popularityImpact),
        electoralStrength: Math.min(100, p.electoralStrength + 2),
      };
    }
    return p;
  });

  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "governance",
    title: `Policy Enacted: ${policy.title}`,
    description: `${policy.description} ${policy.effectDescription}`,
    importance: "high",
  };

  const updatedCampaign: CampaignState = {
    ...campaign,
    politicalWorld: {
      ...campaign.politicalWorld,
      parties: updatedParties,
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

  return {
    campaign: updatedCampaign,
    resultMessage: `Policy "${policy.title}" successfully sponsored and promulgated!`,
  };
}
