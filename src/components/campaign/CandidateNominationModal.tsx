"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  Vote,
  Search,
  Filter,
  Shield,
  UserCheck,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  MapPin,
  Award,
  Layers,
  Coins,
  Users,
} from "lucide-react";
import type { CampaignState, CandidateProfile, ReservationCategory } from "@/types/campaign";
import {
  INDIA_ASSEMBLY_CONSTITUENCIES,
  INDIA_LOK_SABHA_CONSTITUENCIES,
} from "@/data/constituencies";
import {
  getCandidatesForConstituency,
  scoutCandidate,
  nominateCandidateFromPool,
} from "@/engine/candidates/candidateEngine";
import { useCampaignStore } from "@/engine/campaign/campaignStore";

interface CandidateNominationModalProps {
  isOpen: boolean;
  onClose: () => void;
  electionId: string;
  defaultConstituencyId?: string | null;
  onSuccess?: (message: string) => void;
}

export default function CandidateNominationModal({
  isOpen,
  onClose,
  electionId,
  defaultConstituencyId,
  onSuccess,
}: CandidateNominationModalProps) {
  const campaign = useCampaignStore((state) => state.campaign);
  const updateCampaign = useCampaignStore((state) => state.updateCampaign);

  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(
    defaultConstituencyId ?? null,
  );
  const [searchSeat, setSearchSeat] = useState("");
  const [reservationFilter, setReservationFilter] = useState<string>("all");
  const [contestFilter, setContestFilter] = useState<"all" | "uncontested" | "contested">("all");
  const [scoutingInProgress, setScoutingInProgress] = useState(false);
  const [statusNotice, setStatusNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const election = useMemo(() => {
    if (!campaign) return null;
    return campaign.elections.find((e) => e.id === electionId);
  }, [campaign, electionId]);

  const playerParty = useMemo(() => {
    if (!campaign) return null;
    return campaign.politicalWorld.parties.find((p) => p.isPlayerParty);
  }, [campaign]);

  const playerTreasury = useMemo(() => {
    if (!campaign || !playerParty) return null;
    return campaign.economy.treasuries.find((t) => t.partyId === playerParty.id);
  }, [campaign, playerParty]);

  // All constituencies under this election
  const seats = useMemo(() => {
    if (!election) return [];
    if (election.type === "vidhan_sabha" && election.stateId) {
      return INDIA_ASSEMBLY_CONSTITUENCIES.filter((ac) => ac.stateId === election.stateId);
    }
    return INDIA_LOK_SABHA_CONSTITUENCIES;
  }, [election]);

  // Nominated candidate IDs by player party in this election
  const playerNominatedSeats = useMemo(() => {
    if (!election || !playerParty) return new Map<string, string>();
    const map = new Map<string, string>();
    election.candidates
      .filter((c) => c.partyId === playerParty.id)
      .forEach((c) => map.set(c.constituencyId, c.name));
    return map;
  }, [election, playerParty]);

  // Filtered seats list
  const filteredSeats = useMemo(() => {
    return seats.filter((s) => {
      if (searchSeat) {
        const query = searchSeat.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesNum = s.constituencyNumber.toString().includes(query);
        if (!matchesName && !matchesNum) return false;
      }
      if (reservationFilter !== "all" && s.reservation !== reservationFilter) {
        return false;
      }
      const isContested = playerNominatedSeats.has(s.id);
      if (contestFilter === "uncontested" && isContested) return false;
      if (contestFilter === "contested" && !isContested) return false;
      return true;
    });
  }, [seats, searchSeat, reservationFilter, contestFilter, playerNominatedSeats]);

  // Selected seat details
  const activeSeat = useMemo(() => {
    if (!selectedSeatId) {
      return filteredSeats.length > 0 ? filteredSeats[0] : null;
    }
    return seats.find((s) => s.id === selectedSeatId) ?? null;
  }, [selectedSeatId, filteredSeats, seats]);

  // Candidates available for the active seat
  const seatCandidates = useMemo(() => {
    if (!campaign || !activeSeat || !election) return [];
    return getCandidatesForConstituency(campaign, election.id, activeSeat.id);
  }, [campaign, election, activeSeat]);

  const depositCost = election?.type === "lok_sabha" ? 10000 : 5000;

  if (!isOpen || !campaign || !election || !playerParty) return null;

  // Handle nominating a candidate
  const handleNominate = (candidateProfile: CandidateProfile) => {
    if (!activeSeat) return;
    setStatusNotice(null);
    try {
      const res = nominateCandidateFromPool(campaign, election.id, activeSeat.id, candidateProfile);
      updateCampaign(() => res.campaign);
      setStatusNotice({ type: "success", message: res.resultMessage });
      if (onSuccess) onSuccess(res.resultMessage);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Nomination failed.";
      setStatusNotice({ type: "error", message: msg });
    }
  };

  // Handle scouting a candidate for this seat
  const handleScoutCandidate = (reservation: ReservationCategory) => {
    if (!activeSeat) return;
    setStatusNotice(null);
    setScoutingInProgress(true);
    try {
      const res = scoutCandidate(campaign, activeSeat.stateId, reservation);
      updateCampaign(() => res.campaign);
      setStatusNotice({
        type: "success",
        message: `Scouted ${res.candidate.name} (${res.candidate.reservationCategory.toUpperCase()})! Now select them below to file nomination papers.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scouting failed.";
      setStatusNotice({ type: "error", message: msg });
    } finally {
      setScoutingInProgress(false);
    }
  };

  const isCurrentSeatNominated = activeSeat ? playerNominatedSeats.has(activeSeat.id) : false;
  const currentNomineeName = activeSeat ? playerNominatedSeats.get(activeSeat.id) : null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(20, 20, 20, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        className="paper-panel"
        style={{
          width: "100%",
          maxWidth: 1100,
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#FFFDF6",
          border: "3px solid #34495E",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "2px solid #34495E",
            backgroundColor: "#2C3E50",
            color: "#FFF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 4,
                backgroundColor: "#D96B42",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFF",
              }}
            >
              <Vote size={22} />
            </div>
            <div>
              <span style={{ fontSize: 10, letterSpacing: 1.2, fontWeight: 900, color: "#E5B94F" }}>
                OFFICIAL RETURNING OFFICER DIRECTORY · {election.type === "lok_sabha" ? "LOK SABHA" : "VIDHAN SABHA"}
              </span>
              <h2 style={{ margin: 0, fontSize: 18, fontFamily: "Georgia, serif" }}>
                Candidate Nominations: {election.name}
              </h2>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* Treasury info */}
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

        {/* Status notification */}
        {statusNotice && (
          <div
            style={{
              padding: "10px 18px",
              backgroundColor: statusNotice.type === "success" ? "#EAF5EA" : "#FDEAEA",
              borderBottom: `1px solid ${statusNotice.type === "success" ? "#557C55" : "#D96B42"}`,
              color: statusNotice.type === "success" ? "#2B5E2B" : "#B33927",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            {statusNotice.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{statusNotice.message}</span>
          </div>
        )}

        {/* Content Body: 2 Columns */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px 1fr",
            flex: 1,
            overflow: "hidden",
            minHeight: 0,
          }}
        >
          {/* Left Column: Constituency Browser */}
          <div
            style={{
              borderRight: "2px solid #E2D7C3",
              backgroundColor: "#F9F5EA",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Search & Filters */}
            <div style={{ padding: 12, borderBottom: "1px solid #DED3BF", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#8C5946" }}
                />
                <input
                  type="text"
                  placeholder="Search seat name or #..."
                  value={searchSeat}
                  onChange={(e) => setSearchSeat(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 8px 6px 30px",
                    fontSize: 12,
                    border: "1px solid #D6B995",
                    borderRadius: 3,
                    backgroundColor: "#FFFDF6",
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                {(["all", "uncontested", "contested"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setContestFilter(mode)}
                    style={{
                      flex: 1,
                      padding: "4px 2px",
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      border: "1px solid #C4A47C",
                      backgroundColor: contestFilter === mode ? "#34495E" : "#FFF",
                      color: contestFilter === mode ? "#FFF" : "#34495E",
                      cursor: "pointer",
                      borderRadius: 2,
                    }}
                  >
                    {mode === "all" ? `All (${seats.length})` : mode === "uncontested" ? `Open (${seats.length - playerNominatedSeats.size})` : `Fielded (${playerNominatedSeats.size})`}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", gap: 4 }}>
                {(["all", "general", "sc", "st"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setReservationFilter(cat)}
                    style={{
                      flex: 1,
                      padding: "3px 2px",
                      fontSize: 9,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      border: "1px solid #D6B995",
                      backgroundColor: reservationFilter === cat ? "#D96B42" : "#FFFDF6",
                      color: reservationFilter === cat ? "#FFF" : "#8C5946",
                      cursor: "pointer",
                      borderRadius: 2,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Constituencies List */}
            <div style={{ flex: 1, overflowY: "auto", padding: 6 }}>
              {filteredSeats.map((s) => {
                const isSelected = activeSeat?.id === s.id;
                const isNominated = playerNominatedSeats.has(s.id);
                const nominee = playerNominatedSeats.get(s.id);

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setSelectedSeatId(s.id);
                      setStatusNotice(null);
                    }}
                    style={{
                      padding: "8px 10px",
                      marginBottom: 4,
                      backgroundColor: isSelected ? "#EAE0CF" : isNominated ? "#F0F7F0" : "#FFFDF6",
                      border: isSelected ? "2px solid #34495E" : "1px solid #E2D7C3",
                      borderRadius: 3,
                      cursor: "pointer",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: "#8C5946" }}>
                          #{s.constituencyNumber}
                        </span>
                        <strong style={{ fontSize: 12, color: "#2C3E50" }}>{s.name}</strong>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                        <span
                          style={{
                            fontSize: 8,
                            fontWeight: 900,
                            padding: "1px 4px",
                            borderRadius: 2,
                            backgroundColor:
                              s.reservation === "sc"
                                ? "#E5B94F"
                                : s.reservation === "st"
                                ? "#557C55"
                                : s.reservation === "sangha"
                                ? "#D96B42"
                                : "#BDC3C7",
                            color: "#FFF",
                            textTransform: "uppercase",
                          }}
                        >
                          {s.reservation}
                        </span>
                        {isNominated && (
                          <span style={{ fontSize: 10, fontWeight: 700, color: "#2B5E2B" }}>
                            ✓ {nominee}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={14} color={isSelected ? "#34495E" : "#BBA47D"} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Seat Details & Candidate Selection */}
          <div
            style={{
              padding: 20,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 16,
              backgroundColor: "#FFFDF6",
            }}
          >
            {activeSeat ? (
              <>
                {/* Active Seat Header Card */}
                <div
                  style={{
                    padding: "14px 18px",
                    backgroundColor: "#F4EDE0",
                    border: "2px solid #C4A47C",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: "#8C5946" }}>
                          SEAT #{activeSeat.constituencyNumber}
                        </span>
                        <span
                          style={{
                            padding: "2px 8px",
                            backgroundColor:
                              activeSeat.reservation === "sc"
                                ? "#E5B94F"
                                : activeSeat.reservation === "st"
                                ? "#557C55"
                                : activeSeat.reservation === "sangha"
                                ? "#D96B42"
                                : "#34495E",
                            color: "#FFF",
                            fontSize: 10,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            borderRadius: 2,
                          }}
                        >
                          {activeSeat.reservation === "general"
                            ? "General (Open to All)"
                            : `Reserved for ${activeSeat.reservation.toUpperCase()}`}
                        </span>
                      </div>
                      <h3 style={{ margin: "4px 0 0", fontSize: 20, fontFamily: "Georgia, serif" }}>
                        {activeSeat.name}
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8C5946" }}>
                        State: <strong>{activeSeat.stateId.toUpperCase()}</strong> · Type:{" "}
                        <strong>{election.type === "lok_sabha" ? "Lok Sabha (Parliamentary)" : "Vidhan Sabha (Assembly)"}</strong>
                      </p>
                    </div>

                    {/* Nomination Deposit Badge */}
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: 10, color: "#8C5946", display: "block" }}>ECI Security Deposit</span>
                      <strong style={{ fontSize: 16, color: "#D96B42" }}>₹{depositCost.toLocaleString("en-IN")}</strong>
                    </div>
                  </div>

                  {/* Status banner */}
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px dashed #D6B995", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    {isCurrentSeatNominated ? (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#2B5E2B", fontSize: 12, fontWeight: 700 }}>
                        <CheckCircle2 size={16} />
                        <span>Nomination Filed: <strong>{currentNomineeName}</strong></span>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#D96B42", fontSize: 12, fontWeight: 700 }}>
                        <AlertCircle size={16} />
                        <span>Seat currently uncontested by {playerParty.name}.</span>
                      </div>
                    )}

                    {/* Quick Scout Button */}
                    {!isCurrentSeatNominated && (
                      <button
                        onClick={() => handleScoutCandidate(activeSeat.reservation)}
                        disabled={scoutingInProgress || Boolean(playerTreasury && playerTreasury.balance < 5000)}
                        style={{
                          padding: "6px 12px",
                          fontSize: 11,
                          fontWeight: 700,
                          backgroundColor: "#D96B42",
                          color: "#FFF",
                          border: "none",
                          borderRadius: 3,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          opacity: scoutingInProgress ? 0.7 : 1,
                        }}
                      >
                        <UserPlus size={14} />
                        <span>Scout Local {activeSeat.reservation.toUpperCase()} Candidate (₹5,000)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Candidate Selection List */}
                <div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 14, fontFamily: "Georgia, serif", display: "flex", alignItems: "center", gap: 6 }}>
                    <Users size={16} color="#8C5946" />
                    <span>Party Candidate Directory for this Seat</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: "#8C5946" }}>
                      ({seatCandidates.filter((c) => c.eligible).length} eligible)
                    </span>
                  </h4>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {seatCandidates.length === 0 ? (
                      <div
                        style={{
                          padding: 24,
                          textAlign: "center",
                          backgroundColor: "#F9F5EA",
                          border: "1px dashed #D6B995",
                          borderRadius: 4,
                        }}
                      >
                        <p style={{ margin: 0, fontSize: 13, color: "#8C5946" }}>
                          No candidates currently found in your directory.
                        </p>
                        <p style={{ margin: "4px 0 12px", fontSize: 11, color: "var(--ink-soft)" }}>
                          Promote party cadre, recruit leaders, or scout an authentic local candidate above.
                        </p>
                        <button
                          onClick={() => handleScoutCandidate(activeSeat.reservation)}
                          style={{
                            padding: "8px 16px",
                            backgroundColor: "#D96B42",
                            color: "#FFF",
                            border: "none",
                            borderRadius: 3,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Scout Local Candidate Now (₹5,000)
                        </button>
                      </div>
                    ) : (
                      seatCandidates.map(({ candidate, eligible, reason, isNominatedElsewhere }) => {
                        const originLabel =
                          candidate.origin === "party_leader"
                            ? "Senior Leader"
                            : candidate.origin === "cadre_member"
                            ? "Cadre Organizer"
                            : "Scouted Local";

                        return (
                          <div
                            key={candidate.id}
                            style={{
                              padding: 12,
                              backgroundColor: eligible ? "#FFFDF6" : "#F8F4EA",
                              border: `2px solid ${eligible ? "#C4A47C" : "#E2D7C3"}`,
                              borderRadius: 4,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              gap: 12,
                              opacity: eligible ? 1 : 0.65,
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <strong style={{ fontSize: 14, color: "#2C3E50" }}>{candidate.name}</strong>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 2,
                                    backgroundColor: "#34495E",
                                    color: "#FFF",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {originLabel}
                                </span>
                                <span
                                  style={{
                                    fontSize: 9,
                                    fontWeight: 800,
                                    padding: "2px 6px",
                                    borderRadius: 2,
                                    backgroundColor:
                                      candidate.reservationCategory === "sc"
                                        ? "#E5B94F"
                                        : candidate.reservationCategory === "st"
                                        ? "#557C55"
                                        : candidate.reservationCategory === "sangha"
                                        ? "#D96B42"
                                        : "#BDC3C7",
                                    color: "#FFF",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {candidate.reservationCategory}
                                </span>
                                <span style={{ fontSize: 11, color: "#8C5946" }}>
                                  {candidate.age} yrs · {candidate.gender}
                                </span>
                              </div>

                              <div style={{ display: "flex", gap: 14, marginTop: 6, fontSize: 11, color: "var(--ink-soft)" }}>
                                <span>Popularity: <strong>{candidate.popularity}</strong></span>
                                <span>Experience: <strong>{candidate.experience}</strong></span>
                                <span>Style: <strong style={{ textTransform: "capitalize" }}>{candidate.campaignStyle}</strong></span>
                                <span>Home State: <strong>{candidate.stateId?.toUpperCase() ?? "All India"}</strong></span>
                              </div>

                              {!eligible && (
                                <p style={{ margin: "4px 0 0", fontSize: 10, color: "#B33927", fontWeight: 700 }}>
                                  ⚠️ {reason}
                                </p>
                              )}
                            </div>

                            {/* Nominate Action */}
                            <div>
                              {eligible && !isCurrentSeatNominated ? (
                                <button
                                  onClick={() => handleNominate(candidate)}
                                  style={{
                                    padding: "8px 14px",
                                    backgroundColor: "#557C55",
                                    color: "#FFF",
                                    border: "none",
                                    borderRadius: 3,
                                    fontSize: 11,
                                    fontWeight: 900,
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                  }}
                                >
                                  <UserCheck size={14} />
                                  <span>NOMINATE (₹{depositCost.toLocaleString("en-IN")})</span>
                                </button>
                              ) : isCurrentSeatNominated && currentNomineeName === candidate.name ? (
                                <span
                                  style={{
                                    padding: "4px 8px",
                                    backgroundColor: "#EAF5EA",
                                    border: "1px solid #557C55",
                                    color: "#2B5E2B",
                                    fontSize: 10,
                                    fontWeight: 800,
                                    borderRadius: 2,
                                  }}
                                >
                                  ✓ FILED CANDIDATE
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 40, color: "#8C5946" }}>
                Select a constituency from the list to nominate candidates.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "12px 20px",
            borderTop: "2px solid #34495E",
            backgroundColor: "#F4EDE0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--ink-soft)" }}>
            Party candidate nominations filed: <strong>{playerNominatedSeats.size}</strong> of <strong>{seats.length}</strong> seats
          </div>
          <button
            onClick={onClose}
            className="primary-button"
            style={{ marginTop: 0, padding: "8px 20px", width: "auto" }}
          >
            DONE / RETURN TO COMMAND
          </button>
        </div>
      </div>
    </div>
  );
}
