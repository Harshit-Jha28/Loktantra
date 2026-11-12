import type {
  CampaignState,
  PoliticalLeader,
  PartyFaction,
  DefectionAttempt,
  AntiDefectionEvent,
  PoliticalParty,
  CampaignEvent,
  FinanceTransaction,
  StateGovernment,
} from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import { INDIA_ASSEMBLY_CONSTITUENCIES } from "@/data/constituencies";

export interface PoachableLeaderProspect {
  leader: PoliticalLeader;
  party: PoliticalParty;
  poachingCost: number;
  successProbability: number; // 0-100%
  grievanceDescription: string;
}

/**
 * Identify rival party leaders that can be approached for defection.
 */
export function getPoachableRivalLeaders(
  campaign: CampaignState,
  targetPartyId?: string,
): PoachableLeaderProspect[] {
  const playerParty = campaign.politicalWorld.parties.find((p) => p.isPlayerParty);
  if (!playerParty) return [];

  const candidates: PoachableLeaderProspect[] = [];

  // Filter rival leaders
  const rivalLeaders = campaign.organization.leaders.filter((l) => {
    if (l.partyId === playerParty.id) return false;
    if (targetPartyId && l.partyId !== targetPartyId) return false;
    return true;
  });

  for (const leader of rivalLeaders) {
    const party = campaign.politicalWorld.parties.find((p) => p.id === leader.partyId);
    if (!party) continue;

    // Poaching cost formula: base + popularity * 500 + experience * 300
    const poachingCost = Math.round(
      35000 + leader.popularity * 550 + leader.experience * 350,
    );

    // Probability formula:
    // Lower loyalty = higher defection chance
    // Higher player party popularity vs rival party = higher chance
    const popDiff = playerParty.popularity - party.popularity;
    const baseChance = (100 - leader.loyalty) * 0.75;
    const successProbability = Math.max(
      8,
      Math.min(92, Math.round(baseChance + popDiff * 0.4)),
    );

    let grievanceDescription = "Discontented with party central leadership.";
    if (leader.loyalty < 45) {
      grievanceDescription = "Openly rebellious; seeking an alternative political platform.";
    } else if (leader.loyalty < 65) {
      grievanceDescription = "Sidelined in key state decisions; receptive to backchannel offers.";
    } else {
      grievanceDescription = "Relatively loyal; would require an exorbitant incentive to switch.";
    }

    candidates.push({
      leader,
      party,
      poachingCost,
      successProbability,
      grievanceDescription,
    });
  }

  // Sort by highest success probability first
  return candidates.sort((a, b) => b.successProbability - a.successProbability);
}

/**
 * Attempt to poach a rival party leader into the player's party.
 */
