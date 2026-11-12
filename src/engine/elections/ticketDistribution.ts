import type {
  CampaignState,
  Election,
  ElectionCandidate,
  TicketClaimant,
  RebelCandidate,
  CandidateProfile,
  CampaignEvent,
  FinanceTransaction,
} from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";
import {
  getPlayerCandidatePool,
  checkCandidateEligibility,
} from "@/engine/candidates/candidateEngine";
import { generateCadreName } from "@/engine/party/cadreSystem";

/**
 * Generate ticket claimants for an election.
 * Creates claimant profiles for both player party and AI parties.
 */
export function generateTicketClaimants(
  campaign: CampaignState,
  electionId: string,
): TicketClaimant[] {
  const election = campaign.elections.find((e) => e.id === electionId);
  if (!election) return [];

  const stateId = election.stateId;
  const constituencies =
    election.type === "vidhan_sabha" && stateId
      ? INDIA_ASSEMBLY_CONSTITUENCIES.filter((ac) => ac.stateId === stateId)
      : INDIA_LOK_SABHA_CONSTITUENCIES;

  const claimants: TicketClaimant[] = [];
  const activeParties = campaign.politicalWorld.parties.filter((p) => p.isActive);
  const playerParty = activeParties.find((p) => p.isPlayerParty);

  // 1. Gather player claimants
  if (playerParty) {
    const playerPool = getPlayerCandidatePool(campaign);

    for (const seat of constituencies) {
      // Find candidate profiles interested or eligible for this seat
      const eligible = playerPool.filter((cand) => {
        const check = checkCandidateEligibility(cand, seat);
        return check.eligible;
      });

      // Filter to claimants who match preferred constituency or have matching state
      const interested = eligible.filter(
        (cand) =>
          cand.constituencyId === seat.id ||
          cand.preferredConstituencyId === seat.id ||
          cand.stateId === seat.stateId,
      );

      // Take top contenders (1 to 3) for this seat
      const poolForSeat = (interested.length > 0 ? interested : eligible).slice(0, 3);

      for (const cand of poolForSeat) {
        const loyalty = cand.integrity ?? 70;
        const popularity = cand.popularity;
        const experience = cand.experience;
        const isIncumbent = cand.isIncumbent ?? false;

        const claimStrength = Math.min(
          100,
          Math.round(
            popularity * 0.35 +
              experience * 0.25 +
              loyalty * 0.2 +
              (isIncumbent ? 20 : 0) +
              (cand.origin === "party_leader" ? 10 : 0),
          ),
        );

        const rebelRisk = Math.max(
          5,
          Math.min(
            95,
            Math.round(
              popularity * 0.45 + (100 - loyalty) * 0.45 + (cand.ambition ?? 50) * 0.2 - 25,
            ),
          ),
        );

        claimants.push({
          candidateId: cand.id,
          name: cand.name,
          partyId: playerParty.id,
          constituencyId: seat.id,
          popularity,
          experience,
          loyalty,
          claimStrength,
          status: "claimed",
          dissatisfaction: cand.dissatisfaction ?? 0,
          rebelRisk,
        });
      }
    }
  }

  // 2. Generate AI claimants for major competing parties
  const competingParties = activeParties
    .filter((p) => !p.isPlayerParty)
    .filter((p) => {
      if (p.id === "ndf" || p.id === "ppc") return true;
      if (stateId && p.headquartersStateId === stateId) return true;
      return p.organizationStrength > 50;
    })
    .slice(0, 4);

  for (const party of competingParties) {
    for (const seat of constituencies) {
      // Procedurally seed 1 to 2 claimants per party per seat
      const numContenders = (seat.constituencyNumber % 2) + 1;
      for (let i = 0; i < numContenders; i++) {
        const hash =
          (seat.constituencyNumber * 41 + party.id.length * 17 + i * 13) % 1000;
        const pop = Math.min(85, Math.max(25, (party.popularity * 0.7) + (hash % 35)));
        const exp = Math.min(90, Math.max(20, (hash * 3) % 70 + 20));
        const loy = Math.min(95, Math.max(30, 100 - ((hash * 7) % 55)));

        const claimStrength = Math.min(
          100,
          Math.round(pop * 0.4 + exp * 0.3 + loy * 0.3),
        );
        const rebelRisk = Math.max(
          5,
          Math.min(90, Math.round(pop * 0.5 + (100 - loy) * 0.4 - 15)),
        );

        const aiCandName = generateCadreName(seat.stateId);
        claimants.push({
          candidateId: `ai-claimant-${party.id}-${seat.id}-${i}`,
          name: aiCandName,
          partyId: party.id,
          constituencyId: seat.id,
          popularity: pop,
          experience: exp,
          loyalty: loy,
          claimStrength,
          status: "claimed",
          dissatisfaction: (hash % 20),
          rebelRisk,
        });
      }
    }
  }

  return claimants;
}

