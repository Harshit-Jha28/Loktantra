import type { CampaignState, FinanceTransaction } from "@/types/campaign";
import { simulateElection } from "@/engine/elections/electionEngine";

export function advanceDay(
  campaign: CampaignState,
  days: number = 1,
): CampaignState {
  if (campaign.calendar.paused) {
    return campaign;
  }

  const currentDate = new Date(`${campaign.calendar.currentDate}T12:00:00Z`);
  currentDate.setUTCDate(currentDate.getUTCDate() + days);

  const formattedDate = currentDate.toISOString().slice(0, 10);
  const newTurn = campaign.calendar.currentTurn + days;

  // Modest recurring grassroots donations/membership fees for player party
  let updatedTreasuries = campaign.economy.treasuries;
  let updatedParties = campaign.politicalWorld.parties;

  if (campaign.player.partyId) {
    const playerPartyId = campaign.player.partyId;
    const treasuryIndex = updatedTreasuries.findIndex((t) => t.partyId === playerPartyId);

    if (treasuryIndex >= 0) {
      const treasury = updatedTreasuries[treasuryIndex];
      const memberCount = campaign.organization.members.filter((m) => m.partyId === playerPartyId).length;
      // Daily contribution: ₹500 base + ₹25 per active member
      const dailyIncome = (500 + memberCount * 25) * days;

      const transaction: FinanceTransaction = {
        id: crypto.randomUUID(),
        partyId: playerPartyId,
        type: "income",
        category: "membership_dues",
        amount: dailyIncome,
        description: `Grassroots contributions and membership dues (${days} day${days > 1 ? "s" : ""})`,
        date: formattedDate,
      };

      const newBalance = treasury.balance + dailyIncome;
      updatedTreasuries = [...updatedTreasuries];
      updatedTreasuries[treasuryIndex] = {
        ...treasury,
        balance: newBalance,
        transactions: [...treasury.transactions, transaction],
      };

      updatedParties = updatedParties.map((p) => {
        if (p.id === playerPartyId) {
          return {
            ...p,
            funds: newBalance,
          };
        }
        return p;
      });
    }
  }

  let intermediateCampaign: CampaignState = {
    ...campaign,
    metadata: {
      ...campaign.metadata,
      updatedAt: new Date().toISOString(),
    },
    calendar: {
      ...campaign.calendar,
      currentDate: formattedDate,
      currentTurn: newTurn,
    },
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
      events: [
        ...campaign.history.events,
        {
          id: crypto.randomUUID(),
          date: formattedDate,
          category: "simulation",
          title: days > 1 ? "A new week begins" : "A new day begins",
          description: `The political calendar advances to ${formattedDate} (Turn ${newTurn}).`,
          importance: "low",
        },
      ],
    },
  };

  // Check if any active elections have reached their polling date
  for (const election of intermediateCampaign.elections) {
    if (election.status !== "completed") {
      const isPastOrToday = formattedDate >= election.date;
      if (isPastOrToday) {
        // Run polling simulation and government formation
        intermediateCampaign = simulateElection(intermediateCampaign, election.id);
      }
    }
  }

  return intermediateCampaign;
}
