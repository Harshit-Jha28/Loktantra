import type {
  CampaignState,
  CoalitionAgreement,
  PostPollBargain,
  PoliticalParty,
  Ideology,
  GovernmentType,
  CampaignEvent,
} from "@/types/campaign";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";

/**
 * Calculates ideological friction between two party ideologies (0-100).
 */
export function calculateIdeologicalFriction(
  ideologyA: Ideology,
  ideologyB: Ideology,
): number {
  if (ideologyA === ideologyB) return 0;

  const pairs: Record<string, number> = {
    "Progressive::Centrist": 12,
    "Centrist::Progressive": 12,
    "Progressive::Regionalist": 20,
    "Regionalist::Progressive": 20,
    "Progressive::Nationalist": 48,
    "Nationalist::Progressive": 48,
    "Centrist::Nationalist": 18,
    "Nationalist::Centrist": 18,
    "Centrist::Regionalist": 15,
    "Regionalist::Centrist": 15,
    "Nationalist::Regionalist": 32,
    "Regionalist::Nationalist": 32,
  };

  return pairs[`${ideologyA}::${ideologyB}`] ?? 25;
}

/**
 * Calculate a party's leverage and claim for seats in a specific state.
 */
export function calculateSeatSharingLeverage(
  party: PoliticalParty,
  stateId: string | null,
  campaign: CampaignState,
): number {
  let score =
    party.popularity * 0.4 +
    party.organizationStrength * 0.35 +
    party.electoralStrength * 0.25;

  if (stateId) {
    if (party.headquartersStateId === stateId) {
      score += 15;
    }

    // Incumbent seats controlled in this state
    const incumbentSeats = campaign.politicalWorld.constituencyControl.filter(
      (c) => c.stateId === stateId && c.winningPartyId === party.id,
    ).length;

    score += Math.min(30, incumbentSeats * 2.5);

    // District offices presence
    const offices = (campaign.organization.offices ?? []).filter(
      (o) => o.partyId === party.id && o.stateId === stateId,
    ).length;
    score += Math.min(15, offices * 3);
  }

  return Math.max(10, Math.round(score));
}

/**
 * Propose and finalize a pre-poll seat-sharing agreement for an election.
 */
export function proposeSeatSharingAgreement(
  campaign: CampaignState,
  electionId: string,
  allianceId: string,
  leadPartyId: string,
  partnerPartyId: string,
  customQuotas?: Record<string, number>,
  agreedPolicyIds?: string[],
): {
  campaign: CampaignState;
  agreement: CoalitionAgreement;
  resultMessage: string;
} {
  const election = campaign.elections.find((e) => e.id === electionId);
  if (!election) {
    throw new Error(`Election ${electionId} not found.`);
  }

  const leadParty = campaign.politicalWorld.parties.find((p) => p.id === leadPartyId);
  const partnerParty = campaign.politicalWorld.parties.find((p) => p.id === partnerPartyId);

  if (!leadParty || !partnerParty) {
    throw new Error("One or both parties in negotiation could not be found.");
  }

  const stateId = election.stateId;
  const constituencies =
    election.type === "vidhan_sabha" && stateId
      ? INDIA_ASSEMBLY_CONSTITUENCIES.filter((ac) => ac.stateId === stateId)
      : INDIA_LOK_SABHA_CONSTITUENCIES;

  const totalSeats = constituencies.length;

  // Calculate leverage and quotas
  const leadLeverage = calculateSeatSharingLeverage(leadParty, stateId, campaign);
  const partnerLeverage = calculateSeatSharingLeverage(partnerParty, stateId, campaign);
  const totalLeverage = leadLeverage + partnerLeverage;

  let leadQuota = Math.round(totalSeats * (leadLeverage / totalLeverage));
  let partnerQuota = totalSeats - leadQuota;

  if (customQuotas && customQuotas[leadPartyId] && customQuotas[partnerPartyId]) {
    leadQuota = customQuotas[leadPartyId];
    partnerQuota = customQuotas[partnerPartyId];
  }

  // Allocate specific constituencies to each partner
  const allocatedSeats: Record<string, string> = {};
  let leadAssigned = 0;

  // 1. Give incumbents their held seats
  for (const seat of constituencies) {
    const control = campaign.politicalWorld.constituencyControl.find(
      (c) => c.constituencyId === seat.id,
    );

    if (control?.winningPartyId === leadPartyId && leadAssigned < leadQuota) {
      allocatedSeats[seat.id] = leadPartyId;
      leadAssigned++;
    } else if (control?.winningPartyId === partnerPartyId) {
      allocatedSeats[seat.id] = partnerPartyId;
    }
  }

  // 2. Fill remaining seats to match quotas
  for (const seat of constituencies) {
    if (!allocatedSeats[seat.id]) {
      if (leadAssigned < leadQuota) {
        allocatedSeats[seat.id] = leadPartyId;
        leadAssigned++;
      } else {
        allocatedSeats[seat.id] = partnerPartyId;
      }
    }
  }

  const ideologicalFriction = calculateIdeologicalFriction(
    leadParty.ideology,
    partnerParty.ideology,
  );

  const agreement: CoalitionAgreement = {
    id: `coalition-${electionId}-${leadPartyId}-${partnerPartyId}`,
    electionId,
    allianceId,
    partnerPartyIds: [leadPartyId, partnerPartyId],
    leadPartyId,
    seatQuotas: {
      [leadPartyId]: leadQuota,
      [partnerPartyId]: partnerQuota,
    },
    allocatedSeats,
    cmpPolicies: agreedPolicyIds ?? ["welfare", "infrastructure"],
    ideologicalFriction,
    status: "agreed",
  };

  const existingAgreements = campaign.politicalWorld.coalitionAgreements ?? [];
  const updatedAgreements = [
    ...existingAgreements.filter((a) => a.id !== agreement.id),
    agreement,
  ];

  const event: CampaignEvent = {
    id: `event-coalition-${Date.now()}`,
    date: campaign.calendar.currentDate,
    category: "alliances",
    title: `Seat-Sharing Pact: ${leadParty.name} & ${partnerParty.name}`,
    description: `Pre-poll alliance finalized for ${election.name}. ${leadParty.abbreviation} contests ${leadQuota} seats; ${partnerParty.abbreviation} contests ${partnerQuota} seats with a Common Minimum Programme.`,
    importance: "high",
  };

  return {
    campaign: {
      ...campaign,
      politicalWorld: {
        ...campaign.politicalWorld,
        coalitionAgreements: updatedAgreements,
      },
      history: {
        events: [event, ...campaign.history.events],
      },
    },
    agreement,
    resultMessage: `Seat-sharing agreement ratified: ${leadParty.abbreviation} (${leadQuota} seats) · ${partnerParty.abbreviation} (${partnerQuota} seats).`,
  };
}