/**
 * Allocate ticket to a specific candidate in a constituency.
 * Sets the winner to "confirmed" and marks rival claimants as "denied".
 * Evaluates whether denied candidates rebel and enter as Independents.
 */
export function allocateTicket(
  campaign: CampaignState,
  electionId: string,
  constituencyId: string,
  candidateId: string,
  partyId: string,
): {
  campaign: CampaignState;
  resultMessage: string;
  rebelsGenerated: RebelCandidate[];
} {
  const election = campaign.elections.find((e) => e.id === electionId);
  if (!election) {
    return {
      campaign,
      resultMessage: "Election not found.",
      rebelsGenerated: [],
    };
  }

  // Ensure claimants exist
  let claimants = election.ticketClaimants;
  if (!claimants || claimants.length === 0) {
    claimants = generateTicketClaimants(campaign, electionId);
  }

  const newClaimants = [...claimants];
  const chosenClaimant = newClaimants.find(
    (c) =>
      c.candidateId === candidateId &&
      c.constituencyId === constituencyId &&
      c.partyId === partyId,
  );

  if (!chosenClaimant) {
    return {
      campaign,
      resultMessage: "Candidate is not an active claimant for this constituency.",
      rebelsGenerated: [],
    };
  }

  // Confirm chosen claimant
  chosenClaimant.status = "confirmed";
  chosenClaimant.dissatisfaction = Math.max(0, chosenClaimant.dissatisfaction - 15);

  const rebelsGenerated: RebelCandidate[] = [];
  const newRebels = [...(election.rebels ?? [])];
  const newCandidates = [...election.candidates];
  const events: CampaignEvent[] = [];

  // Deny other claimants for the same party & seat
  for (const c of newClaimants) {
    if (
      c.partyId === partyId &&
      c.constituencyId === constituencyId &&
      c.candidateId !== candidateId &&
      c.status !== "confirmed"
    ) {
      c.status = "denied";
      // Dissatisfaction spikes proportional to claim strength
      c.dissatisfaction = Math.min(100, c.dissatisfaction + Math.round(c.claimStrength * 0.7));

      // Rebel roll
      const roll = (c.candidateId.length * 19 + Date.now()) % 100;
      if (roll < c.rebelRisk && c.popularity >= 28) {
        const voteSplit = Math.min(
          0.40,
          Math.max(0.12, (c.popularity / 100) * 0.42),
        );

        const rebel: RebelCandidate = {
          id: `rebel-${c.candidateId}-${Date.now()}`,
          candidateId: c.candidateId,
          name: c.name,
          originalPartyId: partyId,
          constituencyId,
          electionId,
          popularity: c.popularity,
          voteSplitFactor: Math.round(voteSplit * 100) / 100,
          isIndependent: true,
        };

        rebelsGenerated.push(rebel);
        newRebels.push(rebel);

        // Add rebel to election candidates as an Independent
        newCandidates.push({
          id: rebel.id,
          name: `${c.name} (Rebel)`,
          partyId: "IND",
          constituencyId,
          popularity: Math.round(c.popularity * 0.85),
          experience: c.experience,
          isRebel: true,
          formerPartyId: partyId,
          voteSplitFactor: rebel.voteSplitFactor,
        });

        // Event for rebel
        events.push({
          id: `event-rebel-${c.candidateId}-${Date.now()}`,
          date: campaign.calendar.currentDate,
          category: "elections",
          title: `Rebel Alert: ${c.name} revolts in ${constituencyId}`,
          description: `After being denied the party nomination, ${c.name} has entered the fray as an Independent rebel, threatening to split the vote.`,
          importance: c.popularity > 55 ? "critical" : "medium",
        });
      }
    }
  }

  // Register nominated candidate in election candidates if not already there
  const existingNominationIndex = newCandidates.findIndex(
    (cand) =>
      cand.constituencyId === constituencyId &&
      cand.partyId === partyId &&
      !cand.isRebel,
  );

  const nominatedCandidate: ElectionCandidate = {
    id: `cand-${partyId}-${constituencyId}`,
    name: chosenClaimant.name,
    partyId,
    constituencyId,
    popularity: chosenClaimant.popularity,
    experience: chosenClaimant.experience,
    sourceProfileId: chosenClaimant.candidateId,
  };

  if (existingNominationIndex >= 0) {
    newCandidates[existingNominationIndex] = nominatedCandidate;
  } else {
    newCandidates.push(nominatedCandidate);
  }

  // Update candidate pool if player party
  let updatedPool = campaign.organization.candidatePool;
  if (updatedPool) {
    updatedPool = updatedPool.map((cp) => {
      if (cp.id === candidateId) {
        return {
          ...cp,
          constituencyId,
          dissatisfaction: Math.max(0, (cp.dissatisfaction ?? 0) - 15),
        };
      }
      return cp;
    });
  }

  // Build updated election
  const updatedElection: Election = {
    ...election,
    candidates: newCandidates,
    rebels: newRebels,
    ticketClaimants: newClaimants,
  };

  const updatedElections = campaign.elections.map((e) =>
    e.id === electionId ? updatedElection : e,
  );

  const rebelNote =
    rebelsGenerated.length > 0
      ? ` Warning: ${rebelsGenerated.length} denied claimant(s) launched rebel candidacies!`
      : "";

  return {
    campaign: {
      ...campaign,
      elections: updatedElections,
      organization: {
        ...campaign.organization,
        candidatePool: updatedPool,
      },
      history: {
        events: [...events, ...campaign.history.events],
      },
    },
    resultMessage: `Ticket confirmed for ${chosenClaimant.name} in ${constituencyId}.${rebelNote}`,
    rebelsGenerated,
  };
}

