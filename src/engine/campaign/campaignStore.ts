import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { CampaignState } from "@/types/campaign";

import { createCampaign } from "./createCampaign";
import { advanceDay } from "./advanceDay";
import { runElectionScheduler } from "./electionScheduler";

interface CampaignStore {
  campaign: CampaignState | null;
  hasUnsavedChanges: boolean;

  startCampaign: (
    campaignName: string,
    foundingStateId: string,
  ) => void;

  loadCampaign: (campaign: CampaignState) => void;

  advanceSimulationDay: () => void;
  advanceSimulationWeek: () => void;

  updateCampaign: (
    updater: (campaign: CampaignState) => CampaignState,
  ) => void;

  markSaved: () => void;
  closeCampaign: () => void;
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set) => ({
      campaign: null,
      hasUnsavedChanges: false,

      startCampaign: (campaignName, foundingStateId) => {
        const campaign = createCampaign({
          campaignName,
          foundingStateId,
        });

        const scheduledCampaign = runElectionScheduler(campaign);

        set({
          campaign: scheduledCampaign,
          hasUnsavedChanges: true,
        });
      },

      loadCampaign: (campaign) =>
        set({
          campaign,
          hasUnsavedChanges: false,
        }),

      advanceSimulationDay: () =>
        set((state) => {
          if (!state.campaign) return state;

          const advancedCampaign = advanceDay(state.campaign, 1);

          // Run the automatic election scheduler after the date advances.
          const scheduledCampaign = runElectionScheduler(
            advancedCampaign,
          );

          return {
            campaign: scheduledCampaign,
            hasUnsavedChanges: true,
          };
        }),

      advanceSimulationWeek: () =>
        set((state) => {
          if (!state.campaign) return state;

          const advancedCampaign = advanceDay(state.campaign, 7);

          const scheduledCampaign = runElectionScheduler(
            advancedCampaign,
          );

          return {
            campaign: scheduledCampaign,
            hasUnsavedChanges: true,
          };
        }),

      updateCampaign: (updater) =>
        set((state) => {
          if (!state.campaign) return state;

          const updatedCampaign = updater(state.campaign);

          const scheduledCampaign = runElectionScheduler(
            updatedCampaign,
          );

          return {
            campaign: scheduledCampaign,
            hasUnsavedChanges: true,
          };
        }),

      markSaved: () =>
        set({
          hasUnsavedChanges: false,
        }),

      closeCampaign: () =>
        set({
          campaign: null,
          hasUnsavedChanges: false,
        }),
    }),
    {
      name: "loktantra-campaign-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        campaign: state.campaign,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
    },
  ),
);