export function attemptPoachLeader(
  campaign: CampaignState,
  leaderId: string,
  offeredAmount?: number,
): {
  campaign: CampaignState;
  success: boolean;
  resultMessage: string;
} {
  const playerParty = campaign.politicalWorld.parties.find((p) => p.isPlayerParty);
  if (!playerParty) {
    return { campaign, success: false, resultMessage: "Player party not found." };
  }

  const playerTreasury = campaign.economy.treasuries.find(
    (t) => t.partyId === playerParty.id,
  );

  const prospectList = getPoachableRivalLeaders(campaign);
  const prospect = prospectList.find((p) => p.leader.id === leaderId);

  if (!prospect) {
    return { campaign, success: false, resultMessage: "Target leader not available for poaching." };
  }

  const cost = offeredAmount ?? prospect.poachingCost;
  if (!playerTreasury || playerTreasury.balance < cost) {
    return {
      campaign,
      success: false,
      resultMessage: `Insufficient party funds. Required: ₹${cost.toLocaleString("en-IN")}.`,
    };
  }

  // Roll success
  const roll = (leaderId.length * 37 + Date.now()) % 100;
  const isSuccess = roll < prospect.successProbability;

  // Deduct cost
  const transaction: FinanceTransaction = {
    id: `tx-poach-${Date.now()}`,
    partyId: playerParty.id,
    type: "expense",
    category: "poaching_incentive",
    amount: cost,
    description: `Political inducement package for ${prospect.leader.name} (${prospect.party.abbreviation})`,
    date: campaign.calendar.currentDate,
  };

  const updatedTreasury = {
    ...playerTreasury,
    balance: playerTreasury.balance - cost,
    transactions: [transaction, ...playerTreasury.transactions],
  };

  const updatedTreasuries = campaign.economy.treasuries.map((t) =>
    t.partyId === playerParty.id ? updatedTreasury : t,
  );

  const defectionRecord: DefectionAttempt = {
    id: `def-${Date.now()}`,
    targetId: prospect.leader.id,
    targetName: prospect.leader.name,
    sourcePartyId: prospect.party.id,
    destinationPartyId: playerParty.id,
    cost,
    successProbability: prospect.successProbability,
    status: isSuccess ? "succeeded" : "failed",
    date: campaign.calendar.currentDate,
  };

  const existingDefections = campaign.politicalWorld.defectionHistory ?? [];
  const updatedDefections = [defectionRecord, ...existingDefections];

  if (isSuccess) {
    // Transfer leader to player party with restored loyalty
    const updatedLeaders = campaign.organization.leaders.map((l) => {
      if (l.id === leaderId) {
        return {
          ...l,
          partyId: playerParty.id,
          loyalty: 78, // Fresh loyalty after successful switch
          role: `Party Executive · Defected from ${prospect.party.abbreviation}`,
        };
      }
      return l;
    });

    // Party stat updates: player party gains strength, rival party loses
    const updatedParties = campaign.politicalWorld.parties.map((p) => {
      if (p.id === playerParty.id) {
        return {
          ...p,
          organizationStrength: Math.min(100, p.organizationStrength + 3),
          popularity: Math.min(100, p.popularity + 1),
          funds: updatedTreasury.balance,
        };
      }
      if (p.id === prospect.party.id) {
        return {
          ...p,
          organizationStrength: Math.max(5, p.organizationStrength - 3),
          popularity: Math.max(5, p.popularity - 1),
        };
      }
      return p;
    });

    const event: CampaignEvent = {
      id: `event-defection-${Date.now()}`,
      date: campaign.calendar.currentDate,
      category: "party",
      title: `Political Defection: ${prospect.leader.name} joins ${playerParty.name}!`,
      description: `In a major coup, ${prospect.leader.name} has resigned from ${prospect.party.name} and joined ${playerParty.name}, significantly shifting regional political equations.`,
      importance: "high",
    };

    return {
      campaign: {
        ...campaign,
        politicalWorld: {
          ...campaign.politicalWorld,
          parties: updatedParties,
          defectionHistory: updatedDefections,
        },
        organization: {
          ...campaign.organization,
          leaders: updatedLeaders,
        },
        economy: {
          treasuries: updatedTreasuries,
        },
        history: {
          events: [event, ...campaign.history.events],
        },
      },
      success: true,
      resultMessage: `Defection successful! ${prospect.leader.name} has formally joined ${playerParty.name}.`,
    };
  } else {
    // Failed attempt: backchannel leak
    const event: CampaignEvent = {
      id: `event-leak-${Date.now()}`,
      date: campaign.calendar.currentDate,
      category: "party",
      title: `Overture Rebuffed: ${prospect.leader.name} rejects switch`,
      description: `Backchannel negotiations to recruit ${prospect.leader.name} from ${prospect.party.name} were rebuffed. The rival party leadership has issued a stern denunciation.`,
      importance: "medium",
    };

    return {
      campaign: {
        ...campaign,
        politicalWorld: {
          ...campaign.politicalWorld,
          defectionHistory: updatedDefections,
        },
        economy: {
          treasuries: updatedTreasuries,
        },
        history: {
          events: [event, ...campaign.history.events],
        },
      },
      success: false,
      resultMessage: `Poaching attempt failed: ${prospect.leader.name} rejected the offer and reaffirmed loyalty to ${prospect.party.name}.`,
    };
  }
}

/**
 * Generate or calculate internal party factions.
 */
