import type { CampaignState } from "@/types/campaign";

export function validateCampaign(
  value: unknown,
): value is CampaignState {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return false;
  }

  const campaign = value as Record<string, unknown>;

  if (
    (campaign.schemaVersion !== 1 && campaign.schemaVersion !== 2) ||
    typeof campaign.metadata !== "object" ||
    campaign.metadata === null ||
    typeof campaign.calendar !== "object" ||
    campaign.calendar === null ||
    typeof campaign.player !== "object" ||
    campaign.player === null ||
    typeof campaign.politicalWorld !== "object" ||
    campaign.politicalWorld === null
  ) {
    return false;
  }

  const metadata = campaign.metadata as Record<string, unknown>;
  const calendar = campaign.calendar as Record<string, unknown>;
  const player = campaign.player as Record<string, unknown>;
  const world = campaign.politicalWorld as Record<string, unknown>;

  if (
    typeof metadata.id !== "string" ||
    typeof metadata.campaignName !== "string" ||
    typeof calendar.currentDate !== "string" ||
    typeof player.foundingStateId !== "string"
  ) {
    return false;
  }

  const arrays = [
    world.parties,
    world.alliances,
    world.stateGovernments,
    world.constituencyControl,
    world.relationships,
    campaign.elections,
  ];

  return arrays.every(Array.isArray);
}
