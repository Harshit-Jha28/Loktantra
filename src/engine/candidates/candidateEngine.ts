import type {
  CampaignState,
  CandidateProfile,
  CandidateOrigin,
  CampaignStyle,
  Election,
  ElectionCandidate,
  ReservationCategory,
  FinanceTransaction,
  CampaignEvent,
} from "@/types/campaign";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";
import { generateCadreName } from "@/engine/party/cadreSystem";

const CAMPAIGN_STYLES: CampaignStyle[] = ["grassroots", "orator", "technocrat", "money_power"];

/**
 * Checks if a candidate is constitutionally eligible to contest a specific constituency.
 * Validates reservation rules (General vs SC vs ST vs Sangha) and state domicile.
 */
export function checkCandidateEligibility(
  candidate: {
    stateId?: string | null;
    reservationCategory?: ReservationCategory;
  },
  constituency: {
    stateId: string;
    reservation: ReservationCategory;
    isLokSabha?: boolean;
  },
): { eligible: boolean; reason?: string } {
  // 1. Reservation check
  const seatRes = constituency.reservation;
  const candRes = candidate.reservationCategory ?? "general";

  if (seatRes === "sc" && candRes !== "sc") {
    return {
      eligible: false,
      reason: "Constituency is reserved for Scheduled Caste (SC) candidates only.",
    };
  }

  if (seatRes === "st" && candRes !== "st") {
    return {
      eligible: false,
      reason: "Constituency is reserved for Scheduled Tribe (ST) candidates only.",
    };
  }

  if (seatRes === "sangha" && candRes !== "sangha") {
    return {
      eligible: false,
      reason: "Constituency is reserved for the Sangha Buddhist monastic community only.",
    };
  }

  // 2. Domicile / State eligibility
  // Under the Representation of the People Act, Vidhan Sabha candidates must be registered electors in that state.
  // Lok Sabha candidates can contest anywhere in India.
  if (!constituency.isLokSabha && candidate.stateId && candidate.stateId !== constituency.stateId) {
    return {
      eligible: false,
      reason: `Vidhan Sabha candidates must be registered voters in the state (${constituency.stateId}).`,
    };
  }

  return { eligible: true };
}

/**
 * Compiles all candidate profiles currently available to the player party.
 * Gathers from senior political leaders, advanced cadre (organizers/coordinators), and candidate pool.
 */
export function getPlayerCandidatePool(campaign: CampaignState): CandidateProfile[] {
  const playerPartyId = campaign.player.partyId;
  if (!playerPartyId) return [];

  const profiles: CandidateProfile[] = [];
  const seenIds = new Set<string>();

  // 1. From Political Leaders (recruited or promoted)
  campaign.organization.leaders
    .filter((l) => l.partyId === playerPartyId)
    .forEach((leader, idx) => {
      // Deterministically assign reservation based on leader id
      const hash = leader.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const res: ReservationCategory =
        hash % 7 === 0 ? "sc" : hash % 11 === 0 ? "st" : "general";

      profiles.push({
        id: `cand-leader-${leader.id}`,
        name: leader.name,
        partyId: playerPartyId,
        stateId: leader.stateId ?? campaign.player.foundingStateId,
        age: 42 + (hash % 28),
        gender: hash % 3 === 0 ? "female" : "male",
        reservationCategory: res,
        popularity: leader.popularity,
        experience: leader.experience,
        integrity: 60 + (hash % 35),
        campaignStyle: CAMPAIGN_STYLES[hash % CAMPAIGN_STYLES.length],
        origin: "party_leader",
        sourceId: leader.id,
      });
      seenIds.add(leader.id);
    });

  // 2. From Promoted Cadre (District Organizers, Booth Coordinators, and experienced Workers)
  campaign.organization.members
    .filter((m) => m.partyId === playerPartyId)
    .forEach((member) => {
      const tier = member.tier ?? "volunteer";
      const exp = member.experience ?? 20;

      // Only cadre with tier organizer/coordinator or exp >= 30 qualify
      if (
        tier === "state_leader" ||
        tier === "district_organizer" ||
        tier === "booth_coordinator" ||
        exp >= 30
      ) {
        const hash = member.id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const res: ReservationCategory =
          hash % 6 === 0 ? "sc" : hash % 10 === 0 ? "st" : "general";

        profiles.push({
          id: `cand-cadre-${member.id}`,
          name: member.name,
          partyId: playerPartyId,
          stateId: member.stateId ?? campaign.player.foundingStateId,
          age: 32 + (hash % 30),
          gender: hash % 2 === 0 ? "male" : "female",
          reservationCategory: res,
          popularity: Math.min(85, Math.floor(member.influence * 0.8 + 20)),
          experience: exp,
          integrity: Math.min(100, member.loyalty),
          campaignStyle: CAMPAIGN_STYLES[hash % CAMPAIGN_STYLES.length],
          origin: "cadre_member",
          sourceId: member.id,
        });
      }
    });

  // 3. Existing scouted candidates in organization.candidatePool
  (campaign.organization.candidatePool ?? []).forEach((c) => {
    if (!profiles.some((p) => p.id === c.id)) {
      profiles.push(c);
    }
  });

  return profiles;
}

