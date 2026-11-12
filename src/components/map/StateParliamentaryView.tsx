"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  Vote,
  Landmark,
  Shield,
  Award,
  ChevronRight,
  Layers,
  MapPin,
  Building2,
  Users,
} from "lucide-react";
import type { CampaignState, PoliticalParty } from "@/types/campaign";
import type { RegionSeed } from "@/data/india2026";
import {
  getLokSabhaConstituenciesByState,
  getAssemblyConstituenciesByState,
  getAssemblySegmentsByLokSabha,
} from "@/data/constituencies";
import type { LokSabhaConstituency, AssemblyConstituency } from "@/types/constituency";

interface StateParliamentaryViewProps {
  campaign: CampaignState;
  region: RegionSeed;
  onBackToNational: () => void;
  onSwitchToAssemblyView?: () => void;
}

export default function StateParliamentaryView({
  campaign,
  region,
  onBackToNational,
  onSwitchToAssemblyView,
}: StateParliamentaryViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationFilter, setReservationFilter] = useState<string>("all");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [selectedPcId, setSelectedPcId] = useState<string | null>(null);

  // All Lok Sabha seats for this state
  const lokSabhaConstituencies = useMemo(() => {
    return getLokSabhaConstituenciesByState(region.id);
  }, [region.id]);

  // All Assembly seats for this state
  const assemblyConstituencies = useMemo(() => {
    return getAssemblyConstituenciesByState(region.id);
  }, [region.id]);

  // Parliamentary constituency control mapping
  const pcControlMap = useMemo(() => {
    const map = new Map<string, { partyId: string | null; candidateId: string | null }>();
    campaign.politicalWorld.constituencyControl.forEach((c) => {
      if (c.stateId === region.id && c.constituencyType === "lok_sabha") {
        map.set(c.constituencyId, { partyId: c.winningPartyId, candidateId: c.candidateId });
      }
    });
    return map;
  }, [campaign, region.id]);

  // Assembly constituency control mapping (for ground assembly segments)
  const acControlMap = useMemo(() => {
    const map = new Map<string, { partyId: string | null; candidateId: string | null }>();
    campaign.politicalWorld.constituencyControl.forEach((c) => {
      if (c.stateId === region.id && c.constituencyType === "vidhan_sabha") {
        map.set(c.constituencyId, { partyId: c.winningPartyId, candidateId: c.candidateId });
      }
    });
    return map;
  }, [campaign, region.id]);

  // Parties represented in this state's Lok Sabha seats
  const statePcParties = useMemo(() => {
    const partyIds = new Set<string>();
    pcControlMap.forEach((v) => {
      if (v.partyId) partyIds.add(v.partyId);
    });
    return Array.from(partyIds)
      .map((id) => campaign.politicalWorld.parties.find((p) => p.id === id))
      .filter((p): p is PoliticalParty => p !== undefined);
  }, [pcControlMap, campaign]);

  // Contained AC map: maps pc.id -> array of AssemblyConstituency
  const pcSegmentsMap = useMemo(() => {
    const map = new Map<string, AssemblyConstituency[]>();
    lokSabhaConstituencies.forEach((pc) => {
      const segs = getAssemblySegmentsByLokSabha(pc.id);
      map.set(pc.id, segs);
    });
    return map;
  }, [lokSabhaConstituencies]);

  // Filtered Parliamentary Constituencies
  const filteredPcs = useMemo(() => {
    return lokSabhaConstituencies.filter((pc) => {
      const containedAcs = pcSegmentsMap.get(pc.id) ?? [];
      const acMatchesSearch = containedAcs.some((ac) =>
        ac.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      const matchesSearch =
        pc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(pc.constituencyNumber).includes(searchQuery) ||
        acMatchesSearch;

      const matchesReservation =
        reservationFilter === "all" ||
        pc.reservation.toLowerCase() === reservationFilter.toLowerCase();

      const control = pcControlMap.get(pc.id);
      const matchesParty = partyFilter === "all" || control?.partyId === partyFilter;

      return matchesSearch && matchesReservation && matchesParty;
    });
  }, [lokSabhaConstituencies, searchQuery, reservationFilter, partyFilter, pcControlMap, pcSegmentsMap]);

  // Selected PC
  const selectedPc = useMemo(() => {
    if (!selectedPcId) return null;
    return lokSabhaConstituencies.find((pc) => pc.id === selectedPcId) ?? null;
  }, [selectedPcId, lokSabhaConstituencies]);

  const selectedPcControl = useMemo(() => {
    if (!selectedPc) return null;
    return pcControlMap.get(selectedPc.id) ?? null;
  }, [selectedPc, pcControlMap]);

  const selectedPcParty = useMemo(() => {
    if (!selectedPcControl?.partyId) return null;
    return campaign.politicalWorld.parties.find((p) => p.id === selectedPcControl.partyId) ?? null;
  }, [selectedPcControl, campaign]);

  const selectedPcSegments = useMemo(() => {
    if (!selectedPc) return [];
    return pcSegmentsMap.get(selectedPc.id) ?? [];
  }, [selectedPc, pcSegmentsMap]);

  // Seat composition tally
  const seatComposition = useMemo(() => {
    const countMap = new Map<string, number>();
    pcControlMap.forEach((v) => {
      if (v.partyId) {
        countMap.set(v.partyId, (countMap.get(v.partyId) ?? 0) + 1);
      }
    });

    return Array.from(countMap.entries())
      .map(([partyId, seats]) => {
        const party = campaign.politicalWorld.parties.find((p) => p.id === partyId);
        return {
          partyId,
          party,
          seats,
          percentage: Math.round((seats / Math.max(1, lokSabhaConstituencies.length)) * 100),
        };
      })
      .sort((a, b) => b.seats - a.seats);
  }, [pcControlMap, lokSabhaConstituencies.length, campaign]);

  return (
    <div className="state-parliamentary-inspector" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Top Navigation & Return */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button
          type="button"
          onClick={onBackToNational}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "5px 10px",
            fontSize: "11px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            background: "#E8D3AC",
            border: "1.5px solid var(--ink)",
            borderRadius: "3px",
            cursor: "pointer",
            color: "var(--ink)",
          }}
        >
          <ArrowLeft size={13} />
          <span>ALL STATES OF INDIA</span>
        </button>

        {onSwitchToAssemblyView && region.assemblySeats > 0 && (
          <button
            type="button"
            onClick={onSwitchToAssemblyView}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "4px 8px",
              fontSize: "10px",
              fontWeight: 800,
              background: "#FCEADE",
              border: "1px solid #D96B42",
              color: "#A8492C",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            <Landmark size={12} />
            SWITCH TO ASSEMBLY ({region.assemblySeats} ACs)
          </button>
        )}
      </div>

      {/* State Header Banner */}
      <div
        style={{
          padding: "12px",
          background: "#F8F1E3",
          border: "2px solid #557C55",
          borderRadius: "4px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#557C55", letterSpacing: "1px" }}>
              LOK SABHA PARLIAMENTARY DELIMITATION
            </span>
            <h2 style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 900, color: "var(--ink)" }}>
              {region.name}
            </h2>
            <div style={{ fontSize: "10px", color: "#665", marginTop: "2px" }}>
              CAPITAL: <strong>{region.capital}</strong> · <strong>{lokSabhaConstituencies.length}</strong> PARLIAMENTARY SEATS
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "18px", fontWeight: 900, color: "#557C55" }}>
              {region.lokSabhaSeats}
            </span>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#888", textTransform: "uppercase" }}>
              MP SEATS
            </div>
          </div>
        </div>

        {/* Lok Sabha State Seat Composition Bar */}
        {seatComposition.length > 0 && (
          <div style={{ marginTop: "10px" }}>
            <div
              style={{
                height: "18px",
                display: "flex",
                width: "100%",
                borderRadius: "3px",
                overflow: "hidden",
                border: "1.5px solid #34495E",
                background: "#E8D3AC",
              }}
            >
              {seatComposition.map((stat) => (
                <div
                  key={stat.partyId}
                  title={`${stat.party?.name ?? stat.partyId}: ${stat.seats} seats (${stat.percentage}%)`}
                  style={{
                    width: `${(stat.seats / lokSabhaConstituencies.length) * 100}%`,
                    backgroundColor: stat.party?.branding.primaryColor ?? "#8C5946",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#FFF",
                    fontSize: "9px",
                    fontWeight: 900,
                    textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                    borderRight: "1px solid rgba(0,0,0,0.2)",
                  }}
                >
                  {stat.seats >= 2 ? (stat.party?.abbreviation ?? stat.partyId) : ""}
                </div>
              ))}
            </div>

            <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "9px" }}>
              {seatComposition.map((stat) => (
                <span
                  key={stat.partyId}
                  style={{
                    padding: "2px 6px",
                    borderRadius: "2px",
                    background: "#FFFDF6",
                    border: "1px solid #D6B995",
                    fontWeight: 700,
                  }}
                >
                  {stat.party?.abbreviation ?? stat.partyId}: <strong>{stat.seats}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Directory Controls */}
      <div
        style={{
          padding: "10px",
          background: "#F8F1E3",
          border: "1.5px solid #D6B995",
          borderRadius: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            PARLIAMENTARY SEATS ({filteredPcs.length} OF {lokSabhaConstituencies.length})
          </span>
        </div>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "8px", top: "8px", color: "#888" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search PC name, #, or assembly segment..."
            style={{
              width: "100%",
              padding: "6px 8px 6px 28px",
              fontSize: "11px",
              borderRadius: "3px",
              border: "1px solid #C8B99D",
              background: "#FFFDF6",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "6px" }}>
          <select
            value={reservationFilter}
            onChange={(e) => setReservationFilter(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 6px",
              fontSize: "10px",
              borderRadius: "3px",
              border: "1px solid #C8B99D",
              background: "#FFFDF6",
              fontWeight: 700,
            }}
          >
            <option value="all">Reservation: All</option>
            <option value="general">General (GEN)</option>
            <option value="sc">Scheduled Caste (SC)</option>
            <option value="st">Scheduled Tribe (ST)</option>
          </select>

          <select
            value={partyFilter}
            onChange={(e) => setPartyFilter(e.target.value)}
            style={{
              flex: 1,
              padding: "4px 6px",
              fontSize: "10px",
              borderRadius: "3px",
              border: "1px solid #C8B99D",
              background: "#FFFDF6",
              fontWeight: 700,
            }}
          >
            <option value="all">Party: All</option>
            {statePcParties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.abbreviation} ({p.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected PC Field Intelligence Dossier */}
      {selectedPc && (
        <div
          style={{
            padding: "12px",
            background: "#FFFDF6",
            border: "2px solid #557C55",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(85,124,85,0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#557C55" }}>
                SELECTED PARLIAMENTARY SEAT
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: 900, color: "var(--ink)" }}>
                #{selectedPc.constituencyNumber} {selectedPc.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPcId(null)}
              style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 900, color: "#888" }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px" }}>
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "2px",
                background: selectedPc.reservation === "general" ? "#E8D3AC" : "#FCEADE",
                color: selectedPc.reservation === "general" ? "#514235" : "#D96B42",
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              {selectedPc.reservation === "general" ? "General Seat" : `${selectedPc.reservation.toUpperCase()} Reserved`}
            </span>

            <span
              style={{
                padding: "2px 6px",
                borderRadius: "2px",
                background: "#F8F1E3",
                border: "1px solid #D6B995",
                fontWeight: 700,
              }}
            >
              {selectedPcSegments.length} Assembly Segments Contained
            </span>
          </div>

          {/* Incumbent MP details */}
          <div style={{ marginTop: "10px", padding: "8px", background: "#F8F1E3", borderRadius: "3px", border: "1px solid #D6B995" }}>
            <div style={{ fontSize: "9px", fontWeight: 900, color: "#8C5946", textTransform: "uppercase" }}>
              INCUMBENT MEMBER OF PARLIAMENT (MP)
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "2px",
                    backgroundColor: selectedPcParty?.branding.primaryColor ?? "#8C5946",
                    display: "inline-block",
                  }}
                />
                <strong style={{ fontSize: "11px" }}>
                  {selectedPcParty ? `${selectedPcParty.abbreviation} (${selectedPcParty.name})` : "Uncontested"}
                </strong>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#557C55" }}>
                ELECTED MP
              </span>
            </div>
          </div>

          {/* Contained Assembly Segments Ground Breakdown */}
          {selectedPcSegments.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <div style={{ fontSize: "9px", fontWeight: 900, color: "#514235", textTransform: "uppercase", marginBottom: "4px" }}>
                CONTAINED VIDHAN SABHA ASSEMBLY SEGMENTS ({selectedPcSegments.length}):
              </div>

              <div
                style={{
                  maxHeight: "150px",
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                {selectedPcSegments.map((ac) => {
                  const acCtrl = acControlMap.get(ac.id);
                  const acParty = acCtrl?.partyId
                    ? campaign.politicalWorld.parties.find((p) => p.id === acCtrl.partyId)
                    : null;

                  return (
                    <div
                      key={ac.id}
                      style={{
                        padding: "4px 8px",
                        background: "#FFFDF6",
                        border: "1px solid #E2D3B8",
                        borderRadius: "2px",
                        fontSize: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <span style={{ fontWeight: 800, color: "#8C5946" }}>#{ac.constituencyNumber}</span>
                        <strong>{ac.name}</strong>
                        {ac.reservation !== "general" && (
                          <span style={{ fontSize: "8px", fontWeight: 900, color: "#D96B42" }}>
                            ({ac.reservation.toUpperCase()})
                          </span>
                        )}
                      </div>

                      {acParty && (
                        <span
                          style={{
                            padding: "1px 5px",
                            borderRadius: "2px",
                            fontSize: "8px",
                            fontWeight: 900,
                            backgroundColor: acParty.branding.primaryColor,
                            color: "#FFF",
                          }}
                        >
                          {acParty.abbreviation}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
            <Link
              href="/"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px",
                background: "#557C55",
                color: "#FFF",
                fontSize: "10px",
                fontWeight: 900,
                borderRadius: "3px",
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              Organize Parliamentary Campaign
            </Link>
          </div>
        </div>
      )}

      {/* Parliamentary Constituencies Scrollable List */}
      <div
        style={{
          maxHeight: "360px",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          paddingRight: "4px",
        }}
      >
        {filteredPcs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#888", fontSize: "11px" }}>
            No parliamentary constituencies match the current filter.
          </div>
        ) : (
          filteredPcs.map((pc) => {
            const control = pcControlMap.get(pc.id);
            const party = control?.partyId
              ? campaign.politicalWorld.parties.find((p) => p.id === control.partyId)
              : null;
            const containedCount = (pcSegmentsMap.get(pc.id) ?? []).length;
            const isSelected = selectedPcId === pc.id;

            return (
              <div
                key={pc.id}
                onClick={() => setSelectedPcId(pc.id)}
                style={{
                  padding: "8px 10px",
                  background: isSelected ? "#E2EDDC" : "#FFFDF6",
                  border: `1.5px solid ${isSelected ? "#557C55" : "#D6B995"}`,
                  borderRadius: "3px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  transition: "background 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#557C55" }}>
                      #{pc.constituencyNumber}
                    </span>
                    <strong style={{ fontSize: "11px", color: "var(--ink)" }}>{pc.name}</strong>
                    {pc.reservation !== "general" && (
                      <span
                        style={{
                          fontSize: "8px",
                          fontWeight: 900,
                          padding: "1px 4px",
                          background: "#FCEADE",
                          borderRadius: "2px",
                          color: "#D96B42",
                          textTransform: "uppercase",
                        }}
                      >
                        {pc.reservation}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "9px", color: "#777", marginTop: "2px" }}>
                    <span>{containedCount} Assembly Segments</span>
                    {pc.districtNames.length > 0 && ` · Dist: ${pc.districtNames[0]}`}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {party ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 6px",
                        borderRadius: "2px",
                        fontSize: "9px",
                        fontWeight: 900,
                        backgroundColor: party.branding.primaryColor,
                        color: "#FFF",
                        textShadow: "0 1px 1px rgba(0,0,0,0.6)",
                      }}
                    >
                      {party.abbreviation}
                    </span>
                  ) : (
                    <span style={{ fontSize: "9px", color: "#999" }}>Vacant</span>
                  )}
                  <ChevronRight size={14} color="#888" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