/**
 * Automate ticket distribution for AI parties in an election.
 * Resolves claims, nominates top candidates, and generates AI rebels.
 */
export function aiDistributeTickets(
  campaign: CampaignState,
  electionId: string,
): CampaignState {
  const election = campaign.elections.find((e) => e.id === electionId);
  if (!election) return campaign;

  let currentCampaign = campaign;
  let claimants = election.ticketClaimants;
  if (!claimants || claimants.length === 0) {
    claimants = generateTicketClaimants(campaign, electionId);
  }

  // Group AI claimants by partyId and constituencyId
  const aiPartyClaimants = claimants.filter((c) => {
    const party = campaign.politicalWorld.parties.find((p) => p.id === c.partyId);
    return party && !party.isPlayerParty;
  });

  const seatPartyMap = new Map<string, TicketClaimant[]>();
  for (const c of aiPartyClaimants) {
    const key = `${c.partyId}::${c.constituencyId}`;
    const list = seatPartyMap.get(key) ?? [];
    list.push(c);
    seatPartyMap.set(key, list);
  }

  for (const [, candidates] of seatPartyMap.entries()) {
    // Pick the candidate with highest claim strength
    candidates.sort((a, b) => b.claimStrength - a.claimStrength);
    const chosen = candidates[0];

    const result = allocateTicket(
      currentCampaign,
      electionId,
      chosen.constituencyId,
      chosen.candidateId,
      chosen.partyId,
    );
    currentCampaign = result.campaign;
  }

  return currentCampaign;
}
