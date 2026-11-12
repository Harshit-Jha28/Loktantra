import type {
  CampaignState,
  PartyMember,
  CadreTier,
  PartyDistrictOffice,
  PoliticalLeader,
  FinanceTransaction,
  CampaignEvent,
} from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import { getDistrictsForState } from "@/data/indiaDistricts";

// Comprehensive cultural naming pools across 6 Indian linguistic zones
const CADRE_NAMES_BY_ZONE: Record<
  string,
  { firstMale: string[]; firstFemale: string[]; last: string[] }
> = {
  hindi: {
    firstMale: [
      "Amit", "Rahul", "Suresh", "Manoj", "Dinesh", "Pankaj", "Vikas", "Ajay",
      "Anurag", "Satish", "Rohit", "Alok", "Devendra", "Deepak", "Ravi", "Ashish", "Anand",
    ],
    firstFemale: [
      "Pooja", "Sunita", "Neelam", "Seema", "Anjali", "Kavita", "Rekha", "Manju",
      "Priyanka", "Sangeeta", "Shweta", "Mamta", "Preeti", "Ritu", "Meena", "Sarita",
    ],
    last: [
      "Sharma", "Verma", "Singh", "Yadav", "Tiwari", "Pandey", "Mishra", "Gupta",
      "Chouhan", "Maurya", "Dubey", "Shukla", "Gautam", "Chauhan", "Srivastava", "Tripathi", "Jha",
    ],
  },
  south: {
    firstMale: [
      "Karthik", "Senthil", "Murugan", "Ramesh", "Praveen", "Suresh", "Venkatesh",
      "Prasad", "Anand", "Rajesh", "Sridhar", "Mahesh", "Vishnu", "Ganesh", "Vijay",
    ],
    firstFemale: [
      "Lakshmi", "Priya", "Deepa", "Kavitha", "Sowmya", "Divya", "Gayatri",
      "Radha", "Meenakshi", "Anitha", "Bhavani", "Pavithra", "Shanthi", "Revathi",
    ],
    last: [
      "Reddy", "Naidu", "Rao", "Iyer", "Gowda", "Pillai", "Nair", "Menon",
      "Shetty", "Balakrishnan", "Murthy", "Swaminathan", "Kurup", "Bhat", "Hebbar",
    ],
  },
  west: {
    firstMale: [
      "Sachin", "Nitin", "Prashant", "Amol", "Chetan", "Ketan", "Sanjay",
      "Tushar", "Girish", " Nilesh", "Mangesh", "Jignesh", "Bhavin", "Harsh",
    ],
    firstFemale: [
      "Sneha", "Pallavi", "Pooja", "Neeta", "Varsha", "Madhuri", "Sheetal",
      "Swati", "Hetali", "Kinjal", "Dipti", "Rupal", "Chaitali", "Tanvi",
    ],
    last: [
      "Patil", "Deshmukh", "Kadam", "Jadhav", "Bhosale", "Chavan", "Patel",
      "Shah", "Mehta", "Desai", "Shinde", "Sawant", "Thakur", "Gaikwad", "Tambe",
    ],
  },
  east: {
    firstMale: [
      "Subhas", "Debashis", "Sourav", "Abhijit", "Anirban", "Prabhat", "Tanmoy",
      "Soumya", "Bikash", "Tapas", "Manas", "Arup", "Koushik", "Chandan", "Manish",
    ],
    firstFemale: [
      "Mousumi", "Kakali", "Sutapa", "Mahuya", "Barnali", "Debolina", "Sharmila",
      "Rupa", "Payel", "Madhusmita", "Itishree", "Padmini", "Swarnalata",
    ],
    last: [
      "Banerjee", "Mukherjee", "Chatterjee", "Bhattacharya", "Das", "Ghosh",
      "Dutta", "Saha", "Mohanty", "Patnaik", "Nayak", "Rath", "Pradhan", "Majhi", "Mishra",
    ],
  },
  northeast: {
    firstMale: [
      "Pranjal", "Gaurav", "Bhaskar", "Dipankar", "Bikram", "Conrad", "Lalthan",
      "Tenzing", "Zonun", "Kamen", "Imkong", "Thangjam", "Pema", "Nongthombam",
    ],
    firstFemale: [
      "Ananya", "Jonali", "Rupali", "Dimple", "Monika", "Lalrinmawii", "Mary",
      "Deki", "Pema", "Chingngai", "Amenba", "Nalini", "Bembem",
    ],
    last: [
      "Baruah", "Gogoi", "Bora", "Saikia", "Deka", "Sangma", "Marak", "Ralte",
      "Lalchhandama", "Tamang", "Lepcha", "Singh", "Debbarma", "Jamir", "Ao",
    ],
  },
  northwest: {
    firstMale: [
      "Gurpreet", "Harpreet", "Jaswinder", "Amandeep", "Kuldeep", "Manpreet",
      "Sukhwinder", "Farooq", "Tariq", "Bashir", "Zahid", "Ravinder", "Balwinder",
    ],
    firstFemale: [
      "Simran", "Harleen", "Jaspreet", "Kiran", "Navneet", "Gurleen", "Parveen",
      "Nasreen", "Zahida", "Shabnam", "Surjit", "Mandeep",
    ],
    last: [
      "Singh", "Kaur", "Dhillon", "Sandhu", "Sidhu", "Grewal", "Cheema", "Gill",
      "Bhat", "Dar", "Lone", "Mir", "Wani", "Sharma", "Dogra",
    ],
  },
};

