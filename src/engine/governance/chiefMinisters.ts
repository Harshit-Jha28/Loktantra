import type {
  ChiefMinisterProfile,
  LeaderArchetype,
  StateGovernment,
  CampaignState,
  GovernmentType,
} from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";

// Culturally authentic regional names for dynamic Chief Minister emergence
const REGIONAL_NAMES: Record<string, { first: string[]; last: string[] }> = {
  // Hindi Belt: UP, Bihar, MP, Rajasthan, Haryana, etc.
  hindi: {
    first: [
      "Yogesh", "Devendra", "Shivraj", "Akhilesh", "Raman", "Bhupesh", "Vasundhara",
      "Ashok", "Kalyan", "Digvijay", "Hemant", "Manohar", "Nayab", "Pushkar", "Sukhvinder",
    ],
    last: [
      "Singh", "Sharma", "Yadav", "Chouhan", "Gahlot", "Pandey", "Mishra", "Patel",
      "Tripathi", "Verma", "Tiwari", "Rawat", "Khattar", "Gehlot", "Saini",
    ],
  },
  // Dravidian South: TN, AP, Telangana, Karnataka, Kerala
  south: {
    first: [
      "Stalin", "Pinarayi", "Siddaramaiah", "Revanth", "Jagan", "Chandrababu",
      "Palaniswami", "Bommai", "Vijayan", "Kumarswamy", "Annamalai", "Balan",
    ],
    last: [
      "Reddy", "Naidu", "Stalin", "Vijayan", "Gowda", "Shivakumar", "Rao",
      "Murugan", "Pillai", "Nair", "Menon", "Achuthanandan", "Sundaram",
    ],
  },
  // West: Maharashtra, Gujarat, Goa
  west: {
    first: [
      "Eknath", "Devendra", "Bhupendra", "Pramod", "Uddhav", "Ajit", "Sharad",
      "Prithviraj", "Vijay", "Anandiben", "Nitin", "Sanjay",
    ],
    last: [
      "Shinde", "Fadnavis", "Patel", "Sawant", "Thackeray", "Pawar", "Rupani",
      "Chavan", "Deshmukh", "Joshi", "Bhosale", "Kadam",
    ],
  },
  // East: West Bengal, Odisha, Jharkhand
  east: {
    first: [
      "Mamata", "Naveen", "Hemant", "Mohan", "Abhishek", "Suvendu", "Champai",
      "Babulal", "Biren", "Dharmendra", "Subrat", "Soumya",
    ],
    last: [
      "Banerjee", "Patnaik", "Soren", "Majhi", "Adhikari", "Maran", "Das",
      "Mohanty", "Mukherjee", "Chatterjee", "Pradhan", "Marandi",
    ],
  },
  // North-East: Assam, Meghalaya, Sikkim, Tripura, etc.
  northeast: {
    first: [
      "Himanta", "Conrad", "Prem", "Neiphiu", "Manik", "Lalduhoma", "Pema",
      "Biren", "Tarun", "Gaurav", "Zoram", "Sangma",
    ],
    last: [
      "Biswa Sarma", "Sangma", "Tamang", "Rio", "Saha", "Lalbiakzuala", "Khandu",
      "Singh", "Gogoi", "Bora", "Ralte", "Debbarma",
    ],
  },
  // Punjab & J&K
  northwest: {
    first: [
      "Bhagwant", "Omar", "Mehbooba", "Charanjit", "Amarinder", "Parkash",
      "Sukhbir", "Farooq", "Ghulam", "Navjot",
    ],
    last: [
      "Mann", "Abdullah", "Mufti", "Channi", "Singh", "Badal", "Nabi Azad",
      "Sidhu", "Sandhu", "Cheema",
    ],
  },
};

function getLinguisticZone(stateId: string): keyof typeof REGIONAL_NAMES {
  const s = stateId.toLowerCase();
  if (["tamil_nadu", "kerala", "andhra_pradesh", "telangana", "karnataka", "puducherry"].includes(s)) {
    return "south";
  }
  if (["maharashtra", "gujarat", "goa", "dadra_and_nagar_haveli_and_daman_and_diu"].includes(s)) {
    return "west";
  }
  if (["west_bengal", "odisha", "jharkhand", "bihar"].includes(s)) {
    return "east";
  }
  if (["assam", "meghalaya", "mizoram", "nagaland", "manipur", "tripura", "arunachal_pradesh", "sikkim"].includes(s)) {
    return "northeast";
  }
  if (["punjab", "jammu_and_kashmir", "ladakh", "chandigarh"].includes(s)) {
    return "northwest";
  }
  return "hindi";
}

