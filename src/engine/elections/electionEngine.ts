import type {
  CampaignState,
  Election,
  ElectionCandidate,
  ElectionResult,
  ConstituencyControl,
  CampaignEvent,
  StateGovernment,
  ChiefMinisterProfile,
} from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";
import {
  generateDynamicChiefMinister,
  calculateCabinetStability,
} from "@/engine/governance/chiefMinisters";
import { resolvePostPollGovernmentFormation } from "@/engine/coalitions/coalitionEngine";

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
      // Check pre-poll coalition agreement: Did this party yield this seat to an ally?
      let yieldedToAlly = false;
      let isAlliedContender = false;

      for (const agreement of campaign.politicalWorld.coalitionAgreements ?? []) {
        if (agreement.electionId === election.id && agreement.status === "agreed") {
          const designatedPartyId = agreement.allocatedSeats[seat.id];
          if (designatedPartyId) {
            if (designatedPartyId !== party.id && agreement.partnerPartyIds.includes(party.id)) {
              yieldedToAlly = true;
              break;
            } else if (designatedPartyId === party.id) {
              isAlliedContender = true;
            }
          }
        }
      }

      if (yieldedToAlly) {
        // Party yielded this constituency to its alliance partner
        continue;
      }

      const isPlayer = party.isPlayerParty;
      const isIncumbent = incumbent?.winningPartyId === party.id;

      // Base strength
      let score = (party.popularity * 0.45) + (party.organizationStrength * 0.35) + (party.electoralStrength * 0.20);

      // Alliance synergy bonus if this is an agreed coalition seat
      if (isAlliedContender) {
        score += 8;
      }

      // Candidate and organizational ground bonuses
      if (isPlayer && playerNomination) {
        score += (playerNomination.popularity * 0.18);
        if (playerNomination.experience) {
          score += (playerNomination.experience * 0.08);
        }

        // Campaign style synergy
        if (playerNomination.campaignStyle === "grassroots") {
          score += 5;
        } else if (playerNomination.campaignStyle === "orator") {
          score += (party.popularity > 50 ? 6 : 3);
        } else if (playerNomination.campaignStyle === "money_power") {
          score += 5;
        } else if (playerNomination.campaignStyle === "technocrat") {
          score += 4;
        }

        // District Office ground presence boost in this state
        const stateOffices = (campaign.organization.offices ?? []).filter(
          (o) => o.partyId === playerParty?.id && o.stateId === seat.stateId,
        );
        if (stateOffices.length > 0) {
          score += Math.min(8, stateOffices.length * 2);
        }
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

    // Process rebel candidates in this constituency (vote splitting)
    const constituencyRebels = (election.rebels ?? []).filter(
      (r) => r.constituencyId === seat.id,
    );

    for (const rebel of constituencyRebels) {
      const originalPartyScoreEntry = candidateScores.find(
        (c) => c.partyId === rebel.originalPartyId,
      );

      const splitFactor = rebel.voteSplitFactor ?? 0.25;
      let stolenScore = 0;

      if (originalPartyScoreEntry) {
        stolenScore = Math.round(originalPartyScoreEntry.score * splitFactor);
        originalPartyScoreEntry.score = Math.max(5, originalPartyScoreEntry.score - stolenScore);
      }

      // Rebel score consists of stolen party base + candidate popularity draw + local factor
      const rebelPersonalDraw = Math.round((rebel.popularity * 0.3) + ((seat.constituencyNumber * 7) % 15));
      const rebelScore = Math.max(8, stolenScore + rebelPersonalDraw);

      candidateScores.push({
        partyId: "IND",
        candidateId: rebel.id,
        score: rebelScore,
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

  // Determine Government Formation via Post-Poll Resolution
  const postPollResolution = resolvePostPollGovernmentFormation(
    campaign,
    election.id,
    stateId ?? null,
    seatsWonMap,
    totalSeats,
    majorityMark,
  );

  const governmentType = postPollResolution.governmentType;
  const rulingPartyId = postPollResolution.rulingPartyId;
  const rulingAllianceId = postPollResolution.rulingAllianceId;
  let cmName: string = region?.chiefMinisterName ?? "Elected Leader";
  const largestParty = campaign.politicalWorld.parties.find((p) => p.id === rulingPartyId);

  // Update State Government record and Chief Minister if Vidhan Sabha election
  let updatedGovernments = campaign.politicalWorld.stateGovernments;
  if (stateId) {
    const govIndex = campaign.politicalWorld.stateGovernments.findIndex(
      (g) => g.stateId === stateId,
    );
    const existingGov = govIndex >= 0 ? campaign.politicalWorld.stateGovernments[govIndex] : undefined;

    let cmProfile: ChiefMinisterProfile | null = null;

    if (rulingPartyId === playerParty?.id) {
      const topPlayerLeader = campaign.organization.leaders.find((l) => l.partyId === playerParty.id);
      cmName = topPlayerLeader ? topPlayerLeader.name : "Party President";
      cmProfile = {
        id: `cm-${stateId}-player`,
        name: cmName,
        stateId,
        partyId: playerParty.id,
        age: 46,
        experience: topPlayerLeader?.experience ?? 60,
        approvalRating: topPlayerLeader?.popularity ?? 65,
        leaderArchetype: "charismatic_populist",
        coalitionManagementSkill: 75,
        tenureDays: 1,
        avatarSeed: `${stateId}-${cmName.replace(/\s+/g, "_")}`,
        bio: `${cmName} of ${playerParty.name} leads the newly formed government in ${region?.name ?? stateId}.`,
      };
    } else if (existingGov?.rulingPartyId === rulingPartyId && existingGov.chiefMinister) {
      // Party retained power: keep existing CM with popularity boost
      cmProfile = {
        ...existingGov.chiefMinister,
        approvalRating: Math.min(95, existingGov.chiefMinister.approvalRating + 4),
        tenureDays: existingGov.chiefMinister.tenureDays + 30,
      };
      cmName = cmProfile.name;
    } else {
      // New party took power: generate dynamic Chief Minister
      const rulingPartyObj = campaign.politicalWorld.parties.find((p) => p.id === rulingPartyId);
      cmProfile = generateDynamicChiefMinister(
        stateId,
        rulingPartyId,
        rulingPartyObj?.name ?? rulingPartyId,
      );
      cmName = cmProfile.name;
    }

    const cabinetStability = postPollResolution.cabinetStability;

    // Calculate next 5-year term end
    const pollDate = new Date(election.date);
    pollDate.setUTCFullYear(pollDate.getUTCFullYear() + 5);
    const newTermEnd = pollDate.toISOString().slice(0, 10);

    const totalCabinetPortfolios = Object.values(postPollResolution.cabinetPortfolios).reduce(
      (a, b) => a + b,
      0,
    );

    const updatedGov: StateGovernment = {
      stateId,
      rulingPartyId,
      rulingAllianceId,
      chiefMinisterName: cmName,
      chiefMinister: cmProfile,
      cabinetStability,
      cabinetSeats: totalCabinetPortfolios,
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
    description: `${postPollResolution.bargainSummary} Your party won ${playerSeatsWon} seat(s).`,
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

  const existingBargains = campaign.politicalWorld.postPollBargains ?? [];
  const updatedBargains = [
    ...existingBargains.filter((b) => b.electionId !== electionId),
    postPollResolution.postPollBargain,
  ];

  return {
    ...campaign,
    politicalWorld: {
      ...campaign.politicalWorld,
      stateGovernments: updatedGovernments,
      constituencyControl: Array.from(updatedControlMap.values()),
      postPollBargains: updatedBargains,
    },
    elections: updatedElections,
    history: {
      ...campaign.history,
      events: [...campaign.history.events, event],
    },
  };
}