export function generatePartyFactions(
  campaign: CampaignState,
  partyId: string,
): PartyFaction[] {
  const party = campaign.politicalWorld.parties.find((p) => p.id === partyId);
  if (!party) return [];

  const partyLeaders = campaign.organization.leaders.filter((l) => l.partyId === partyId);
  const factions: PartyFaction[] = [];

  // Identify leaders with distinct influence or grievances
  for (const leader of partyLeaders) {
    if (leader.loyalty < 68 || leader.popularity > 58) {
      const grievance = Math.max(0, 100 - leader.loyalty);
      const influence = Math.min(100, Math.round(leader.popularity * 0.6 + leader.experience * 0.4));
      const memberCount = Math.max(8, Math.round((influence / 100) * 45));

      factions.push({
        id: `faction-${partyId}-${leader.id}`,
        partyId,
        name: `${leader.name.split(" ")[1] ?? leader.name} Faction`,
        leaderId: leader.id,
        leaderName: leader.name,
        memberCount,
        influence,
        loyaltyToHighCommand: leader.loyalty,
        grievanceLevel: grievance,
      });
    }
  }

  return factions;
}

/**
 * Placate an internal party faction with party resources.
 */
export function placatePartyFaction(
  campaign: CampaignState,
  factionId: string,
  partyId: string,
): {
  campaign: CampaignState;
  resultMessage: string;
} {
  const cost = 25000;
  const playerTreasury = campaign.economy.treasuries.find((t) => t.partyId === partyId);
  if (!playerTreasury || playerTreasury.balance < cost) {
    return { campaign, resultMessage: "Insufficient party treasury funds to pacify faction." };
  }

  // Deduct cost
  const tx: FinanceTransaction = {
    id: `tx-placate-${Date.now()}`,
    partyId,
    type: "expense",
    category: "party_discipline",
    amount: cost,
    description: "Faction conciliation and local committee grants",
    date: campaign.calendar.currentDate,
  };

  const updatedTreasury = {
    ...playerTreasury,
    balance: playerTreasury.balance - cost,
    transactions: [tx, ...playerTreasury.transactions],
  };

  // Find leader of faction and raise loyalty
  const updatedLeaders = campaign.organization.leaders.map((l) => {
    if (factionId.includes(l.id)) {
      return {
        ...l,
        loyalty: Math.min(95, l.loyalty + 18),
      };
    }
    return l;
  });

  const event: CampaignEvent = {
    id: `event-placate-${Date.now()}`,
    date: campaign.calendar.currentDate,
    category: "party",
    title: "Internal Reconciliation Reached",
    description: "Party high command concluded reconciliatory talks with internal dissidents, restoring organizational stability.",
    importance: "medium",
  };

  return {
    campaign: {
      ...campaign,
      organization: {
        ...campaign.organization,
        leaders: updatedLeaders,
      },
      economy: {
        treasuries: campaign.economy.treasuries.map((t) =>
          t.partyId === partyId ? updatedTreasury : t,
        ),
      },
      history: {
        events: [event, ...campaign.history.events],
      },
    },
    resultMessage: "Faction successfully appeased! Leader loyalty increased by +18.",
  };
}

/**
 * Simulates a legislative defection under the Tenth Schedule (Anti-Defection Law).
 * Evaluates whether the 2/3rd (66.7%) split threshold is achieved.
 */
