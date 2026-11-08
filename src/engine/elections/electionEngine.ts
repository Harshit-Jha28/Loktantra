import type {
  CampaignState,
  Election,
  ElectionCandidate,
  ElectionResult,
  ConstituencyControl,
  CampaignEvent,
  StateGovernment,
} from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";

/**
 * Nominate a party candidate in a constituency for an upcoming election.
 */
export function nominateCandidate(
  campaign: CampaignState,
  electionId: string,
  candidateInput: {
    name: string;
    partyId: string;
    constituencyId: string;
    popularity?: number;
    experience?: number;
  },
): CampaignState {
  const electionIndex = campaign.elections.findIndex((e) => e.id === electionId);
  if (electionIndex === -1) {
    throw new Error("Election not found.");
  }

  const election = campaign.elections[electionIndex];
  if (election.status === "completed" || election.status === "results") {
    throw new Error("Nominations are closed for this election.");
  }

  // Check if candidate already nominated in this constituency for this party
  const existing = election.candidates.find(
    (c) =>
      c.constituencyId === candidateInput.constituencyId &&
      c.partyId === candidateInput.partyId,
  );
  if (existing) {
    throw new Error("A candidate from your party is already nominated for this seat.");
  }

  const candidateId = `cand-${candidateInput.partyId}-${candidateInput.constituencyId}`;
  const candidate: ElectionCandidate = {
    id: candidateId,
    name: candidateInput.name.trim(),
    partyId: candidateInput.partyId,
    constituencyId: candidateInput.constituencyId,
    popularity: candidateInput.popularity ?? 50,
    experience: candidateInput.experience ?? 40,
  };

  const updatedElection: Election = {
    ...election,
    candidates: [...election.candidates, candidate],
  };

  const updatedElections = [...campaign.elections];
  updatedElections[electionIndex] = updatedElection;

  return {
    ...campaign,
    elections: updatedElections,
  };
}

/**
 * Simulates polling and calculates FPTP results for an election.
 * Updates constituency control, government formation, and campaign history.
 */