/**
 * Returns available candidates for a specific constituency in an active election,
 * annotated with eligibility status and filtering out already-nominated candidates.
 */
export function getCandidatesForConstituency(
  campaign: CampaignState,
  electionId: string,
  constituencyId: string,
): {
  candidate: CandidateProfile;
  eligible: boolean;
  reason?: string;
  isNominatedElsewhere: boolean;
}[] {
  const election = campaign.elections.find((e) => e.id === electionId);
  if (!election) return [];

  const isLokSabha = election.type === "lok_sabha";

  // Find constituency metadata
  const ac = INDIA_ASSEMBLY_CONSTITUENCIES.find((c) => c.id === constituencyId);
  const pc = INDIA_LOK_SABHA_CONSTITUENCIES.find((c) => c.id === constituencyId);
  const targetSeat = ac ?? pc;

  if (!targetSeat) return [];

  const stateId = targetSeat.stateId;
  const reservation = targetSeat.reservation;

  // Candidates already nominated by player in this election
  const nominatedIds = new Set(
    election.candidates
      .filter((c) => c.partyId === campaign.player.partyId)
      .map((c) => c.id),
  );

  const allPool = getPlayerCandidatePool(campaign);

  return allPool.map((cand) => {
    const isNominatedElsewhere = nominatedIds.has(cand.id);

    const check = checkCandidateEligibility(cand, {
      stateId,
      reservation,
      isLokSabha,
    });

    return {
      candidate: cand,
      eligible: check.eligible && !isNominatedElsewhere,
      reason: isNominatedElsewhere ? "Already nominated in another seat in this election." : check.reason,
      isNominatedElsewhere,
    };
  });
}

/**
 * Scouts an authentic local candidate in a specific state and reservation category.
 * Costs ₹5,000 scouting and vetting fee.
 */
export function scoutCandidate(
  campaign: CampaignState,
  stateId: string,
  reservationCategory: ReservationCategory = "general",
): { campaign: CampaignState; candidate: CandidateProfile; resultMessage: string } {
  const playerPartyId = campaign.player.partyId;
  if (!playerPartyId) {
    throw new Error("You must establish your party first.");
  }

  const scoutCost = 5000;
  const treasuryIndex = campaign.economy.treasuries.findIndex((t) => t.partyId === playerPartyId);
  if (treasuryIndex === -1) {
    throw new Error("Party treasury record missing.");
  }

  const treasury = campaign.economy.treasuries[treasuryIndex];
  if (treasury.balance < scoutCost) {
    throw new Error(`Insufficient funds to scout candidate. Required: ₹${scoutCost.toLocaleString("en-IN")}.`);
  }

  const newBalance = treasury.balance - scoutCost;
  const name = generateCadreName(stateId);
  const age = 35 + Math.floor(Math.random() * 28);
  const gender: "male" | "female" = Math.random() < 0.35 ? "female" : "male";
  const popularity = 45 + Math.floor(Math.random() * 25);
  const experience = 35 + Math.floor(Math.random() * 35);
  const integrity = 65 + Math.floor(Math.random() * 30);
  const campaignStyle = CAMPAIGN_STYLES[Math.floor(Math.random() * CAMPAIGN_STYLES.length)];

  const candidate: CandidateProfile = {
    id: `cand-scouted-${crypto.randomUUID()}`,
    name,
    partyId: playerPartyId,
    stateId,
    age,
    gender,
    reservationCategory,
    popularity,
    experience,
    integrity,
    campaignStyle,
    origin: "scouted_local",
  };

  const transaction: FinanceTransaction = {
    id: crypto.randomUUID(),
    partyId: playerPartyId,
    type: "expense",
    category: "candidate_scouting",
    amount: scoutCost,
    description: `Candidate Scouting: ${name} (${reservationCategory.toUpperCase()} - ${stateId})`,
    date: campaign.calendar.currentDate,
  };

  const updatedTreasuries = [...campaign.economy.treasuries];
  updatedTreasuries[treasuryIndex] = {
    ...treasury,
    balance: newBalance,
    transactions: [...treasury.transactions, transaction],
  };

  const existingPool = campaign.organization.candidatePool ?? [];
  const updatedCampaign: CampaignState = {
    ...campaign,
    organization: {
      ...campaign.organization,
      candidatePool: [...existingPool, candidate],
    },
    economy: {
      ...campaign.economy,
      treasuries: updatedTreasuries,
    },
  };

  const resultMessage = `Scouted ${name} (${reservationCategory.toUpperCase()}, ${campaignStyle} campaigner) in ${stateId}! Added to your candidate directory.`;
  return { campaign: updatedCampaign, candidate, resultMessage };
}