function getLinguisticZoneForState(stateId: string): keyof typeof CADRE_NAMES_BY_ZONE {
  const s = stateId.toLowerCase().replace(/[^a-z]/g, "");
  if (["tamilnadu", "kerala", "andhrapradesh", "telangana", "karnataka", "puducherry"].includes(s)) {
    return "south";
  }
  if (["maharashtra", "gujarat", "goa", "dadraandnagarhavelianddamananddiu"].includes(s)) {
    return "west";
  }
  if (["westbengal", "odisha", "jharkhand", "bihar"].includes(s)) {
    return "east";
  }
  if (["assam", "meghalaya", "mizoram", "nagaland", "manipur", "tripura", "arunachalpradesh", "sikkim"].includes(s)) {
    return "northeast";
  }
  if (["punjab", "jammuandkashmir", "ladakh", "chandigarh"].includes(s)) {
    return "northwest";
  }
  return "hindi";
}

export interface CadreTierInfo {
  tier: CadreTier;
  title: string;
  badgeColor: string;
  baseExp: number;
  nextTier: CadreTier | null;
  promotionCost: number;
  requiredExp: number;
  description: string;
  benefits: string;
}

export const CADRE_TIER_DATA: Record<CadreTier, CadreTierInfo> = {
  volunteer: {
    tier: "volunteer",
    title: "Grassroots Volunteer",
    badgeColor: "#6B7280",
    baseExp: 15,
    nextTier: "worker",
    promotionCost: 2000,
    requiredExp: 25,
    description: "Passionate community volunteers who distribute flyers, attend rallies, and spread party word-of-mouth.",
    benefits: "+1 local awareness, foundation for organizational expansion.",
  },
  worker: {
    tier: "worker",
    title: "Active Cadre Worker",
    badgeColor: "#2563EB",
    baseExp: 35,
    nextTier: "booth_coordinator",
    promotionCost: 5000,
    requiredExp: 45,
    description: "Dedicated party foot soldiers who coordinate neighborhood canvassing and register new voters.",
    benefits: "+2 booth turnout, stabilizes regional membership count.",
  },
  booth_coordinator: {
    tier: "booth_coordinator",
    title: "Booth Coordinator",
    badgeColor: "#D97706",
    baseExp: 55,
    nextTier: "district_organizer",
    promotionCost: 12000,
    requiredExp: 65,
    description: "Key electoral operators who supervise polling booth agents, oversee voter lists, and ensure high election turnout.",
    benefits: "+3% FPTP voting efficiency in local constituencies.",
  },
  district_organizer: {
    tier: "district_organizer",
    title: "District Organizer",
    badgeColor: "#7C3AED",
    baseExp: 75,
    nextTier: "state_leader",
    promotionCost: 25000,
    requiredExp: 80,
    description: "Experienced political administrators who manage district party offices, handle local media, and lead cadre squads.",
    benefits: "+5 district organization strength, manages district headquarters.",
  },
  state_leader: {
    tier: "state_leader",
    title: "State Political Leader",
    badgeColor: "#DC2626",
    baseExp: 90,
    nextTier: null,
    promotionCost: 0,
    requiredExp: 100,
    description: "High-ranking party leaders eligible to contest Vidhan Sabha and Lok Sabha elections, address mass rallies, or serve in ministerial cabinets.",
    benefits: "Full political leader status: candidate nomination & leadership committee.",
  },
};

