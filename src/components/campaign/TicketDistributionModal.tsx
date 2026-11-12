"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Vote,
  Search,
  Filter,
  Shield,
  UserCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  MapPin,
  Award,
  Layers,
  Coins,
  Users,
  Zap,
} from "lucide-react";
import type {
  CampaignState,
  TicketClaimant,
  RebelCandidate,
} from "@/types/campaign";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";
import {
  generateTicketClaimants,
  allocateTicket,
  aiDistributeTickets,
} from "@/engine/elections/ticketDistribution";
import { useCampaignStore } from "@/engine/campaign/campaignStore";

interface TicketDistributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  defaultConstituencyId?: string | null;
  onSuccess?: (message: string) => void;
}

export default function TicketDistributionModal({
  isOpen,
  onClose,
  electionId,
  defaultConstituencyId,
  onSuccess,
}: TicketDistributionModalProps) {
  const campaign = useCampaignStore((state) => state.campaign);
  const updateCampaign = useCampaignStore((state) => state.updateCampaign);

  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(
    defaultConstituencyId ?? null,
  );
  const [searchSeat, setSearchSeat] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "unallocated" | "allocated" | "rebels">("all");
  const [statusNotice, setStatusNotice] = useState<{
    type: "success" | "warning" | "error";
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

  // Constituencies in this election
  const seats = useMemo(() => {
    if (!election) return [];
    if (election.type === "vidhan_sabha" && election.stateId) {
      return INDIA_ASSEMBLY_CONSTITUENCIES.filter((ac) => ac.stateId === election.stateId);
    }
    return INDIA_LOK_SABHA_CONSTITUENCIES;
  }, [election]);

  // Ensure claimants are present or generate on-the-fly
  const claimants = useMemo(() => {
    if (!campaign || !election) return [];
    if (election.ticketClaimants && election.ticketClaimants.length > 0) {
      return election.ticketClaimants;
    }
    return generateTicketClaimants(campaign, electionId);
  }, [campaign, election, electionId]);

  // Rebels present in election
  const rebels = useMemo(() => {
    return election?.rebels ?? [];
  }, [election]);

  // Confirmed candidates by seat for player party
  const playerConfirmedMap = useMemo(() => {
    const map = new Map<string, TicketClaimant>();
    claimants
      .filter((c) => c.partyId === playerParty?.id && c.status === "confirmed")
      .forEach((c) => map.set(c.constituencyId, c));
    return map;
  }, [claimants, playerParty]);

  // Filtered seats
  const filteredSeats = useMemo(() => {
    return seats.filter((s) => {
      if (searchSeat) {
        const query = searchSeat.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesDistrict = s.districtNames?.some((d) => d.toLowerCase().includes(query));
        const matchesNum = s.constituencyNumber.toString().includes(query);
        if (!matchesName && !matchesDistrict && !matchesNum) return false;
      }

      const isAllocated = playerConfirmedMap.has(s.id);
      const hasRebels = rebels.some((r) => r.constituencyId === s.id);

      if (filterMode === "unallocated" && isAllocated) return false;
      if (filterMode === "allocated" && !isAllocated) return false;
      if (filterMode === "rebels" && !hasRebels) return false;

      return true;
    });
  }, [seats, searchSeat, filterMode, playerConfirmedMap, rebels]);

  // Currently selected constituency object
  const activeSeat = useMemo(() => {
    const seatId = selectedSeatId ?? filteredSeats[0]?.id;
    return seats.find((s) => s.id === seatId) ?? null;
  }, [selectedSeatId, filteredSeats, seats]);

  // Claimants for active constituency
  const activeClaimants = useMemo(() => {
    if (!activeSeat) return [];
    return claimants.filter((c) => c.constituencyId === activeSeat.id);
  }, [claimants, activeSeat]);

  // Rebels in active constituency
  const activeSeatRebels = useMemo(() => {
    if (!activeSeat) return [];
    return rebels.filter((r) => r.constituencyId === activeSeat.id);
  }, [rebels, activeSeat]);

  // Action: Allocate ticket
  const handleAllocateTicket = (claimant: TicketClaimant) => {
    if (!campaign || !playerParty) return;

    updateCampaign((current) => {
      const result = allocateTicket(
        current,
        electionId,
        claimant.constituencyId,
        claimant.candidateId,
        playerParty.id,
      );

      if (result.rebelsGenerated.length > 0) {
        setStatusNotice({
          type: "warning",
          message: `${result.resultMessage}`,
        });
      } else {
        setStatusNotice({
          type: "success",
          message: result.resultMessage,
        });
      }

      onSuccess?.(result.resultMessage);
      return result.campaign;
    });
  };

  // Action: Auto distribute remaining player tickets
  const handleAutoDistributePlayer = () => {
    if (!campaign || !playerParty) return;

    updateCampaign((current) => {
      let state = current;
      let allocatedCount = 0;
      let rebelsSpawned = 0;

      for (const seat of seats) {
        const isAllocated = state.elections
          .find((e) => e.id === electionId)
          ?.candidates.some(
            (c) => c.constituencyId === seat.id && c.partyId === playerParty.id && !c.isRebel,
          );

        if (!isAllocated) {
          const seatClaimants = (
            state.elections.find((e) => e.id === electionId)?.ticketClaimants ?? []
          ).filter(
            (c) => c.constituencyId === seat.id && c.partyId === playerParty.id,
          );

          if (seatClaimants.length > 0) {
            seatClaimants.sort((a, b) => b.claimStrength - a.claimStrength);
            const topCand = seatClaimants[0];
            const res = allocateTicket(
              state,
              electionId,
              seat.id,
              topCand.candidateId,
              playerParty.id,
            );
            state = res.campaign;
            allocatedCount++;
            rebelsSpawned += res.rebelsGenerated.length;
          }
        }
      }

      setStatusNotice({
        type: rebelsSpawned > 0 ? "warning" : "success",
        message: `Auto-allocated ${allocatedCount} player constituency tickets.${rebelsSpawned > 0 ? ` ${rebelsSpawned} rebel(s) triggered!` : ""}`,
      });

      return state;
    });
  };

  // Action: Resolve all rival AI party tickets
  const handleResolveAITickets = () => {
    if (!campaign) return;

    updateCampaign((current) => {
      const updatedState = aiDistributeTickets(current, electionId);
      const afterElec = updatedState.elections.find((e) => e.id === electionId);
      const totalRebels = afterElec?.rebels?.length ?? 0;

      setStatusNotice({
        type: "success",
        message: `AI party ticket distribution complete across all seats. Total active rebels: ${totalRebels}.`,
      });

      return updatedState;
    });
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
          maxWidth: 1200,
          height: "90vh",
          maxHeight: 880,
          backgroundColor: "#FAF7EE",
          border: "2px solid #5C1D11",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {/* Top Header */}
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
              <Vote size={22} />
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
                CENTRAL ELECTION COMMITTEE · TICKET ALLOCATION DESK
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
                {election.name} — Ticket Distribution
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "2px 8px",
                    borderRadius: 3,
                    backgroundColor: "rgba(0,0,0,0.25)",
                    color: "#FFF",
                  }}
                >
                  {playerConfirmedMap.size} / {seats.length} Seats Allocated
                </span>
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={handleAutoDistributePlayer}
              title="Automatically distribute remaining tickets to top candidates"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                backgroundColor: "#2B5E2B",
                color: "#FFF",
                border: "1px solid #1C421C",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Zap size={14} />
              Auto-Allocate Player
            </button>

            <button
              onClick={handleResolveAITickets}
              title="Resolve ticket claims and generate rebels for all rival AI parties"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                backgroundColor: "#5C1D11",
                color: "#FFF",
                border: "1px solid #3E130B",
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Users size={14} />
              Resolve Rival AI Tickets
            </button>

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

        {/* Status Notification */}
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
              {statusNotice.type === "warning" ? (
                <AlertTriangle size={16} />
              ) : statusNotice.type === "success" ? (
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

        {/* Main Body: Two Panels */}
        <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
          {/* Left Panel: Constituency List */}
          <div
            style={{
              width: 380,
              borderRight: "1px solid #D8CCAC",
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#F4EFE0",
            }}
          >
            {/* Search & Filters */}
            <div
              style={{
                padding: 12,
                borderBottom: "1px solid #E2D9BE",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "#FFF",
                  border: "1px solid #D8CCAC",
                  borderRadius: 4,
                  padding: "6px 10px",
                }}
              >
                <Search size={15} color="#8C7D6B" />
                <input
                  type="text"
                  placeholder="Search constituency or district..."
                  value={searchSeat}
                  onChange={(e) => setSearchSeat(e.target.value)}
                  style={{
                    border: "none",
                    outline: "none",
                    fontSize: 12,
                    width: "100%",
                    background: "transparent",
                    color: "#2C2416",
                  }}
                />
              </div>

              {/* Filter Pills */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {(
                  [
                    { key: "all", label: `All (${seats.length})` },
                    { key: "unallocated", label: `Unallocated (${seats.length - playerConfirmedMap.size})` },
                    { key: "allocated", label: `Allocated (${playerConfirmedMap.size})` },
                    { key: "rebels", label: `Rebel Alert (${rebels.length})` },
                  ] as const
                ).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilterMode(f.key)}
                    style={{
                      padding: "4px 8px",
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 3,
                      border: "1px solid",
                      cursor: "pointer",
                      backgroundColor: filterMode === f.key ? "#7D2E1E" : "#FFF",
                      borderColor: filterMode === f.key ? "#5C1D11" : "#D8CCAC",
                      color: filterMode === f.key ? "#FFF" : "#554636",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Seats */}
            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {filteredSeats.map((seat) => {
                const confirmed = playerConfirmedMap.get(seat.id);
                const isSelected = (selectedSeatId ?? filteredSeats[0]?.id) === seat.id;
                const seatRebels = rebels.filter((r) => r.constituencyId === seat.id);

                return (
                  <div
                    key={seat.id}
                    onClick={() => setSelectedSeatId(seat.id)}
                    style={{
                      padding: "10px 12px",
                      marginBottom: 6,
                      backgroundColor: isSelected ? "#FAF7EE" : "#FFF",
                      border: `1px solid ${isSelected ? "#7D2E1E" : "#E2D9BE"}`,
                      borderLeft: isSelected ? "4px solid #7D2E1E" : "1px solid #E2D9BE",
                      borderRadius: 3,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontWeight: 800,
                            fontSize: 13,
                            color: "#2C2416",
                            fontFamily: "Georgia, serif",
                          }}
                        >
                          {seat.constituencyNumber}. {seat.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#776550", marginTop: 2 }}>
                          {seat.districtNames?.join(", ")}
                          {seat.reservation !== "general" && (
                            <span
                              style={{
                                marginLeft: 6,
                                padding: "1px 5px",
                                backgroundColor: "#855800",
                                color: "#FFF",
                                borderRadius: 2,
                                fontSize: 9,
                                fontWeight: 800,
                              }}
                            >
                              {seat.reservation.toUpperCase()}
                            </span>
                          )}
                        </div>
                      </div>

                      {seatRebels.length > 0 && (
                        <span
                          title={`${seatRebels.length} rebel(s) contesting this seat!`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 3,
                            padding: "2px 6px",
                            backgroundColor: "#FDEAEA",
                            color: "#B33927",
                            border: "1px solid #D96B42",
                            borderRadius: 3,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          <Flame size={11} />
                          {seatRebels.length} Rebel
                        </span>
                      )}
                    </div>

                    {/* Candidate status */}
                    <div style={{ marginTop: 6, fontSize: 11 }}>
                      {confirmed ? (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            color: "#2B5E2B",
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 size={12} />
                          <span>Confirmed: {confirmed.name}</span>
                        </div>
                      ) : (
                        <div style={{ color: "#8C7D6B", fontStyle: "italic" }}>
                          Ticket pending allocation
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel: Selected Constituency Claimants & Allocation */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              backgroundColor: "#FAF7EE",
              overflowY: "auto",
              padding: 20,
            }}
          >
            {activeSeat ? (
              <div>
                {/* Active Seat Banner */}
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#FFF",
                    border: "1px solid #D8CCAC",
                    borderRadius: 4,
                    marginBottom: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 11,
                        letterSpacing: 1,
                        fontWeight: 800,
                        color: "#7D2E1E",
                      }}
                    >
                      CONSTITUENCY NO. {activeSeat.constituencyNumber} · {activeSeat.stateId.toUpperCase()}
                    </span>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 22,
                        fontFamily: "Georgia, serif",
                        color: "#2C2416",
                      }}
                    >
                      {activeSeat.name}
                    </h3>
                    <div style={{ fontSize: 12, color: "#6B5844", marginTop: 4 }}>
                      Districts: {activeSeat.districtNames?.join(", ")} | Reservation:{" "}
                      <strong style={{ textTransform: "uppercase" }}>
                        {activeSeat.reservation}
                      </strong>
                    </div>
                  </div>

                  {playerConfirmedMap.get(activeSeat.id) && (
                    <div
                      style={{
                        padding: "8px 14px",
                        backgroundColor: "#EAF5EA",
                        border: "1px solid #557C55",
                        borderRadius: 4,
                        textAlign: "right",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#2B5E2B" }}>
                        PARTY TICKET GRANTED
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: "#1C421C" }}>
                        {playerConfirmedMap.get(activeSeat.id)?.name}
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Rebel Alert if present in seat */}
                {activeSeatRebels.length > 0 && (
                  <div
                    style={{
                      padding: 14,
                      backgroundColor: "#FDEAEA",
                      border: "1px solid #D96B42",
                      borderRadius: 4,
                      marginBottom: 16,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        fontWeight: 800,
                        color: "#B33927",
                        fontSize: 14,
                      }}
                    >
                      <Flame size={18} />
                      REBEL CONTENDERS ACTIVE IN THIS SEAT
                    </div>
                    <div style={{ fontSize: 12, color: "#551D14", marginTop: 4 }}>
                      Denied claimants have broken discipline and are running as Independent rebels, splitting votes away from their former party:
                    </div>
                    <div style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
                      {activeSeatRebels.map((rebel) => (
                        <div
                          key={rebel.id}
                          style={{
                            padding: "6px 10px",
                            backgroundColor: "#FFF",
                            border: "1px solid #E08770",
                            borderRadius: 3,
                            fontSize: 12,
                          }}
                        >
                          <strong>{rebel.name}</strong> (ex-{rebel.originalPartyId.toUpperCase()})
                          <span
                            style={{
                              marginLeft: 8,
                              color: "#B33927",
                              fontWeight: 700,
                            }}
                          >
                            Splits ~{Math.round(rebel.voteSplitFactor * 100)}% vote share
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Player Party Claimants */}
                <div style={{ marginBottom: 20 }}>
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
                    <Users size={16} color="#7D2E1E" />
                    Party Ticket Claimants ({playerParty?.name})
                  </h4>

                  {activeClaimants.filter((c) => c.partyId === playerParty?.id).length === 0 ? (
                    <div
                      style={{
                        padding: 18,
                        backgroundColor: "#FFF",
                        border: "1px dashed #D8CCAC",
                        borderRadius: 4,
                        textAlign: "center",
                        color: "#776550",
                        fontSize: 13,
                      }}
                    >
                      No active cadre or scouted candidates currently meet the reservation or domicile eligibility for {activeSeat.name}.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {activeClaimants
                        .filter((c) => c.partyId === playerParty?.id)
                        .map((cand) => {
                          const isConfirmed = cand.status === "confirmed";
                          const isDenied = cand.status === "denied";

                          return (
                            <div
                              key={cand.candidateId}
                              style={{
                                padding: 14,
                                backgroundColor: isConfirmed ? "#EAF5EA" : isDenied ? "#FBF3F1" : "#FFF",
                                border: `1px solid ${
                                  isConfirmed ? "#557C55" : isDenied ? "#D96B42" : "#D8CCAC"
                                }`,
                                borderRadius: 4,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span
                                    style={{
                                      fontSize: 15,
                                      fontWeight: 800,
                                      fontFamily: "Georgia, serif",
                                      color: "#2C2416",
                                    }}
                                  >
                                    {cand.name}
                                  </span>
                                  {isConfirmed && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        padding: "2px 6px",
                                        backgroundColor: "#2B5E2B",
                                        color: "#FFF",
                                        borderRadius: 2,
                                      }}
                                    >
                                      CONFIRMED TICKET
                                    </span>
                                  )}
                                  {isDenied && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        padding: "2px 6px",
                                        backgroundColor: "#B33927",
                                        color: "#FFF",
                                        borderRadius: 2,
                                      }}
                                    >
                                      TICKET DENIED
                                    </span>
                                  )}
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
                                  <span>Popularity: <strong>{cand.popularity}%</strong></span>
                                  <span>Experience: <strong>{cand.experience}</strong></span>
                                  <span>Loyalty: <strong>{cand.loyalty}%</strong></span>
                                  <span>Claim Strength: <strong>{cand.claimStrength}/100</strong></span>
                                </div>

                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginTop: 6,
                                    fontSize: 11,
                                  }}
                                >
                                  <span style={{ color: "#776550" }}>Rebel Risk if Denied:</span>
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color:
                                        cand.rebelRisk > 60
                                          ? "#B33927"
                                          : cand.rebelRisk > 35
                                          ? "#855800"
                                          : "#2B5E2B",
                                    }}
                                  >
                                    {cand.rebelRisk}% ({cand.rebelRisk > 60 ? "HIGH DANGER" : cand.rebelRisk > 35 ? "MODERATE" : "LOW"})
                                  </span>
                                </div>
                              </div>

                              <div>
                                {!isConfirmed && (
                                  <button
                                    onClick={() => handleAllocateTicket(cand)}
                                    style={{
                                      padding: "8px 16px",
                                      backgroundColor: "#7D2E1E",
                                      color: "#FFF",
                                      border: "1px solid #5C1D11",
                                      borderRadius: 4,
                                      fontWeight: 800,
                                      fontSize: 12,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Grant Ticket
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {/* Rival Parties Claims in this Seat */}
                <div>
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
                    <Shield size={16} color="#554636" />
                    Rival Party Contenders in {activeSeat.name}
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {activeClaimants
                      .filter((c) => c.partyId !== playerParty?.id)
                      .slice(0, 4)
                      .map((rival) => (
                        <div
                          key={rival.candidateId}
                          style={{
                            padding: "10px 14px",
                            backgroundColor: "#FFF",
                            border: "1px solid #E2D9BE",
                            borderRadius: 4,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: 12,
                          }}
                        >
                          <div>
                            <span style={{ fontWeight: 800, color: "#2C2416" }}>
                              {rival.name}
                            </span>
                            <span
                              style={{
                                marginLeft: 8,
                                padding: "2px 6px",
                                backgroundColor: "#EDE6D6",
                                borderRadius: 2,
                                fontWeight: 700,
                                fontSize: 10,
                              }}
                            >
                              {rival.partyId.toUpperCase()}
                            </span>
                            <div style={{ color: "#776550", fontSize: 11, marginTop: 2 }}>
                              Popularity: {rival.popularity}% | Experience: {rival.experience} | Claim: {rival.claimStrength}
                            </div>
                          </div>

                          <div style={{ fontSize: 11, textAlign: "right" }}>
                            <div style={{ color: "#776550" }}>Status:</div>
                            <strong
                              style={{
                                color: rival.status === "confirmed" ? "#2B5E2B" : "#8C7D6B",
                              }}
                            >
                              {rival.status.toUpperCase()}
                            </strong>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "#8C7D6B",
                }}
              >
                Select a constituency on the left to allocate tickets.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