export function executeLegislativeDefection(
  campaign: CampaignState,
  stateId: string,
  defectingPartyId: string,
  receivingPartyId: string,
  defectingMlaCount: number,
): {
  campaign: CampaignState;
  isTwoThirdsThresholdMet: boolean;
  governmentCollapsed: boolean;
  resultMessage: string;
} {
  const stateSeats = campaign.politicalWorld.constituencyControl.filter(
    (c) => c.stateId === stateId && c.winningPartyId === defectingPartyId,
  );

  const totalPartySeats = stateSeats.length;
  if (totalPartySeats === 0 || defectingMlaCount <= 0) {
    return {
      campaign,
      isTwoThirdsThresholdMet: false,
      governmentCollapsed: false,
      resultMessage: "No seats available to defect.",
    };
  }

  // 10th Schedule rule: 2/3rd (66.7%) threshold required for legal merger/split
  const twoThirdsMark = Math.ceil(totalPartySeats * (2 / 3));
  const isTwoThirdsThresholdMet = defectingMlaCount >= twoThirdsMark;

  const defectingSeats = stateSeats.slice(0, defectingMlaCount);
  let updatedControl = [...campaign.politicalWorld.constituencyControl];
  let governmentCollapsed = false;

  const currentGov = campaign.politicalWorld.stateGovernments.find(
    (g) => g.stateId === stateId,
  );

  const totalAssemblySeats = INDIA_ASSEMBLY_CONSTITUENCIES.filter(
    (ac) => ac.stateId === stateId,
  ).length;
  const majorityMark = Math.floor(totalAssemblySeats / 2) + 1;

  if (isTwoThirdsThresholdMet) {
    // 2/3rd threshold met: Legal split/merger! Seats transfer to receivingPartyId
    updatedControl = updatedControl.map((c) => {
      if (defectingSeats.some((ds) => ds.constituencyId === c.constituencyId)) {
        return {
          ...c,
          winningPartyId: receivingPartyId,
        };
      }
      return c;
    });

    // Check if ruling party lost majority
    if (currentGov && currentGov.rulingPartyId === defectingPartyId) {
      const remainingRulingSeats = updatedControl.filter(
        (c) => c.stateId === stateId && c.winningPartyId === defectingPartyId,
      ).length;

      if (remainingRulingSeats < majorityMark) {
        governmentCollapsed = true;
      }
    }
  } else {
    // 2/3rd threshold NOT met: Disqualified by Speaker! Seats declared vacant
    updatedControl = updatedControl.map((c) => {
      if (defectingSeats.some((ds) => ds.constituencyId === c.constituencyId)) {
        return {
          ...c,
          winningPartyId: null, // Vacant pending by-election
        };
      }
      return c;
    });

    if (currentGov && currentGov.rulingPartyId === defectingPartyId) {
      const remainingRulingSeats = updatedControl.filter(
        (c) => c.stateId === stateId && c.winningPartyId === defectingPartyId,
      ).length;

      if (remainingRulingSeats < majorityMark) {
        governmentCollapsed = true;
      }
    }
  }

  // Update State Government if collapsed
  let updatedGovs = campaign.politicalWorld.stateGovernments;
  if (governmentCollapsed && currentGov) {
    updatedGovs = updatedGovs.map((g) => {
      if (g.stateId === stateId) {
        return {
          ...g,
          governmentType: "caretaker" as const,
          cabinetStability: 10,
        };
      }
      return g;
    });
  }

  const antiDefEvent: AntiDefectionEvent = {
    id: `ade-${Date.now()}`,
    stateId,
    originalPartyId: defectingPartyId,
    newPartyId: receivingPartyId,
    defectedSeatsCount: defectingMlaCount,
    totalPartySeatsCount: totalPartySeats,
    isTwoThirdsThresholdMet,
    disqualifiedCount: isTwoThirdsThresholdMet ? 0 : defectingMlaCount,
    governmentCollapsed,
    date: campaign.calendar.currentDate,
  };

  const existingEvents = campaign.politicalWorld.antiDefectionEvents ?? [];
  const updatedAntiDefEvents = [antiDefEvent, ...existingEvents];

  const summary = isTwoThirdsThresholdMet
    ? `Legal Split: ${defectingMlaCount}/${totalPartySeats} MLAs crossed the 2/3rd threshold and merged into ${receivingPartyId.toUpperCase()}. ${governmentCollapsed ? "Government fell into minority!" : "Government survived."}`
    : `10th Schedule Invoked: Speaker disqualified all ${defectingMlaCount} defecting MLAs for failing the 2/3rd threshold. Seats declared vacant. ${governmentCollapsed ? "Government plunged into crisis!" : ""}`;

  const event: CampaignEvent = {
    id: `event-10th-${Date.now()}`,
    date: campaign.calendar.currentDate,
    category: "governance",
    title: isTwoThirdsThresholdMet ? "Constitutional Split Upheld" : "Speaker Disqualifies Defectors",
    description: summary,
    importance: "critical",
  };

  return {
    campaign: {
      ...campaign,
      politicalWorld: {
        ...campaign.politicalWorld,
        constituencyControl: updatedControl,
        stateGovernments: updatedGovs,
        antiDefectionEvents: updatedAntiDefEvents,
      },
      history: {
        events: [event, ...campaign.history.events],
      },
    },
    isTwoThirdsThresholdMet,
    governmentCollapsed,
    resultMessage: summary,
  };
}
