"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  UserCheck,
  UserX,
  ShieldAlert,
  Flame,
  Award,
  AlertTriangle,
  CheckCircle2,
  Coins,
  Scale,
  Users,
  Compass,
  Zap,
  Building,
} from "lucide-react";
import type { CampaignState, PoliticalLeader, PartyFaction } from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import {
  getPoachableRivalLeaders,
  attemptPoachLeader,
  generatePartyFactions,
  placatePartyFaction,
  executeLegislativeDefection,
} from "@/engine/party/defectionEngine";
import { useCampaignStore } from "@/engine/campaign/campaignStore";

interface PartyDisciplineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function PartyDisciplineModal({
  isOpen,
  onClose,
  onSuccess,
}: PartyDisciplineModalProps) {
  const campaign = useCampaignStore((state) => state.campaign);
  const updateCampaign = useCampaignStore((state) => state.updateCampaign);

  const [activeTab, setActiveTab] = useState<"poach" | "internal_factions" | "tenth_schedule">("poach");
  const [selectedStateId, setSelectedStateId] = useState<string>("punjab");
  const [defectingPartyId, setDefectingPartyId] = useState<string>("ndf");
  const [defectingCount, setDefectingCount] = useState<number>(4);
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  const playerParty = useMemo(() => {
    if (!campaign) return null;
    return campaign.politicalWorld.parties.find((p) => p.isPlayerParty);
  }, [campaign]);

  const playerTreasury = useMemo(() => {
    if (!campaign || !playerParty) return null;
    return campaign.economy.treasuries.find((t) => t.partyId === playerParty.id);
  }, [campaign, playerParty]);

  // Poachable leaders
  const prospects = useMemo(() => {
    if (!campaign) return [];
    return getPoachableRivalLeaders(campaign);
  }, [campaign]);

  // Player party internal factions
  const factions = useMemo(() => {
    if (!campaign || !playerParty) return [];
    return generatePartyFactions(campaign, playerParty.id);
  }, [campaign, playerParty]);

  // Action: Poach leader
  const handlePoachLeader = (leaderId: string) => {
    if (!campaign) return;

    updateCampaign((current) => {
      const result = attemptPoachLeader(current, leaderId);
      if (result.success) {
        setStatusNotice({
          type: "success",
          message: result.resultMessage,
        });
        onSuccess?.(result.resultMessage);
      } else {
        setStatusNotice({
          type: "error",
          message: result.resultMessage,
        });
      }
      return result.campaign;
    });
  };

  // Action: Placate faction
  const handlePlacateFaction = (factionId: string) => {
    if (!campaign || !playerParty) return;

    updateCampaign((current) => {
      const result = placatePartyFaction(current, factionId, playerParty.id);
      setStatusNotice({
        type: "success",
        message: result.resultMessage,
      });
      onSuccess?.(result.resultMessage);
      return result.campaign;
    });
  };

  // Action: Trigger 10th Schedule legislative defection
  const handleLegislativeDefection = () => {
    if (!campaign || !playerParty) return;

    updateCampaign((current) => {
      const result = executeLegislativeDefection(
        current,
        selectedStateId,
        defectingPartyId,
        playerParty.id,
        defectingCount,
      );

      setStatusNotice({
        type: result.isTwoThirdsThresholdMet ? "success" : "warning",
        message: result.resultMessage,
      });
      onSuccess?.(result.resultMessage);
      return result.campaign;
    });
  };

  if (!isOpen) return null;

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
          maxWidth: 1100,
          height: "85vh",
          maxHeight: 840,
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
              <ShieldAlert size={22} />
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
                CENTRAL PARTY DISCIPLINE &amp; DEFECTION DESK
              </span>
              <h2
                style={{
                  margin: 0,
                  fontSize: 18,
                  fontFamily: "Georgia, serif",
                }}
              >
                Party Discipline, Poaching &amp; Anti-Defection
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {playerTreasury && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  background: "rgba(255,255,255,0.12)",
                  borderRadius: 4,
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                <Coins size={14} color="#E5B94F" />
                <span>₹{playerTreasury.balance.toLocaleString("en-IN")}</span>
              </div>
            )}
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
            onClick={() => setActiveTab("poach")}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 800,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "poach" ? "3px solid #7D2E1E" : "3px solid transparent",
              color: activeTab === "poach" ? "#7D2E1E" : "#776550",
              cursor: "pointer",
            }}
          >
            Poach Rival Leaders ({prospects.length})
          </button>
          <button
            onClick={() => setActiveTab("internal_factions")}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 800,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "internal_factions" ? "3px solid #7D2E1E" : "3px solid transparent",
              color: activeTab === "internal_factions" ? "#7D2E1E" : "#776550",
              cursor: "pointer",
            }}
          >
            Internal Factions &amp; Loyalty ({factions.length})
          </button>
          <button
            onClick={() => setActiveTab("tenth_schedule")}
            style={{
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 800,
              background: "transparent",
              border: "none",
              borderBottom: activeTab === "tenth_schedule" ? "3px solid #7D2E1E" : "3px solid transparent",
              color: activeTab === "tenth_schedule" ? "#7D2E1E" : "#776550",
              cursor: "pointer",
            }}
          >
            10th Schedule Legislative Defection
          </button>
        </div>

        {/* Notification Banner */}
        {statusNotice && (
          <div
            style={{
              padding: "10px 18px",
              backgroundColor:
                statusNotice.type === "success"
                  ? "#EAF5EA"
                  : statusNotice.type === "warning"
                  ? "#FFF8E7"
                  : "#FDEAEA",
              borderBottom: `1px solid ${
                statusNotice.type === "success"
                  ? "#557C55"
                  : statusNotice.type === "warning"
                  ? "#D4A340"
                  : "#D96B42"
              }`,
              color:
                statusNotice.type === "success"
                  ? "#2B5E2B"
                  : statusNotice.type === "warning"
                  ? "#855800"
                  : "#B33927",
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
                <AlertTriangle size={16} />
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
          {activeTab === "poach" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  padding: 12,
                  backgroundColor: "#FFF8E7",
                  border: "1px solid #D4A340",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#855800",
                }}
              >
                Target influential rival leaders experiencing low party loyalty. A successful defection strengthens your party, weakens the rival, and expands your candidate pool.
              </div>

              {prospects.length === 0 ? (
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
                  No rival leaders currently open to defection.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {prospects.map((p) => {
                    const canAfford = (playerTreasury?.balance ?? 0) >= p.poachingCost;
                    return (
                      <div
                        key={p.leader.id}
                        style={{
                          padding: 16,
                          backgroundColor: "#FFF",
                          border: "1px solid #D8CCAC",
                          borderRadius: 4,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <div style={{ flex: 1, marginRight: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span
                              style={{
                                fontSize: 16,
                                fontWeight: 800,
                                fontFamily: "Georgia, serif",
                                color: "#2C2416",
                              }}
                            >
                              {p.leader.name}
                            </span>
                            <span
                              style={{
                                padding: "2px 8px",
                                backgroundColor: p.party.branding.primaryColor,
                                color: "#FFF",
                                borderRadius: 3,
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              {p.party.abbreviation}
                            </span>
                            <span style={{ fontSize: 11, color: "#776550" }}>
                              {p.leader.stateId ? p.leader.stateId.toUpperCase() : "NATIONAL"}
                            </span>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              gap: 16,
                              fontSize: 12,
                              color: "#5C4A38",
                              marginTop: 6,
                            }}
                          >
                            <span>Popularity: <strong>{p.leader.popularity}%</strong></span>
                            <span>Experience: <strong>{p.leader.experience}</strong></span>
                            <span>
                              Loyalty to {p.party.abbreviation}:{" "}
                              <strong
                                style={{
                                  color: p.leader.loyalty < 50 ? "#B33927" : "#855800",
                                }}
                              >
                                {p.leader.loyalty}%
                              </strong>
                            </span>
                          </div>

                          <div style={{ fontSize: 11, color: "#6B5844", marginTop: 4 }}>
                            {p.grievanceDescription}
                          </div>

                          {/* Probability bar */}
                          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#2C2416" }}>
                              Defection Odds: {p.successProbability}%
                            </span>
                            <div
                              style={{
                                width: 140,
                                height: 6,
                                backgroundColor: "#E2D9BE",
                                borderRadius: 3,
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${p.successProbability}%`,
                                  height: "100%",
                                  backgroundColor:
                                    p.successProbability > 60
                                      ? "#2B5E2B"
                                      : p.successProbability > 35
                                      ? "#855800"
                                      : "#B33927",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 11, color: "#776550" }}>Poaching Cost:</div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: "#2C2416", marginBottom: 6 }}>
                            ₹{p.poachingCost.toLocaleString("en-IN")}
                          </div>
                          <button
                            onClick={() => handlePoachLeader(p.leader.id)}
                            disabled={!canAfford}
                            style={{
                              padding: "8px 16px",
                              backgroundColor: canAfford ? "#7D2E1E" : "#8C7D6B",
                              color: "#FFF",
                              border: "none",
                              borderRadius: 4,
                              fontWeight: 800,
                              fontSize: 12,
                              cursor: canAfford ? "pointer" : "not-allowed",
                            }}
                          >
                            {canAfford ? "Extend Poaching Offer" : "Insufficient Funds"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === "internal_factions" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div
                style={{
                  padding: 12,
                  backgroundColor: "#FFF",
                  border: "1px solid #D8CCAC",
                  borderRadius: 4,
                  fontSize: 12,
                  color: "#5C4A38",
                }}
              >
                Internal party factions form around ambitious or aggrieved leaders. Unaddressed grievances increase rebel risks in ticket distribution and can spark legislative splits.
              </div>

              {factions.length === 0 ? (
                <div
                  style={{
                    padding: 30,
                    textAlign: "center",
                    backgroundColor: "#EAF5EA",
                    border: "1px solid #557C55",
                    borderRadius: 4,
                    color: "#2B5E2B",
                    fontWeight: 700,
                  }}
                >
                  Party unity is ironclad! No dissident factions currently detected.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {factions.map((f) => (
                    <div
                      key={f.id}
                      style={{
                        padding: 16,
                        backgroundColor: "#FFF",
                        border: "1px solid #D8CCAC",
                        borderRadius: 4,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span
                            style={{
                              fontSize: 16,
                              fontWeight: 800,
                              fontFamily: "Georgia, serif",
                              color: "#2C2416",
                            }}
                          >
                            {f.name}
                          </span>
                          <span style={{ fontSize: 11, color: "#776550" }}>
                            Led by: <strong>{f.leaderName}</strong>
                          </span>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 16,
                            fontSize: 12,
                            color: "#5C4A38",
                            marginTop: 6,
                          }}
                        >
                          <span>Cadre Backing: <strong>{f.memberCount} members</strong></span>
                          <span>Influence: <strong>{f.influence}%</strong></span>
                          <span>
                            Loyalty to High Command:{" "}
                            <strong
                              style={{
                                color: f.loyaltyToHighCommand < 50 ? "#B33927" : "#855800",
                              }}
                            >
                              {f.loyaltyToHighCommand}%
                            </strong>
                          </span>
                          <span>
                            Grievance Level:{" "}
                            <strong
                              style={{
                                color: f.grievanceLevel > 50 ? "#B33927" : "#2B5E2B",
                              }}
                            >
                              {f.grievanceLevel}%
                            </strong>
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handlePlacateFaction(f.id)}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#2B5E2B",
                          color: "#FFF",
                          border: "none",
                          borderRadius: 4,
                          fontWeight: 800,
                          fontSize: 12,
                          cursor: "pointer",
                        }}
                      >
                        Placate Faction (₹25,000)
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "tenth_schedule" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div
                style={{
                  padding: 14,
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
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <Scale size={16} color="#7D2E1E" />
                  Tenth Schedule of the Constitution of India (Anti-Defection Law)
                </h4>
                <div style={{ fontSize: 12, color: "#5C4A38", lineHeight: 1.5 }}>
                  Under Indian constitutional law, elected legislators who defect from their party are <strong>disqualified</strong> by the Speaker unless at least <strong>two-thirds (66.7%)</strong> of the legislative party breaks away together as a recognized merger/split.
                </div>
              </div>

              {/* Defection Simulator Desk */}
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#FFF",
                  border: "1px solid #D8CCAC",
                  borderRadius: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      STATE ASSEMBLY:
                    </label>
                    <select
                      value={selectedStateId}
                      onChange={(e) => setSelectedStateId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 3,
                        border: "1px solid #D8CCAC",
                      }}
                    >
                      {INDIA_REGIONS.filter((r) => (r.assemblySeats ?? 0) > 0).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.assemblySeats} seats)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      TARGET PARTY TO BREAK:
                    </label>
                    <select
                      value={defectingPartyId}
                      onChange={(e) => setDefectingPartyId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 3,
                        border: "1px solid #D8CCAC",
                      }}
                    >
                      {campaign?.politicalWorld.parties
                        .filter((p) => p.isActive && !p.isPlayerParty)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.abbreviation})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>
                      DEFECTING MLAS COUNT:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={defectingCount}
                      onChange={(e) => setDefectingCount(parseInt(e.target.value) || 1)}
                      style={{
                        width: "100%",
                        padding: "6px 8px",
                        borderRadius: 3,
                        border: "1px solid #D8CCAC",
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleLegislativeDefection}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#7D2E1E",
                    color: "#FFF",
                    border: "1px solid #5C1D11",
                    borderRadius: 4,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    marginTop: 6,
                  }}
                >
                  <Zap size={16} />
                  Engineer Legislative Split &amp; Floor Test
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