export function getCadreTierInfo(tier: CadreTier = "volunteer"): CadreTierInfo {
  return CADRE_TIER_DATA[tier] ?? CADRE_TIER_DATA.volunteer;
}

/**
 * Generates a culturally authentic name for a cadre member based on state.
 */
export function generateCadreName(stateId: string): string {
  const zoneKey = getLinguisticZoneForState(stateId);
  const zone = CADRE_NAMES_BY_ZONE[zoneKey];

  const isFemale = Math.random() < 0.35;
  const firstPool = isFemale ? zone.firstFemale : zone.firstMale;
  const first = firstPool[Math.floor(Math.random() * firstPool.length)];
  const last = zone.last[Math.floor(Math.random() * zone.last.length)];

  return `${first} ${last}`;
}

/**
 * Generates an individual cadre member.
 */
export function generateCadreMember(
  partyId: string,
  stateId: string,
  districtName?: string | null,
  tier: CadreTier = "volunteer",
  joinedDate: string = "2027-01-01",
): PartyMember {
  const tierInfo = getCadreTierInfo(tier);
  const name = generateCadreName(stateId);
  const expVariance = Math.floor(Math.random() * 15) - 5;
  const experience = Math.max(10, Math.min(95, tierInfo.baseExp + expVariance));
  const loyalty = Math.floor(65 + Math.random() * 30);
  const influence = Math.floor(tierInfo.baseExp * 0.7 + Math.random() * 20);

  return {
    id: `cadre-${crypto.randomUUID()}`,
    partyId,
    name,
    role: tierInfo.title,
    tier,
    stateId,
    districtName: districtName ?? null,
    constituencyId: null,
    loyalty,
    influence,
    experience,
    enthusiasm: Math.floor(75 + Math.random() * 25),
    joinedAt: joinedDate,
  };
}

/**
 * Generates a batch of cadre members.
 */
export function generateCadreBatch(
  partyId: string,
  stateId: string,
  districtName?: string | null,
  tier: CadreTier = "volunteer",
  count: number = 5,
  joinedDate: string = "2027-01-01",
): PartyMember[] {
  const list: PartyMember[] = [];
  for (let i = 0; i < count; i++) {
    list.push(generateCadreMember(partyId, stateId, districtName, tier, joinedDate));
  }
  return list;
}

/**
 * Checks if a cadre member can be promoted.
 */
export function canPromoteCadre(
  member: PartyMember,
  treasuryBalance: number,
): { canPromote: boolean; reason?: string; cost: number; nextTier?: CadreTier } {
  const currentTier = member.tier ?? "volunteer";
  const tierInfo = getCadreTierInfo(currentTier);

  if (!tierInfo.nextTier) {
    return { canPromote: false, reason: "Already reached the highest cadre leadership tier.", cost: 0 };
  }

  const nextTierInfo = getCadreTierInfo(tierInfo.nextTier);
  const cost = tierInfo.promotionCost;
  const currentExp = member.experience ?? tierInfo.baseExp;

  if (currentExp < tierInfo.requiredExp) {
    return {
      canPromote: false,
      reason: `Requires at least ${tierInfo.requiredExp} experience points (currently has ${currentExp}).`,
      cost,
      nextTier: tierInfo.nextTier,
    };
  }

  if (treasuryBalance < cost) {
    return {
      canPromote: false,
      reason: `Insufficient treasury funds. Required: ₹${cost.toLocaleString("en-IN")}, Available: ₹${treasuryBalance.toLocaleString("en-IN")}.`,
      cost,
      nextTier: tierInfo.nextTier,
    };
  }

  return { canPromote: true, cost, nextTier: tierInfo.nextTier };
}

/**
 * Promotes a cadre member up the 5-tier ladder.
 * If promoted to state_leader, also creates a PoliticalLeader record in organization.leaders.
 */