/**
 * Resolves post-poll bargaining when no single party wins an absolute majority.
 * Distributes cabinet portfolios, evaluates Deputy CM claims, and computes cabinet stability.
 */
export function resolvePostPollGovernmentFormation(
  campaign: CampaignState,
  electionId: string,
  stateId: string | null,
  seatsWonMap: Map<string, number>,
  totalSeats: number,
  majorityMark: number,
): {
  governmentType: GovernmentType;
  rulingPartyId: string;
  rulingAllianceId: string | null;
  coalitionPartners: string[];
  cabinetPortfolios: Record<string, number>;
  hasDeputyCm: boolean;
  deputyCmPartyId?: string;
  cabinetStability: number;
  bargainSummary: string;
  postPollBargain: PostPollBargain;
} {
  // Sort recognized parties by seats won
  const seatRankings = Array.from(seatsWonMap.entries())
    .map(([partyId, seats]) => ({
      partyId,
      party: campaign.politicalWorld.parties.find((p) => p.id === partyId),
      seats,
    }))
    .filter(
      (item): item is { partyId: string; party: NonNullable<typeof item.party>; seats: number } =>
        item.party !== undefined,
    )
    .sort((a, b) => b.seats - a.seats);

  const largestParty = seatRankings[0];
  const totalCabinetBerths = Math.min(35, Math.max(12, Math.round(totalSeats * 0.15)));

  // Case 1: Outright single party majority
  if (largestParty && largestParty.seats >= majorityMark) {
    const postPollBargain: PostPollBargain = {
      electionId,
      stateId: stateId ?? "national",
      claimantPartyIds: [largestParty.partyId],
      leadPartyId: largestParty.partyId,
      cabinetPortfolios: { [largestParty.partyId]: totalCabinetBerths },
      hasDeputyChiefMinister: false,
      stabilityScore: Math.min(95, 75 + (largestParty.seats - majorityMark) * 2),
      status: "ratified",
    };

    return {
      governmentType: "majority",
      rulingPartyId: largestParty.partyId,
      rulingAllianceId: null,
      coalitionPartners: [largestParty.partyId],
      cabinetPortfolios: postPollBargain.cabinetPortfolios,
      hasDeputyCm: false,
      cabinetStability: postPollBargain.stabilityScore,
      bargainSummary: `${largestParty.party.name} secured an absolute majority (${largestParty.seats}/${totalSeats} seats) and forms a single-party government.`,
      postPollBargain,
    };
  }

  // Case 2: Post-poll coalition needed
  // Check if existing alliance reaches majority
  let rulingAllianceId: string | null = null;
  let coalitionMembers: typeof seatRankings = [];

  const largestAllianceId = largestParty?.party?.allianceId;
  if (largestAllianceId) {
    const alliancePartners = seatRankings.filter(
      (s) => s.party.allianceId === largestAllianceId,
    );
    const allianceTotalSeats = alliancePartners.reduce((acc, s) => acc + s.seats, 0);

    if (allianceTotalSeats >= majorityMark) {
      rulingAllianceId = largestAllianceId;
      coalitionMembers = alliancePartners;
    }
  }

  // If pre-poll alliance insufficient, largest party cobbles together a broad coalition
  if (coalitionMembers.length === 0) {
    let accumulatedSeats = 0;
    coalitionMembers = [];

    for (const contender of seatRankings) {
      coalitionMembers.push(contender);
      accumulatedSeats += contender.seats;
      if (accumulatedSeats >= majorityMark) break;
    }
  }

  const coalitionTotalSeats = coalitionMembers.reduce((acc, s) => acc + s.seats, 0);
  const leadParty = coalitionMembers[0];
  const juniorPartners = coalitionMembers.slice(1);

  // Allocate ministerial portfolios proportional to seat contributions
  const cabinetPortfolios: Record<string, number> = {};
  let remainingBerths = totalCabinetBerths;

  for (let i = 0; i < coalitionMembers.length; i++) {
    const member = coalitionMembers[i];
    if (i === coalitionMembers.length - 1) {
      cabinetPortfolios[member.partyId] = Math.max(1, remainingBerths);
    } else {
      const share = Math.max(1, Math.round((member.seats / coalitionTotalSeats) * totalCabinetBerths));
      cabinetPortfolios[member.partyId] = share;
      remainingBerths -= share;
    }
  }

  // Deputy CM claim: largest junior partner gets Deputy CM if they hold >= 25% of coalition seats
  let hasDeputyCm = false;
  let deputyCmPartyId: string | undefined = undefined;

  const seniorJuniorPartner = juniorPartners[0];
  if (seniorJuniorPartner && seniorJuniorPartner.seats / coalitionTotalSeats >= 0.25) {
    hasDeputyCm = true;
    deputyCmPartyId = seniorJuniorPartner.partyId;
  }

  // Coalition stability calculation
  const seatSurplus = coalitionTotalSeats - majorityMark;
  const partnerFriction = juniorPartners.reduce((acc, p) => {
    return acc + calculateIdeologicalFriction(leadParty.party.ideology, p.party.ideology);
  }, 0);
  const avgFriction = juniorPartners.length > 0 ? partnerFriction / juniorPartners.length : 0;

  const baseStability = coalitionTotalSeats >= majorityMark ? 62 : 38;
  const cabinetStability = Math.max(
    25,
    Math.min(
      88,
      Math.round(
        baseStability +
          seatSurplus * 2 -
          juniorPartners.length * 4 -
          avgFriction * 0.25 +
          (hasDeputyCm ? 6 : 0),
      ),
    ),
  );

  const governmentType: GovernmentType =
    coalitionTotalSeats >= majorityMark ? "coalition" : "minority";

  const partnerNames = juniorPartners.map((p) => p.party.abbreviation).join(", ");
  const bargainSummary =
    governmentType === "coalition"
      ? `${leadParty.party.name} (${leadParty.seats} seats) allied with ${partnerNames} to reach majority (${coalitionTotalSeats}/${totalSeats} seats). Cabinet divided: ${Object.entries(
          cabinetPortfolios,
        )
          .map(([pId, b]) => `${pId.toUpperCase()}: ${b}`)
          .join(", ")}.${hasDeputyCm ? ` Deputy CM conceded to ${seniorJuniorPartner.party.abbreviation}.` : ""}`
      : `${leadParty.party.name} (${leadParty.seats} seats) failed to reach a majority and forms a fragile minority government.`;

  const postPollBargain: PostPollBargain = {
    electionId,
    stateId: stateId ?? "national",
    claimantPartyIds: coalitionMembers.map((m) => m.partyId),
    leadPartyId: leadParty.partyId,
    cabinetPortfolios,
    hasDeputyChiefMinister: hasDeputyCm,
    deputyCmPartyId,
    stabilityScore: cabinetStability,
    status: "ratified",
  };

  return {
    governmentType,
    rulingPartyId: leadParty.partyId,
    rulingAllianceId,
    coalitionPartners: coalitionMembers.map((m) => m.partyId),
    cabinetPortfolios,
    hasDeputyCm,
    deputyCmPartyId,
    cabinetStability,
    bargainSummary,
    postPollBargain,
  };
}