const ARCHETYPES: LeaderArchetype[] = [
  "coalition_broker",
  "grassroots_organiser",
  "charismatic_populist",
  "technocratic_reformer",
  "regional_identity_advocate",
  "institutional_veteran",
  "ideological_campaigner",
  "business_friendly_moderniser",
  "welfare_mobiliser",
  "security_first_administrator",
  "consensus_builder",
  "movement_organiser",
  "central_administrator",
];

/**
 * Deterministically seeds a Chief Minister profile for an Indian state.
 */
export function seedChiefMinisterForRegion(stateId: string): ChiefMinisterProfile | null {
  const region = INDIA_REGIONS.find((r) => r.id === stateId);
  if (!region || !region.chiefMinisterName || !region.rulingPartyId) {
    return null;
  }

  // Pick deterministic values based on state name hash
  const hash = stateId.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const archetype: LeaderArchetype = region.leaderArchetype ?? ARCHETYPES[hash % ARCHETYPES.length];
  const age = 48 + (hash % 26); // 48 to 74 years
  const experience = 55 + (hash % 40); // 55 to 95
  const approvalRating = 52 + (hash % 38); // 52 to 90%
  const coalitionSkill = (archetype === "coalition_broker" || archetype === "consensus_builder") ? 85 : 45 + (hash % 45);

  return {
    id: `cm-${stateId}`,
    name: region.chiefMinisterName,
    stateId,
    partyId: region.rulingPartyId,
    age,
    experience,
    approvalRating,
    leaderArchetype: archetype,
    coalitionManagementSkill: coalitionSkill,
    tenureDays: 365 + (hash % 1200),
    avatarSeed: `${stateId}-${region.chiefMinisterName.replace(/\s+/g, "_")}`,
    bio: `${region.chiefMinisterName} currently serves as the Chief Minister of ${region.name}. Known as a ${archetype.replace(/_/g, " ")}, they command strong influence across the state administration.`,
  };
}

/**
 * Generates a dynamic new Chief Minister profile when government changes.
 */
export function generateDynamicChiefMinister(
  stateId: string,
  partyId: string,
  rulingPartyName: string,
  suggestedName?: string,
): ChiefMinisterProfile {
  const zoneKey = getLinguisticZone(stateId);
  const names = REGIONAL_NAMES[zoneKey];

  const first = names.first[Math.floor(Math.random() * names.first.length)];
  const last = names.last[Math.floor(Math.random() * names.last.length)];
  const fullName = suggestedName ?? `${first} ${last}`;

  const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
  const age = 45 + Math.floor(Math.random() * 28);
  const experience = 50 + Math.floor(Math.random() * 45);
  const approvalRating = 55 + Math.floor(Math.random() * 30);
  const coalitionSkill = (archetype === "coalition_broker" || archetype === "consensus_builder") ? 85 : 40 + Math.floor(Math.random() * 50);

  return {
    id: `cm-${stateId}-${Date.now()}`,
    name: fullName,
    stateId,
    partyId,
    age,
    experience,
    approvalRating,
    leaderArchetype: archetype,
    coalitionManagementSkill: coalitionSkill,
    tenureDays: 1,
    avatarSeed: `${stateId}-${fullName.replace(/\s+/g, "_")}`,
    bio: `${fullName} was sworn in as the Chief Minister representing ${rulingPartyName}. Characterized as a ${archetype.replace(/_/g, " ")}, their leadership will be crucial for maintaining legislative cohesion.`,
  };
}

/**
 * Calculates government cabinet stability (0-100%).
 * Accounts for majority margin, coalition partner count, and CM coalition management skill.
 */
export function calculateCabinetStability(
  governmentType: GovernmentType,
  rulingSeats: number,
  majorityMark: number,
  cmProfile?: ChiefMinisterProfile | null,
  coalitionPartnerCount: number = 0,
): number {
  if (governmentType === "president_rule") return 0;
  if (governmentType === "caretaker") return 35;

  const seatSurplus = rulingSeats - majorityMark;
  let baseStability = 50;

  if (governmentType === "majority") {
    // Single party comfortable majority: 75% to 95%
    baseStability = Math.min(95, 75 + seatSurplus * 2);
  } else if (governmentType === "coalition") {
    // Coalition: Base 50-70%, adjusted by CM coalition management skill and penalties for multiple allies
    const coalitionSkillBonus = cmProfile ? Math.round((cmProfile.coalitionManagementSkill - 50) * 0.3) : 0;
    const partnerPenalty = coalitionPartnerCount * 4;
    baseStability = Math.max(30, Math.min(85, 60 + seatSurplus * 1.5 + coalitionSkillBonus - partnerPenalty));
  } else if (governmentType === "minority") {
    // Minority government: Fragile (30-50%)
    baseStability = Math.max(25, Math.min(50, 40 + (cmProfile ? Math.round(cmProfile.coalitionManagementSkill * 0.15) : 0)));
  }

  return Math.round(baseStability);
}