export function promoteCadre(
  campaign: CampaignState,
  memberId: string,
): { campaign: CampaignState; resultMessage: string } {
  const memberIndex = campaign.organization.members.findIndex((m) => m.id === memberId);
  if (memberIndex === -1) {
    throw new Error("Cadre member not found.");
  }

  const member = campaign.organization.members[memberIndex];
  const playerPartyId = campaign.player.partyId;
  if (!playerPartyId || member.partyId !== playerPartyId) {
    throw new Error("You can only promote members of your own political party.");
  }

  const treasuryIndex = campaign.economy.treasuries.findIndex((t) => t.partyId === playerPartyId);
  if (treasuryIndex === -1) {
    throw new Error("Party treasury not found.");
  }

  const treasury = campaign.economy.treasuries[treasuryIndex];
  const check = canPromoteCadre(member, treasury.balance);
  if (!check.canPromote || !check.nextTier) {
    throw new Error(check.reason ?? "This member is not eligible for promotion.");
  }

  const nextTier = check.nextTier;
  const nextTierInfo = getCadreTierInfo(nextTier);
  const cost = check.cost;
  const newBalance = treasury.balance - cost;

  // Deduct funds from treasury
  const transaction: FinanceTransaction = {
    id: crypto.randomUUID(),
    partyId: playerPartyId,
    type: "expense",
    category: "cadre_promotion",
    amount: cost,
    description: `Cadre Promotion: ${member.name} promoted to ${nextTierInfo.title}`,
    date: campaign.calendar.currentDate,
  };

  const updatedTreasuries = [...campaign.economy.treasuries];
  updatedTreasuries[treasuryIndex] = {
    ...treasury,
    balance: newBalance,
    transactions: [...treasury.transactions, transaction],
  };

  // Upgrade member
  const updatedMember: PartyMember = {
    ...member,
    tier: nextTier,
    role: nextTierInfo.title,
    experience: Math.max(member.experience ?? 0, nextTierInfo.baseExp),
    influence: Math.min(100, member.influence + 12),
    loyalty: Math.min(100, member.loyalty + 8),
  };

  const updatedMembers = [...campaign.organization.members];
  updatedMembers[memberIndex] = updatedMember;

  let updatedLeaders = campaign.organization.leaders;
  let resultMsg = `${member.name} has been promoted to ${nextTierInfo.title}!`;

  // If promoted to state_leader, promote into political leaders pool!
  if (nextTier === "state_leader") {
    const newLeader: PoliticalLeader = {
      id: `leader-promoted-${member.id}`,
      partyId: playerPartyId,
      name: member.name,
      role: `Party Leader · Grassroots Cadre`,
      stateId: member.stateId,
      popularity: Math.min(100, Math.floor(55 + (member.influence * 0.35))),
      experience: updatedMember.experience ?? 85,
      loyalty: updatedMember.loyalty,
    };

    updatedLeaders = [...updatedLeaders, newLeader];
    resultMsg += ` ${member.name} has entered the senior leadership committee and can now be nominated for elections!`;
  }

  // Record history event
  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "organization",
    title: `Cadre Promotion: ${member.name}`,
    description: `${member.name} ascended to ${nextTierInfo.title}. Promotion investment: ₹${cost.toLocaleString("en-IN")}.`,
    importance: nextTier === "state_leader" ? "high" : "medium",
  };

  // Small party boost
  const updatedParties = campaign.politicalWorld.parties.map((p) => {
    if (p.id === playerPartyId) {
      return {
        ...p,
        organizationStrength: Math.min(100, p.organizationStrength + 1),
      };
    }
    return p;
  });

  const updatedCampaign: CampaignState = {
    ...campaign,
    politicalWorld: {
      ...campaign.politicalWorld,
      parties: updatedParties,
    },
    organization: {
      ...campaign.organization,
      members: updatedMembers,
      leaders: updatedLeaders,
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

  return { campaign: updatedCampaign, resultMessage: resultMsg };
}

/**
 * Builds a permanent party district office in ANY state and ANY district chosen by the user.
 * Costs ₹45,000, establishes local office, spawns 1 District Organizer and 3 Cadre Workers.
 */
export function buildDistrictOffice(
  campaign: CampaignState,
  stateId: string,
  districtName: string,
): { campaign: CampaignState; resultMessage: string } {
  const playerPartyId = campaign.player.partyId;
  if (!playerPartyId) {
    throw new Error("You must establish your party before opening district offices.");
  }

  const officeCost = 45000;
  const treasuryIndex = campaign.economy.treasuries.findIndex((t) => t.partyId === playerPartyId);
  if (treasuryIndex === -1) {
    throw new Error("Party treasury not found.");
  }

  const treasury = campaign.economy.treasuries[treasuryIndex];
  if (treasury.balance < officeCost) {
    throw new Error(
      `Insufficient funds to open district office. Required: ₹${officeCost.toLocaleString("en-IN")}, Available: ₹${treasury.balance.toLocaleString("en-IN")}.`,
    );
  }

  const existingOffices = campaign.organization.offices ?? [];
  const alreadyExists = existingOffices.some(
    (o) => o.partyId === playerPartyId && o.stateId === stateId && o.districtName.toLowerCase() === districtName.toLowerCase(),
  );

  if (alreadyExists) {
    throw new Error(`Your party already has an established district office in ${districtName}.`);
  }

  const newBalance = treasury.balance - officeCost;

  // Record finance expense
  const transaction: FinanceTransaction = {
    id: crypto.randomUUID(),
    partyId: playerPartyId,
    type: "expense",
    category: "district_office",
    amount: officeCost,
    description: `Inaugurated District Office in ${districtName}, ${stateId}`,
    date: campaign.calendar.currentDate,
  };

  const updatedTreasuries = [...campaign.economy.treasuries];
  updatedTreasuries[treasuryIndex] = {
    ...treasury,
    balance: newBalance,
    transactions: [...treasury.transactions, transaction],
  };

  // Generate dedicated cadre in this district: 1 District Organizer and 3 Workers
  const organizer = generateCadreMember(playerPartyId, stateId, districtName, "district_organizer", campaign.calendar.currentDate);
  const workers = generateCadreBatch(playerPartyId, stateId, districtName, "worker", 3, campaign.calendar.currentDate);
  const spawnedCadre = [organizer, ...workers];

  // New District Office Record
  const newOffice: PartyDistrictOffice = {
    id: `office-${crypto.randomUUID()}`,
    partyId: playerPartyId,
    stateId,
    districtName,
    establishedDate: campaign.calendar.currentDate,
    level: 1,
    cadreCount: spawnedCadre.length,
  };

  const updatedOffices = [...existingOffices, newOffice];
  const updatedMembers = [...campaign.organization.members, ...spawnedCadre];

  // Boost party organization and electoral strength
  const updatedParties = campaign.politicalWorld.parties.map((p) => {
    if (p.id === playerPartyId) {
      return {
        ...p,
        funds: newBalance,
        organizationStrength: Math.min(100, p.organizationStrength + 5),
        electoralStrength: Math.min(100, p.electoralStrength + 2),
      };
    }
    return p;
  });

  const stateObj = INDIA_REGIONS.find((r) => r.id === stateId);
  const stateName = stateObj?.name ?? stateId;

  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "organization",
    title: `District Office Inaugurated: ${districtName}`,
    description: `Established permanent party headquarters in ${districtName} (${stateName}). Deployed District Organizer ${organizer.name} and 3 active workers. Organization strength +5.`,
    importance: "high",
  };

  const updatedCampaign: CampaignState = {
    ...campaign,
    politicalWorld: {
      ...campaign.politicalWorld,
      parties: updatedParties,
    },
    organization: {
      ...campaign.organization,
      members: updatedMembers,
      offices: updatedOffices,
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

  const resultMsg = `Successfully inaugurated new party district office in ${districtName}, ${stateName}! Deployed 1 District Organizer and 3 active workers.`;
  return { campaign: updatedCampaign, resultMessage: resultMsg };
}

/**
 * Returns breakdown statistics of all party cadre.
 */
export function getCadreStatistics(campaign: CampaignState) {
  const playerPartyId = campaign.player.partyId;
  const members = campaign.organization.members.filter((m) => m.partyId === playerPartyId);
  const offices = (campaign.organization.offices ?? []).filter((o) => o.partyId === playerPartyId);

  const byTier: Record<CadreTier, number> = {
    volunteer: 0,
    worker: 0,
    booth_coordinator: 0,
    district_organizer: 0,
    state_leader: 0,
  };

  const byState: Record<string, number> = {};
  const byDistrict: Record<string, number> = {};

  for (const m of members) {
    const tier = m.tier ?? "volunteer";
    byTier[tier] = (byTier[tier] ?? 0) + 1;

    if (m.stateId) {
      byState[m.stateId] = (byState[m.stateId] ?? 0) + 1;
    }
    if (m.districtName) {
      byDistrict[m.districtName] = (byDistrict[m.districtName] ?? 0) + 1;
    }
  }

  return {
    totalCadre: members.length,
    byTier,
    byState,
    byDistrict,
    totalOffices: offices.length,
    offices,
  };
}
