import type { ConstituencyControl } from "@/types/campaign";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";
import { INDIA_REGIONS, INDIA_PARTIES } from "@/data/india2026";

/**
 * Deterministically generates starting constituency-level control for all
 * 4,123 Assembly seats and 543 Lok Sabha seats in the political world.
 *
 * This provides the baseline political distribution for Jan 1, 2027.
 * Every seat total adds up exactly to official delimitation seat counts.
 */
export function seedConstituencyControl(): ConstituencyControl[] {
  const controls: ConstituencyControl[] = [];

  // Map alliance to member parties
  const allianceMembersMap = new Map<string, string[]>();
  for (const party of INDIA_PARTIES) {
    if (party.allianceId) {
      const list = allianceMembersMap.get(party.allianceId) ?? [];
      list.push(party.id);
      allianceMembersMap.set(party.allianceId, list);
    }
  }

  // 1. SEED ASSEMBLY CONSTITUENCIES
  for (const region of INDIA_REGIONS) {
    if (!region.assemblySeats || region.assemblySeats === 0) {
      continue;
    }

    const stateId = region.id;
    const stateAcs = INDIA_ASSEMBLY_CONSTITUENCIES.filter(
      (ac) => ac.stateId === stateId,
    );

    const totalSeats = stateAcs.length;
    const majorityMark = Math.floor(totalSeats / 2) + 1;

    const rulingPartyId = region.rulingPartyId ?? "ndf";
    const allianceId = region.allianceId;
    const alliancePartners = (allianceId ? (allianceMembersMap.get(allianceId) ?? []) : []).filter(
      (id) => id !== rulingPartyId,
    );

    // Pick an opposition party appropriate for the state
    let oppositionPartyId = "ppc";
    if (rulingPartyId === "ppc") {
      oppositionPartyId = "ndf";
    } else if (stateId === "tamil-nadu" && rulingPartyId === "tvk") {
      oppositionPartyId = "ndf";
    } else if (stateId === "punjab" && rulingPartyId === "pfp") {
      oppositionPartyId = "ppc";
    } else if (stateId === "mizoram" && rulingPartyId === "zpm") {
      oppositionPartyId = "ppc";
    } else if (stateId === "sikkim" && rulingPartyId === "skm") {
      oppositionPartyId = "ndf";
    }

    // Determine seat allocations
    const partySeatAllocations: { partyId: string; count: number }[] = [];

    if (region.governmentType === "majority") {
      // Ruling party has outright majority (e.g. ~56% to 62% of seats, at least majorityMark)
      const rulingCount = Math.min(
        totalSeats,
        Math.max(majorityMark, Math.round(totalSeats * 0.58)),
      );
      const oppositionCount = totalSeats - rulingCount;

      partySeatAllocations.push({ partyId: rulingPartyId, count: rulingCount });
      if (oppositionCount > 0) {
        partySeatAllocations.push({ partyId: oppositionPartyId, count: oppositionCount });
      }
    } else if (region.governmentType === "coalition") {
      // Lead party has plurality, coalition partners push it over majority
      const rulingLeadCount = Math.max(
        1,
        Math.min(majorityMark - 1, Math.round(totalSeats * 0.40)),
      );
      const neededForMajority = majorityMark - rulingLeadCount;
      const partnerBonus = Math.max(2, Math.round(totalSeats * 0.06));
      const totalPartnerSeats = Math.min(
        totalSeats - rulingLeadCount,
        neededForMajority + partnerBonus,
      );

      partySeatAllocations.push({ partyId: rulingPartyId, count: rulingLeadCount });

      if (alliancePartners.length > 0 && totalPartnerSeats > 0) {
        const perPartner = Math.floor(totalPartnerSeats / alliancePartners.length);
        let remPartner = totalPartnerSeats % alliancePartners.length;

        for (const partnerId of alliancePartners) {
          const count = perPartner + (remPartner > 0 ? 1 : 0);
          if (remPartner > 0) remPartner--;
          if (count > 0) {
            partySeatAllocations.push({ partyId: partnerId, count });
          }
        }
      } else {
        // Fallback partner if none defined
        const fallbackPartner = rulingPartyId === "ndf" ? "ainrc" : "jknc";
        partySeatAllocations.push({ partyId: fallbackPartner, count: totalPartnerSeats });
      }

      const assignedGovSeats = partySeatAllocations.reduce((s, p) => s + p.count, 0);
      const remainingOppSeats = totalSeats - assignedGovSeats;

      if (remainingOppSeats > 0) {
        partySeatAllocations.push({ partyId: oppositionPartyId, count: remainingOppSeats });
      }
    } else {
      // minority or unconfigured
      const leadCount = Math.max(1, Math.round(totalSeats * 0.42));
      const oppCount = totalSeats - leadCount;
      partySeatAllocations.push({ partyId: rulingPartyId, count: leadCount });
      if (oppCount > 0) {
        partySeatAllocations.push({ partyId: oppositionPartyId, count: oppCount });
      }
    }

    // Verify sum equals totalSeats
    let sumAssigned = partySeatAllocations.reduce((s, a) => s + a.count, 0);
    if (sumAssigned !== totalSeats) {
      // Adjust to ruling or opposition
      const diff = totalSeats - sumAssigned;
      if (partySeatAllocations.length > 0) {
        partySeatAllocations[0].count += diff;
      }
    }

    // Assign party per constituency
    let acIndex = 0;
    for (const alloc of partySeatAllocations) {
      for (let i = 0; i < alloc.count && acIndex < stateAcs.length; i++) {
        const ac = stateAcs[acIndex];
        controls.push({
          constituencyId: ac.id,
          constituencyType: "vidhan_sabha",
          stateId,
          winningPartyId: alloc.partyId,
          candidateId: null,
          lastElectionId: `init-vidhan-sabha-${stateId}`,
        });
        acIndex++;
      }
    }
  }

  // 2. SEED LOK SABHA CONSTITUENCIES
  for (const pc of INDIA_LOK_SABHA_CONSTITUENCIES) {
    const region = INDIA_REGIONS.find((r) => r.id === pc.stateId);
    let winningPartyId = "ndf";

    if (region) {
      // If state is governed by a prominent regional or progressive party, reflect proportional share
      if (region.rulingPartyId === "tvk") {
        winningPartyId = pc.constituencyNumber % 3 === 0 ? "ndf" : "tvk";
      } else if (region.rulingPartyId === "ppc") {
        winningPartyId = pc.constituencyNumber % 2 === 0 ? "ndf" : "ppc";
      } else if (region.rulingPartyId === "pfp") {
        winningPartyId = pc.constituencyNumber % 2 === 0 ? "ppc" : "pfp";
      } else if (region.rulingPartyId === "rjm") {
        winningPartyId = pc.constituencyNumber % 2 === 0 ? "ndf" : "rjm";
      } else if (region.rulingPartyId === "jknc") {
        winningPartyId = pc.constituencyNumber % 2 === 0 ? "ndf" : "jknc";
      } else if (region.rulingPartyId === "zpm") {
        winningPartyId = "zpm";
      } else if (region.rulingPartyId === "skm") {
        winningPartyId = "skm";
      } else {
        // NDF led states: mostly NDF with some PPC opposition
        winningPartyId = pc.constituencyNumber % 4 === 0 ? "ppc" : "ndf";
      }
    }

    controls.push({
      constituencyId: pc.id,
      constituencyType: "lok_sabha",
      stateId: pc.stateId,
      winningPartyId,
      candidateId: null,
      lastElectionId: "init-lok-sabha-2024",
    });
  }

  return controls;
}