export function simulateElection(
  campaign: CampaignState,
  electionId: string,
): CampaignState {
  const election = campaign.elections.find((e) => e.id === electionId);
  if (!election) {
    throw new Error("Election not found.");
  }

  const stateId = election.stateId;
  const region = stateId ? INDIA_REGIONS.find((r) => r.id === stateId) : undefined;

  // Determine constituencies to contest
  const constituencies = election.type === "vidhan_sabha" && stateId
    ? INDIA_ASSEMBLY_CONSTITUENCIES.filter((ac) => ac.stateId === stateId)
    : INDIA_LOK_SABHA_CONSTITUENCIES;

  const totalSeats = constituencies.length;
  const majorityMark = Math.floor(totalSeats / 2) + 1;

  // Identify participating parties in this state/nation
  const activeParties = campaign.politicalWorld.parties.filter((p) => p.isActive);
  const playerParty = activeParties.find((p) => p.isPlayerParty);

  // Relevant competing parties
  let competingParties = activeParties.filter((p) => {
    if (p.isPlayerParty) return true;
    if (region && region.rulingPartyId === p.id) return true;
    if (p.id === "ndf" || p.id === "ppc") return true;
    if (region && region.allianceId === p.allianceId) return true;
    return p.headquartersStateId === stateId || p.organizationStrength > 65;
  });

  if (competingParties.length < 2) {
    competingParties = activeParties.slice(0, 4);
  }

  const results: ElectionResult[] = [];
  const updatedControlMap = new Map<string, ConstituencyControl>();

  // Copy existing control
  for (const c of campaign.politicalWorld.constituencyControl) {
    updatedControlMap.set(c.constituencyId, c);
  }

  // Seat tally per party in this election
  const seatsWonMap = new Map<string, number>();

  // Simulate each constituency using FPTP
  for (const seat of constituencies) {
    // Check if player nominated a candidate
    const playerNomination = election.candidates.find(
      (c) => c.constituencyId === seat.id && c.partyId === playerParty?.id,
    );

    // Current incumbent control
    const incumbent = updatedControlMap.get(seat.id);

    // Calculate score for each competing party
    const candidateScores: { partyId: string; candidateId: string; score: number }[] = [];

    for (const party of competingParties) {
      const isPlayer = party.isPlayerParty;
      const isIncumbent = incumbent?.winningPartyId === party.id;

      // Base strength
      let score = (party.popularity * 0.45) + (party.organizationStrength * 0.35) + (party.electoralStrength * 0.20);

      // Candidate bonus
      if (isPlayer && playerNomination) {
        score += (playerNomination.popularity * 0.15);
      } else if (isPlayer && !playerNomination) {
        // Did not nominate candidate in this seat
        score = 0;
      }

      // Incumbency factor
      if (isIncumbent) {
        score += 8;
      }

      // Pseudo-random constituency local swing based on seat number
      const localSwing = ((seat.constituencyNumber * 17 + seat.name.length * 7) % 31) - 15;
      score = Math.max(5, score + localSwing);

      const candidateId = isPlayer && playerNomination
        ? playerNomination.id
        : `cand-${party.id}-${seat.id}`;

      candidateScores.push({
        partyId: party.id,
        candidateId,
        score,
      });
    }

    // Calculate total score and vote shares
    const totalScore = candidateScores.reduce((s, c) => s + c.score, 0);
    const totalVotesInConstituency = 150000 + ((seat.constituencyNumber * 1234) % 50000);

    let maxVotes = -1;
    let winnerPartyId = candidateScores[0].partyId;
    let winnerCandidateId = candidateScores[0].candidateId;

    for (const cand of candidateScores) {
      const voteShare = totalScore > 0 ? (cand.score / totalScore) * 100 : 0;
      const votes = Math.round((voteShare / 100) * totalVotesInConstituency);

      if (votes > maxVotes) {
        maxVotes = votes;
        winnerPartyId = cand.partyId;
        winnerCandidateId = cand.candidateId;
      }
    }

    // Register results for all candidates
    for (const cand of candidateScores) {
      const voteShare = totalScore > 0 ? (cand.score / totalScore) * 100 : 0;
      const votes = Math.round((voteShare / 100) * totalVotesInConstituency);
      const won = cand.partyId === winnerPartyId;

      results.push({
        candidateId: cand.candidateId,
        partyId: cand.partyId,
        votes,
        voteShare: Math.round(voteShare * 10) / 10,
        won,
      });
    }

    // Tally seat won
    seatsWonMap.set(winnerPartyId, (seatsWonMap.get(winnerPartyId) ?? 0) + 1);

    // Update constituency control
    updatedControlMap.set(seat.id, {
      constituencyId: seat.id,
      constituencyType: election.type,
      stateId: seat.stateId,
      winningPartyId: winnerPartyId,
      candidateId: winnerCandidateId,
      lastElectionId: election.id,
    });
  }

  // Determine Government Formation
  // Sort parties by seats won
  const seatRankings = Array.from(seatsWonMap.entries())
    .map(([partyId, seats]) => ({
      partyId,
      party: campaign.politicalWorld.parties.find((p) => p.id === partyId),
      seats,
    }))
    .sort((a, b) => b.seats - a.seats);

  const largestParty = seatRankings[0];
  let governmentType: StateGovernment["governmentType"] = "majority";
  let rulingPartyId: string = largestParty?.partyId ?? "ndf";
  let rulingAllianceId: string | null = null;
  let cmName: string = region?.chiefMinisterName ?? "Elected Leader";

  if (largestParty && largestParty.seats >= majorityMark) {
    governmentType = "majority";
    rulingPartyId = largestParty.partyId;
  } else if (largestParty) {
    // Check if alliance forms coalition
    const largestPartyAllianceId = largestParty.party?.allianceId;
    if (largestPartyAllianceId) {
      const allianceMembers = campaign.politicalWorld.parties.filter(
        (p) => p.allianceId === largestPartyAllianceId,
      );
      const allianceSeats = allianceMembers.reduce(
        (sum, p) => sum + (seatsWonMap.get(p.id) ?? 0),
        0,
      );

      if (allianceSeats >= majorityMark) {
        governmentType = "coalition";
        rulingPartyId = largestParty.partyId;
        rulingAllianceId = largestPartyAllianceId;
      } else {
        governmentType = "minority";
        rulingPartyId = largestParty.partyId;
      }
    } else {
      governmentType = "minority";
      rulingPartyId = largestParty.partyId;
    }
  }

  // Update CM name if player won
  if (rulingPartyId === playerParty?.id) {
    const topPlayerLeader = campaign.organization.leaders.find((l) => l.partyId === playerParty.id);
    cmName = topPlayerLeader ? topPlayerLeader.name : "Party President";
  }

  // Update State Government record if Vidhan Sabha election
  let updatedGovernments = campaign.politicalWorld.stateGovernments;
  if (stateId) {
    const govIndex = campaign.politicalWorld.stateGovernments.findIndex(
      (g) => g.stateId === stateId,
    );

    // Calculate next 5-year term end
    const pollDate = new Date(election.date);
    pollDate.setUTCFullYear(pollDate.getUTCFullYear() + 5);
    const newTermEnd = pollDate.toISOString().slice(0, 10);

    const updatedGov: StateGovernment = {
      stateId,
      rulingPartyId,
      rulingAllianceId,
      chiefMinisterName: cmName,
      governmentType,
      assemblyTermEnd: newTermEnd,
    };

    if (govIndex >= 0) {
      updatedGovernments = [...campaign.politicalWorld.stateGovernments];
      updatedGovernments[govIndex] = updatedGov;
    } else {
      updatedGovernments = [...campaign.politicalWorld.stateGovernments, updatedGov];
    }
  }

  // Create election event
  const playerSeatsWon = playerParty ? (seatsWonMap.get(playerParty.id) ?? 0) : 0;
  const event: CampaignEvent = {
    id: crypto.randomUUID(),
    date: election.date,
    category: "election",
    title: `Election Results: ${election.name}`,
    description: `${largestParty?.party?.name ?? largestParty?.partyId} emerged as the single largest party with ${largestParty?.seats} seats out of ${totalSeats}. Government formed: ${governmentType.toUpperCase()} (CM: ${cmName}). Your party won ${playerSeatsWon} seat(s).`,
    importance: "critical",
  };

  // Mark election as completed with results
  const updatedElections = campaign.elections.map((e) => {
    if (e.id === electionId) {
      return {
        ...e,
        status: "completed" as const,
        results,
      };
    }
    return e;
  });

  return {
    ...campaign,
    politicalWorld: {
      ...campaign.politicalWorld,
      stateGovernments: updatedGovernments,
      constituencyControl: Array.from(updatedControlMap.values()),
    },
    elections: updatedElections,
    history: {
      ...campaign.history,
      events: [...campaign.history.events, event],
    },
  };
}