/**
 * Nominate a structured candidate profile for a constituency in an election.
 * Deducts official election security deposit (₹10,000 for Lok Sabha, ₹5,000 for Assembly).
 */
export function nominateCandidateFromPool(
  campaign: CampaignState,
  electionId: string,
  constituencyId: string,
  candidateProfile: CandidateProfile,
): { campaign: CampaignState; resultMessage: string } {
  const electionIndex = campaign.elections.findIndex((e) => e.id === electionId);
  if (electionIndex === -1) {
    throw new Error("Election not found.");
  }

  const election = campaign.elections[electionIndex];
  if (election.status === "completed" || election.status === "results") {
    throw new Error("Nominations are closed for this election.");
  }

  const playerPartyId = campaign.player.partyId;
  if (!playerPartyId) {
    throw new Error("Establish party first.");
  }

  // Check if seat already has a player candidate
  const alreadyNominated = election.candidates.find(
    (c) => c.constituencyId === constituencyId && c.partyId === playerPartyId,
  );
  if (alreadyNominated) {
    throw new Error("Your party already has a nominated candidate in this constituency.");
  }

  // Find constituency
  const isLokSabha = election.type === "lok_sabha";
  const ac = INDIA_ASSEMBLY_CONSTITUENCIES.find((c) => c.id === constituencyId);
  const pc = INDIA_LOK_SABHA_CONSTITUENCIES.find((c) => c.id === constituencyId);
  const targetSeat = ac ?? pc;

  if (!targetSeat) {
    throw new Error("Constituency not found.");
  }

  // Check constitutional eligibility
  const check = checkCandidateEligibility(candidateProfile, {
    stateId: targetSeat.stateId,
    reservation: targetSeat.reservation,
    isLokSabha,
  });

  if (!check.eligible) {
    throw new Error(check.reason ?? "Candidate is not eligible for this constituency.");
  }

  // Security deposit
  const depositCost = isLokSabha ? 10000 : 5000;
  const treasuryIndex = campaign.economy.treasuries.findIndex((t) => t.partyId === playerPartyId);
  if (treasuryIndex === -1) throw new Error("Treasury missing.");

  const treasury = campaign.economy.treasuries[treasuryIndex];
  if (treasury.balance < depositCost) {
    throw new Error(`Insufficient funds for election security deposit (₹${depositCost.toLocaleString("en-IN")}).`);
  }

  const newBalance = treasury.balance - depositCost;
  const transaction: FinanceTransaction = {
    id: crypto.randomUUID(),
    partyId: playerPartyId,
    type: "expense",
    category: "election_deposit",
    amount: depositCost,
    description: `Election Security Deposit: ${candidateProfile.name} (#${targetSeat.constituencyNumber} ${targetSeat.name})`,
    date: campaign.calendar.currentDate,
  };

  const updatedTreasuries = [...campaign.economy.treasuries];
  updatedTreasuries[treasuryIndex] = {
    ...treasury,
    balance: newBalance,
    transactions: [...treasury.transactions, transaction],
  };

  const candidate: ElectionCandidate = {
    id: candidateProfile.id,
    name: candidateProfile.name,
    partyId: playerPartyId,
    constituencyId,
    popularity: candidateProfile.popularity,
    experience: candidateProfile.experience,
    reservationCategory: candidateProfile.reservationCategory,
    stateId: targetSeat.stateId,
    age: candidateProfile.age,
    campaignStyle: candidateProfile.campaignStyle,
    sourceProfileId: candidateProfile.id,
  };

  const updatedElection: Election = {
    ...election,
    candidates: [...election.candidates, candidate],
  };

  const updatedElections = [...campaign.elections];
  updatedElections[electionIndex] = updatedElection;

  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: campaign.calendar.currentDate,
    category: "election",
    title: `Nomination Filed: ${candidateProfile.name}`,
    description: `${candidateProfile.name} filed nomination papers for #${targetSeat.constituencyNumber} ${targetSeat.name} (${targetSeat.reservation.toUpperCase()}). Deposit of ₹${depositCost.toLocaleString("en-IN")} submitted to Returning Officer.`,
    importance: "medium",
  };

  const updatedCampaign: CampaignState = {
    ...campaign,
    elections: updatedElections,
    economy: {
      ...campaign.economy,
      treasuries: updatedTreasuries,
    },
    history: {
      ...campaign.history,
      events: [...campaign.history.events, event],
    },
  };

  const resultMessage = `Successfully nominated ${candidateProfile.name} for #${targetSeat.constituencyNumber} ${targetSeat.name}!`;
  return { campaign: updatedCampaign, resultMessage };
}
