"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Handshake,
  Shield,
  Layers,
  Scale,
  Award,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  FileCheck,
  Building,
  Coins,
  Users,
} from "lucide-react";
import type {
  CampaignState,
  CoalitionAgreement,
  PostPollBargain,
  PoliticalParty,
} from "@/types/campaign";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";
import {
  calculateIdeologicalFriction,
  calculateSeatSharingLeverage,
  proposeSeatSharingAgreement,
} from "@/engine/coalitions/coalitionEngine";
import { useCampaignStore } from "@/engine/campaign/campaignStore";

interface CoalitionNegotiationModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  onSuccess?: (message: string) => void;
}

export default function CoalitionNegotiationModal({
  isOpen,
  onClose,
  electionId,
  onSuccess,
}: CoalitionNegotiationModalProps) {
  const campaign = useCampaignStore((state) => state.campaign);
  const updateCampaign = useCampaignStore((state) => state.updateCampaign);

  const [activeTab, setActiveTab] = useState<"pre_poll" | "post_poll">("pre_poll");
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [customQuotaLead, setCustomQuotaLead] = useState<number | null>(null);
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([
    "healthcare",
    "infrastructure",
  ]);
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const election = useMemo(() => {
    if (!campaign) return null;
    return campaign.elections.find((e) => e.id === electionId);
  }, [campaign, electionId]);

  const playerParty = useMemo(() => {
    if (!campaign) return null;
    return campaign.politicalWorld.parties.find((p) => p.isPlayerParty);
  }, [campaign]);

  // Available partner parties (all active parties except player party)
  const potentialPartners = useMemo(() => {
    if (!campaign || !playerParty) return [];
    return campaign.politicalWorld.parties.filter(
      (p) => p.isActive && p.id !== playerParty.id,
    );
  }, [campaign, playerParty]);

  const partnerParty = useMemo(() => {
    if (!campaign || !selectedPartnerId) return potentialPartners[0] ?? null;
    return (
      potentialPartners.find((p) => p.id === selectedPartnerId) ??
      potentialPartners[0] ??
      null
    );
  }, [campaign, selectedPartnerId, potentialPartners]);

  // Constituencies under this election
  const totalSeats = useMemo(() => {
    if (!election) return 0;
    if (election.type === "vidhan_sabha" && election.stateId) {
      return INDIA_ASSEMBLY_CONSTITUENCIES.filter(
        (ac) => ac.stateId === election.stateId,
      ).length;
    }
    return INDIA_LOK_SABHA_CONSTITUENCIES.length;
  }, [election]);

  // Leverage calculations
  const playerLeverage = useMemo(() => {
    if (!campaign || !playerParty || !election) return 50;
    return calculateSeatSharingLeverage(playerParty, election.stateId, campaign);
  }, [campaign, playerParty, election]);

  const partnerLeverage = useMemo(() => {
    if (!campaign || !partnerParty || !election) return 50;
    return calculateSeatSharingLeverage(partnerParty, election.stateId, campaign);
  }, [campaign, partnerParty, election]);

  const ideologicalFriction = useMemo(() => {
    if (!playerParty || !partnerParty) return 0;
    return calculateIdeologicalFriction(playerParty.ideology, partnerParty.ideology);
  }, [playerParty, partnerParty]);

  // Proportional seat quotas
  const recommendedPlayerSeats = useMemo(() => {
    const totalLev = playerLeverage + partnerLeverage;
    if (totalLev === 0) return Math.round(totalSeats / 2);
    return Math.round(totalSeats * (playerLeverage / totalLev));
  }, [totalSeats, playerLeverage, partnerLeverage]);

  const recommendedPartnerSeats = totalSeats - recommendedPlayerSeats;

  // Active pre-poll agreements for this election
  const existingAgreements = useMemo(() => {
    if (!campaign) return [];
    return (campaign.politicalWorld.coalitionAgreements ?? []).filter(
      (a) => a.electionId === electionId,
    );
  }, [campaign, electionId]);

  // Post-poll bargain if election completed or simulated
  const postPollBargain = useMemo(() => {
    if (!campaign) return null;
    return (
      (campaign.politicalWorld.postPollBargains ?? []).find(
        (b) => b.electionId === electionId,
      ) ?? null
    );
  }, [campaign, electionId]);

  // Policy options for Common Minimum Programme
  const cmpPolicyOptions = [
    { id: "healthcare", name: "Free Universal Rural Healthcare", cost: "High" },
    { id: "agriculture", name: "Assured Farm MSP & Irrigation Network", cost: "High" },
    { id: "education", name: "Smart Model Schools & Digital Labs", cost: "Medium" },
    { id: "employment", name: "Youth Apprenticeship & Industry Subsidy", cost: "Medium" },
    { id: "infrastructure", name: "State Highway & Feeder Road Corridors", cost: "High" },
  ];

  const togglePolicy = (policyId: string) => {
    if (selectedPolicies.includes(policyId)) {
      if (selectedPolicies.length > 1) {
        setSelectedPolicies(selectedPolicies.filter((id) => id !== policyId));
      }
    } else {
      setSelectedPolicies([...selectedPolicies, policyId]);
    }
  };

  const handleRatifyAgreement = () => {
    if (!campaign || !playerParty || !partnerParty) return;

    try {
      const quotas: Record<string, number> = {
        [playerParty.id]: customQuotaLead ?? recommendedPlayerSeats,
        [partnerParty.id]: totalSeats - (customQuotaLead ?? recommendedPlayerSeats),
      };

      updateCampaign((current) => {
        const result = proposeSeatSharingAgreement(
          current,
          electionId,
          playerParty.allianceId ?? "ALLIANCE-CUSTOM",
          playerParty.id,
          partnerParty.id,
          quotas,
          selectedPolicies,
        );

        setStatusNotice({
          type: "success",
          message: result.resultMessage,
        });

        onSuccess?.(result.resultMessage);
        return result.campaign;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to ratify agreement";
      setStatusNotice({ type: "error", message: msg });
    }
  };

  if (!isOpen || !election) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(20, 16, 12, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1080,
          height: "85vh",
          maxHeight: 820,
          backgroundColor: "#FAF7EE",
          border: "2px solid #5C1D11",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {/* Modal Top Bar */}
        <div
          style={{
            padding: "14px 20px",
            backgroundColor: "#7D2E1E",
            color: "#FFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "2px solid #5C1D11",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 4,
                backgroundColor: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#E5B94F",
              }}
            >
              <Handshake size={22} />
            </div>
            <div>
              <span
                style={{
                  fontSize: 10,
                  letterSpacing: 1.2,
                  fontWeight: 900,
                  color: "#E5B94F",
                }}
              >
                CENTRAL COALITION SECRETARIAT · ALLIANCE &amp; SEAT-SHARING
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontFamily: "Georgia, serif",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                Coalition Negotiations: {election.name}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#FFF",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid #D8CCAC",
            backgroundColor: "#F4EFE0",
            padding: "0 16px",
          }}
        >
          <button
            onClick={() => setActiveTab("pre_poll")}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 800,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "pre_poll" ? "3px solid #7D2E1E" : "3px solid transparent",
              color: activeTab === "pre_poll" ? "#7D2E1E" : "#776550",
              cursor: "pointer",
            }}
          >
            Pre-Poll Seat-Sharing &amp; CMP
          </button>
          <button
            onClick={() => setActiveTab("post_poll")}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 800,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "post_poll" ? "3px solid #7D2E1E" : "3px solid transparent",
              color: activeTab === "post_poll" ? "#7D2E1E" : "#776550",
              cursor: "pointer",
            }}
          >
            Post-Poll Cabinet Bargaining
          </button>
        </div>

        {/* Notice Banner */}
        {statusNotice && (
          <div
            style={{
              padding: "10px 18px",
              backgroundColor: statusNotice.type === "success" ? "#EAF5EA" : "#FDEAEA",
              borderBottom: `1px solid ${statusNotice.type === "success" ? "#557C55" : "#D96B42"}`,
              color: statusNotice.type === "success" ? "#2B5E2B" : "#B33927",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {statusNotice.type === "success" ? (
                <CheckCircle2 size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              <span>{statusNotice.message}</span>
            </div>
            <button
              onClick={() => setStatusNotice(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "inherit",
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
          {activeTab === "pre_poll" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Partner Party Selector */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#FFF",
                  border: "1px solid #D8CCAC",
                  borderRadius: 4,
                }}
              >
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 800,
                    color: "#5C1D11",
                    marginBottom: 8,
                  }}
                >
                  SELECT COALITION ALLY TO NEGOTIATE WITH:
                </label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {potentialPartners.map((p) => {
                    const isSelected = (partnerParty?.id ?? "") === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedPartnerId(p.id);
                          setCustomQuotaLead(null);
                        }}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 4,
                          border: `1px solid ${isSelected ? "#7D2E1E" : "#D8CCAC"}`,
                          backgroundColor: isSelected ? "#FAF7EE" : "#FFF",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            backgroundColor: p.branding.primaryColor,
                          }}
                        />
                        <strong style={{ fontSize: 13, color: "#2C2416" }}>
                          {p.name} ({p.abbreviation})
                        </strong>
                        <span
                          style={{
                            fontSize: 11,
                            color: "#776550",
                            backgroundColor: "#EDE6D6",
                            padding: "2px 6px",
                            borderRadius: 2,
                          }}
                        >
                          {p.ideology}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {partnerParty && playerParty && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {/* Leverage & Friction Analysis */}
                  <div
                    style={{
                      padding: 16,
                      backgroundColor: "#FFF",
                      border: "1px solid #D8CCAC",
                      borderRadius: 4,
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#2C2416",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Scale size={16} color="#7D2E1E" />
                      Bargaining Leverage &amp; Friction
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span>{playerParty.name} Leverage:</span>
                          <strong>{playerLeverage} pts</strong>
                        </div>
                        <div
                          style={{
                            height: 6,
                            backgroundColor: "#E2D9BE",
                            borderRadius: 3,
                            marginTop: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, playerLeverage)}%`,
                              backgroundColor: playerParty.branding.primaryColor,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span>{partnerParty.name} Leverage:</span>
                          <strong>{partnerLeverage} pts</strong>
                        </div>
                        <div
                          style={{
                            height: 6,
                            backgroundColor: "#E2D9BE",
                            borderRadius: 3,
                            marginTop: 4,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${Math.min(100, partnerLeverage)}%`,
                              backgroundColor: partnerParty.branding.primaryColor,
                            }}
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          padding: 10,
                          backgroundColor: "#FAF7EE",
                          border: "1px solid #E2D9BE",
                          borderRadius: 3,
                          marginTop: 6,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                          <span>Ideological Friction:</span>
                          <strong
                            style={{
                              color:
                                ideologicalFriction > 40
                                  ? "#B33927"
                                  : ideologicalFriction > 20
                                  ? "#855800"
                                  : "#2B5E2B",
                            }}
                          >
                            {ideologicalFriction}% ({ideologicalFriction > 40 ? "HIGH FRICTION" : ideologicalFriction > 20 ? "MODERATE" : "LOW FRICTION"})
                          </strong>
                        </div>
                        <div style={{ fontSize: 11, color: "#6B5844", marginTop: 4 }}>
                          {playerParty.ideology} vs {partnerParty.ideology}. Lower friction increases joint campaign synergy.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seat Quotas & Common Minimum Programme */}
                  <div
                    style={{
                      padding: 16,
                      backgroundColor: "#FFF",
                      border: "1px solid #D8CCAC",
                      borderRadius: 4,
                    }}
                  >
                    <h4
                      style={{
                        margin: "0 0 12px 0",
                        fontSize: 14,
                        fontWeight: 800,
                        color: "#2C2416",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Layers size={16} color="#7D2E1E" />
                      Seat-Sharing Distribution ({totalSeats} Total Seats)
                    </h4>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div
                        style={{
                          padding: 12,
                          backgroundColor: "#FAF7EE",
                          border: "1px solid #D8CCAC",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-around",
                          textAlign: "center",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 11, color: "#776550", fontWeight: 700 }}>
                            {playerParty.abbreviation} CONTESTS
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: "#2C2416" }}>
                            {customQuotaLead ?? recommendedPlayerSeats}
                          </div>
                          <div style={{ fontSize: 10, color: "#8C7D6B" }}>
                            {Math.round(((customQuotaLead ?? recommendedPlayerSeats) / totalSeats) * 100)}% of seats
                          </div>
                        </div>

                        <div style={{ width: 1, backgroundColor: "#D8CCAC" }} />

                        <div>
                          <div style={{ fontSize: 11, color: "#776550", fontWeight: 700 }}>
                            {partnerParty.abbreviation} CONTESTS
                          </div>
                          <div style={{ fontSize: 24, fontWeight: 900, color: "#2C2416" }}>
                            {totalSeats - (customQuotaLead ?? recommendedPlayerSeats)}
                          </div>
                          <div style={{ fontSize: 10, color: "#8C7D6B" }}>
                            {Math.round(((totalSeats - (customQuotaLead ?? recommendedPlayerSeats)) / totalSeats) * 100)}% of seats
                          </div>
                        </div>
                      </div>

                      {/* Common Minimum Programme Policies */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 800, color: "#5C1D11", marginBottom: 6 }}>
                          COMMON MINIMUM PROGRAMME (CMP) PRIORITIES:
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {cmpPolicyOptions.map((pol) => {
                            const isSelected = selectedPolicies.includes(pol.id);
                            return (
                              <div
                                key={pol.id}
                                onClick={() => togglePolicy(pol.id)}
                                style={{
                                  padding: "6px 10px",
                                  backgroundColor: isSelected ? "#EAF5EA" : "#FFF",
                                  border: `1px solid ${isSelected ? "#557C55" : "#E2D9BE"}`,
                                  borderRadius: 3,
                                  cursor: "pointer",
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  fontSize: 12,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    readOnly
                                    style={{ cursor: "pointer" }}
                                  />
                                  <span style={{ fontWeight: isSelected ? 700 : 500 }}>
                                    {pol.name}
                                  </span>
                                </div>
                                <span style={{ fontSize: 10, color: "#8C7D6B" }}>
                                  Cost: {pol.cost}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Ratify Pact Button */}
                      <button
                        onClick={handleRatifyAgreement}
                        style={{
                          marginTop: 6,
                          padding: "10px 16px",
                          backgroundColor: "#2B5E2B",
                          color: "#FFF",
                          border: "1px solid #1C421C",
                          borderRadius: 4,
                          fontWeight: 800,
                          fontSize: 13,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                        }}
                      >
                        <FileCheck size={16} />
                        Ratify Pre-Poll Seat-Sharing Pact
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Pacts in this Election */}
              {existingAgreements.length > 0 && (
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#FFF",
                    border: "1px solid #D8CCAC",
                    borderRadius: 4,
                  }}
                >
                  <h4
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: 14,
                      fontWeight: 800,
                      color: "#2C2416",
                    }}
                  >
                    Active Pre-Poll Pacts for this Election:
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {existingAgreements.map((agr) => (
                      <div
                        key={agr.id}
                        style={{
                          padding: "10px 14px",
                          backgroundColor: "#FAF7EE",
                          border: "1px solid #D8CCAC",
                          borderRadius: 3,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: 12,
                        }}
                      >
                        <div>
                          <strong>
                            {agr.partnerPartyIds.map((p) => p.toUpperCase()).join(" + ")} Alliance
                          </strong>
                          <span style={{ marginLeft: 8, color: "#6B5844" }}>
                            Seat Quotas:{" "}
                            {Object.entries(agr.seatQuotas)
                              .map(([pId, q]) => `${pId.toUpperCase()}: ${q}`)
                              .join(" · ")}
                          </span>
                        </div>
                        <span
                          style={{
                            padding: "2px 8px",
                            backgroundColor: "#2B5E2B",
                            color: "#FFF",
                            borderRadius: 2,
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          RATIFIED
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "post_poll" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {postPollBargain ? (
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#FFF",
                    border: "1px solid #D8CCAC",
                    borderRadius: 4,
                  }}
                >
                  <h3
                    style={{
                      margin: "0 0 10px 0",
                      fontSize: 18,
                      fontFamily: "Georgia, serif",
                      color: "#2C2416",
                    }}
                  >
                    Post-Poll Government Formation Bargain
                  </h3>

                  <div
                    style={{
                      padding: 12,
                      backgroundColor: "#FAF7EE",
                      border: "1px solid #E2D9BE",
                      borderRadius: 4,
                      marginBottom: 16,
                      fontSize: 13,
                      lineHeight: 1.5,
                      color: "#2C2416",
                    }}
                  >
                    <strong>Coalition Agreement Verdict:</strong>
                    <div style={{ marginTop: 4 }}>
                      Lead Party: <strong>{postPollBargain.leadPartyId.toUpperCase()}</strong> | Coalition Partners:{" "}
                      <strong>
                        {postPollBargain.claimantPartyIds
                          .map((p) => p.toUpperCase())
                          .join(", ")}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* Ministerial Portfolios Table */}
                    <div
                      style={{
                        padding: 14,
                        backgroundColor: "#FAF7EE",
                        border: "1px solid #D8CCAC",
                        borderRadius: 4,
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#2C2416",
                        }}
                      >
                        Ministerial Cabinet Berths Allocation:
                      </h4>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {Object.entries(postPollBargain.cabinetPortfolios).map(
                          ([partyId, berths]) => (
                            <div
                              key={partyId}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                padding: "6px 10px",
                                backgroundColor: "#FFF",
                                border: "1px solid #E2D9BE",
                                borderRadius: 3,
                                fontSize: 12,
                              }}
                            >
                              <strong>{partyId.toUpperCase()}</strong>
                              <span>{berths} Cabinet Ministers</span>
                            </div>
                          ),
                        )}
                      </div>

                      {postPollBargain.hasDeputyChiefMinister && (
                        <div
                          style={{
                            marginTop: 10,
                            padding: "6px 10px",
                            backgroundColor: "#FFF8E7",
                            border: "1px solid #D4A340",
                            borderRadius: 3,
                            fontSize: 11,
                            fontWeight: 700,
                            color: "#855800",
                          }}
                        >
                          Deputy Chief Minister Conceded to:{" "}
                          {postPollBargain.deputyCmPartyId?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Stability Projection */}
                    <div
                      style={{
                        padding: 14,
                        backgroundColor: "#FAF7EE",
                        border: "1px solid #D8CCAC",
                        borderRadius: 4,
                      }}
                    >
                      <h4
                        style={{
                          margin: "0 0 10px 0",
                          fontSize: 13,
                          fontWeight: 800,
                          color: "#2C2416",
                        }}
                      >
                        Projected Government Stability:
                      </h4>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 32, fontWeight: 900, color: "#2C2416" }}>
                          {postPollBargain.stabilityScore}/100
                        </span>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color:
                              postPollBargain.stabilityScore > 70
                                ? "#2B5E2B"
                                : postPollBargain.stabilityScore > 45
                                ? "#855800"
                                : "#B33927",
                          }}
                        >
                          {postPollBargain.stabilityScore > 70
                            ? "ROBUST MAJORITY"
                            : postPollBargain.stabilityScore > 45
                            ? "MODERATELY STABLE"
                            : "VULNERABLE TO COLLAPSE"}
                        </span>
                      </div>

                      <div style={{ fontSize: 11, color: "#6B5844", lineHeight: 1.4 }}>
                        Calculated from coalition seat buffer above majority mark, partner ideological alignment, and cabinet satisfaction. Low stability can trigger floor tests or partner withdrawals.
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    padding: 30,
                    textAlign: "center",
                    backgroundColor: "#FFF",
                    border: "1px dashed #D8CCAC",
                    borderRadius: 4,
                    color: "#776550",
                  }}
                >
                  <Handshake size={32} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    No Post-Poll Bargaining Recorded Yet
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>
                    Post-poll bargaining takes place automatically once voting and results are simulated for this election.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
