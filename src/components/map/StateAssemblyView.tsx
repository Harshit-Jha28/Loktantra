"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  Filter,
  UserCheck,
  Shield,
  Award,
  Vote,
  Landmark,
  Building2,
  Calendar,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Percent,
} from "lucide-react";
import type { CampaignState, PoliticalParty, ChiefMinisterProfile } from "@/types/campaign";
import type { RegionSeed } from "@/data/india2026";
import {
  getAssemblyConstituenciesByState,
  getLokSabhaConstituenciesByState,
} from "@/data/constituencies";
import type { AssemblyConstituency } from "@/types/constituency";

interface StateAssemblyViewProps {
  campaign: CampaignState;
  region: RegionSeed;
  selectedDistrict: string | null;
  onSelectDistrict: (district: string | null) => void;
  onBackToNational: () => void;
  onSwitchToParliamentaryView?: () => void;
}

export default function StateAssemblyView({
  campaign,
  region,
  selectedDistrict,
  onSelectDistrict,
  onBackToNational,
  onSwitchToParliamentaryView,
}: StateAssemblyViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [reservationFilter, setReservationFilter] = useState<string>("all");
  const [partyFilter, setPartyFilter] = useState<string>("all");
  const [selectedAcId, setSelectedAcId] = useState<string | null>(null);

  const stateGovernment = useMemo(() => {
    return campaign.politicalWorld.stateGovernments.find(
      (g) => g.stateId === region.id,
    );
  }, [campaign, region.id]);

  const rulingParty = useMemo(() => {
    if (!stateGovernment?.rulingPartyId) return undefined;
    return campaign.politicalWorld.parties.find(
      (p) => p.id === stateGovernment.rulingPartyId,
    );
  }, [campaign, stateGovernment]);

  const rulingAlliance = useMemo(() => {
    if (!stateGovernment?.rulingAllianceId) return undefined;
    return campaign.politicalWorld.alliances.find(
      (a) => a.id === stateGovernment.rulingAllianceId,
    );
  }, [campaign, stateGovernment]);

  // CM Profile from government state or generate fallback
  const cmProfile: ChiefMinisterProfile | null = useMemo(() => {
    if (stateGovernment?.chiefMinister) {
      return stateGovernment.chiefMinister;
    }
    if (stateGovernment?.chiefMinisterName && stateGovernment.rulingPartyId) {
      return {
        id: `cm-${region.id}-fallback`,
        name: stateGovernment.chiefMinisterName,
        stateId: region.id,
        partyId: stateGovernment.rulingPartyId,
        age: 56,
        experience: 72,
        approvalRating: 64,
        leaderArchetype: region.leaderArchetype ?? "charismatic_populist",
        coalitionManagementSkill: 70,
        tenureDays: 420,
        bio: `${stateGovernment.chiefMinisterName} currently serves as Chief Minister of ${region.name}.`,
      };
    }
    return null;
  }, [stateGovernment, region]);

  // Assembly Constituencies for this state
  const assemblyConstituencies = useMemo(() => {
    return getAssemblyConstituenciesByState(region.id);
  }, [region.id]);

  // Lok Sabha Constituencies for this state
  const lokSabhaConstituencies = useMemo(() => {
    return getLokSabhaConstituenciesByState(region.id);
  }, [region.id]);

  const pcMap = useMemo(() => {
    const map = new Map<string, string>();
    lokSabhaConstituencies.forEach((pc) => map.set(pc.id, pc.name));
    return map;
  }, [lokSabhaConstituencies]);

  // Constituency control mapping
  const controlMap = useMemo(() => {
    const map = new Map<string, { partyId: string | null; candidateId: string | null }>();
    campaign.politicalWorld.constituencyControl.forEach((c) => {
      if (c.stateId === region.id && c.constituencyType === "vidhan_sabha") {
        map.set(c.constituencyId, { partyId: c.winningPartyId, candidateId: c.candidateId });
      }
    });
    return map;
  }, [campaign, region.id]);

  // Unique parties present in this state
  const stateParties = useMemo(() => {
    const partyIds = new Set<string>();
    controlMap.forEach((v) => {
      if (v.partyId) partyIds.add(v.partyId);
    });
    return Array.from(partyIds)
      .map((id) => campaign.politicalWorld.parties.find((p) => p.id === id))
      .filter((p): p is PoliticalParty => p !== undefined);
  }, [controlMap, campaign]);

  // Districts available in this state
  const districts = useMemo(() => {
    const set = new Set<string>();
    assemblyConstituencies.forEach((ac) => {
      ac.districtNames.forEach((d) => set.add(d));
    });
    return Array.from(set).sort();
  }, [assemblyConstituencies]);

  // Filtered Assembly Constituencies
  const filteredAcs = useMemo(() => {
    return assemblyConstituencies.filter((ac) => {
      const matchesSearch =
        ac.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(ac.constituencyNumber).includes(searchQuery) ||
        (ac.lokSabhaConstituencyId &&
          (pcMap.get(ac.lokSabhaConstituencyId) || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const matchesReservation =
        reservationFilter === "all" ||
        ac.reservation.toLowerCase() === reservationFilter.toLowerCase();

      const control = controlMap.get(ac.id);
      const matchesParty =
        partyFilter === "all" || control?.partyId === partyFilter;

      const matchesDistrict =
        !selectedDistrict ||
        ac.districtNames.includes(selectedDistrict);

      return matchesSearch && matchesReservation && matchesParty && matchesDistrict;
    });
  }, [
    assemblyConstituencies,
    searchQuery,
    reservationFilter,
    partyFilter,
    selectedDistrict,
    controlMap,
    pcMap,
  ]);

  // Selected AC object
  const selectedAc = useMemo(() => {
    if (!selectedAcId) return null;
    return assemblyConstituencies.find((ac) => ac.id === selectedAcId) ?? null;
  }, [selectedAcId, assemblyConstituencies]);

  const selectedAcControl = useMemo(() => {
    if (!selectedAc) return null;
    return controlMap.get(selectedAc.id) ?? null;
  }, [selectedAc, controlMap]);

  const selectedAcParty = useMemo(() => {
    if (!selectedAcControl?.partyId) return null;
    return campaign.politicalWorld.parties.find((p) => p.id === selectedAcControl.partyId) ?? null;
  }, [selectedAcControl, campaign]);

  const hasDistrictOffice = useMemo(() => {
    if (!selectedAc || !selectedAc.districtNames.length) return false;
    const offices = campaign.organization.offices ?? [];
    return offices.some(
      (o) =>
        o.partyId === campaign.player.partyId &&
        o.stateId === region.id &&
        selectedAc.districtNames.some((d) => d.toLowerCase() === o.districtName.toLowerCase())
    );
  }, [selectedAc, campaign.organization.offices, campaign.player.partyId, region.id]);

  // Cabinet stability calculation & color
  const stability = stateGovernment?.cabinetStability ?? 70;
  const stabilityColor =
    stability >= 70 ? "#557C55" : stability >= 45 ? "#D97706" : "#DC2626";
  const stabilityLabel =
    stability >= 75
      ? "SOLID MAJORITY"
      : stability >= 55
      ? "STABLE COALITION"
      : stability >= 40
      ? "COALITION FRICTION"
      : "FRAGILE MINORITY";

  return (
    <div className="state-assembly-inspector" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
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

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span
            style={{
              fontSize: "9px",
              fontWeight: 900,
              padding: "3px 8px",
              background: "#FCEADE",
              border: "1px solid #D96B42",
              color: "#A8492C",
              borderRadius: "3px",
              textTransform: "uppercase",
            }}
          >
            VIDHAN SABHA LEVEL
          </span>
          {onSwitchToParliamentaryView && region.lokSabhaSeats > 0 && (
            <button
              type="button"
              onClick={onSwitchToParliamentaryView}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "3px 8px",
                fontSize: "9px",
                fontWeight: 800,
                background: "#E2EDDC",
                border: "1px solid #557C55",
                color: "#274E13",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              <Vote size={11} />
              LOK SABHA ({region.lokSabhaSeats} PCs)
            </button>
          )}
        </div>
      </div>

      {/* State Header Banner */}
      <div
        style={{
          padding: "12px",
          background: "#F8F1E3",
          border: "2px solid #8C5946",
          borderRadius: "4px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "var(--ink)", letterSpacing: "0.5px" }}>
              {region.name}
            </h2>
            <div style={{ fontSize: "10px", color: "#665", marginTop: "2px", textTransform: "uppercase" }}>
              CAPITAL: <strong>{region.capital}</strong> · TYPE: <strong>{region.kind.replace("_", " ")}</strong>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "18px", fontWeight: 900, color: "#8C5946" }}>
              {region.assemblySeats}
            </span>
            <div style={{ fontSize: "9px", fontWeight: 700, color: "#888", textTransform: "uppercase" }}>
              ASSEMBLY SEATS
            </div>
          </div>
        </div>

        {/* Government Type & Majority Status Badge */}
        <div style={{ marginTop: "10px", display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px" }}>
          <span
            style={{
              padding: "2px 7px",
              background: "#FFFDF6",
              border: "1px solid #D6B995",
              borderRadius: "3px",
              fontWeight: 700,
            }}
          >
            Ruling: <strong>{rulingParty?.abbreviation ?? "None"}</strong>
            {rulingAlliance ? ` (${rulingAlliance.abbreviation})` : ""}
          </span>
          <span
            style={{
              padding: "2px 7px",
              background: "#FFFDF6",
              border: "1px solid #D6B995",
              borderRadius: "3px",
              fontWeight: 700,
              textTransform: "capitalize",
            }}
          >
            Type: <strong>{stateGovernment?.governmentType.replace("_", " ") ?? "Unknown"}</strong>
          </span>
          <span
            style={{
              padding: "2px 7px",
              background: "#FFFDF6",
              border: "1px solid #D6B995",
              borderRadius: "3px",
              fontWeight: 700,
            }}
          >
            Majority Mark: <strong>{Math.floor(region.assemblySeats / 2) + 1}</strong>
          </span>
        </div>
      </div>

      {/* Chief Minister Dossier Card */}
      {cmProfile && (
        <div
          style={{
            padding: "12px",
            background: "#FFFDF6",
            border: "2px solid #514235",
            borderRadius: "4px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "1px",
                color: "#8C5946",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <UserCheck size={12} />
              CHIEF MINISTER PROFILE
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: 800,
                color: "#777",
              }}
            >
              {cmProfile.tenureDays} DAYS IN OFFICE
            </span>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "8px", alignItems: "center" }}>
            {/* CM Emblem / Avatar */}
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "50%",
                background: rulingParty?.branding.primaryColor ?? "#8C5946",
                color: "#FFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
                fontSize: "18px",
                border: "2px solid #34495E",
                flexShrink: 0,
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
              }}
            >
              {cmProfile.name.charAt(0)}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 900, fontSize: "14px", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cmProfile.name}
              </div>
              <div style={{ fontSize: "10px", color: "#666", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Age: <strong>{cmProfile.age}</strong></span>
                <span>·</span>
                <span style={{ textTransform: "capitalize", fontWeight: 700, color: "#8C5946" }}>
                  {cmProfile.leaderArchetype.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* CM Attributes Meters */}
          <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {/* Approval Rating */}
            <div style={{ background: "#F8F1E3", padding: "6px 8px", borderRadius: "3px", border: "1px solid #E2D3B8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 800 }}>
                <span>PUBLIC APPROVAL</span>
                <span style={{ color: "#557C55" }}>{cmProfile.approvalRating}%</span>
              </div>
              <div style={{ marginTop: "4px", height: "5px", background: "#E8D3AC", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${cmProfile.approvalRating}%`, height: "100%", background: "#557C55" }} />
              </div>
            </div>

            {/* Coalition Skill */}
            <div style={{ background: "#F8F1E3", padding: "6px 8px", borderRadius: "3px", border: "1px solid #E2D3B8" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 800 }}>
                <span>COALITION SKILL</span>
                <span style={{ color: "#2563EB" }}>{cmProfile.coalitionManagementSkill}%</span>
              </div>
              <div style={{ marginTop: "4px", height: "5px", background: "#E8D3AC", borderRadius: "2px", overflow: "hidden" }}>
                <div style={{ width: `${cmProfile.coalitionManagementSkill}%`, height: "100%", background: "#2563EB" }} />
              </div>
            </div>
          </div>

          {/* Cabinet Stability Meter */}
          <div style={{ marginTop: "8px", background: "#F8F1E3", padding: "8px", borderRadius: "3px", border: "1px solid #E2D3B8" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10px", fontWeight: 900 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <Shield size={12} color={stabilityColor} />
                CABINET STABILITY
              </span>
              <span style={{ color: stabilityColor, fontWeight: 900 }}>
                {stabilityLabel} ({stability}%)
              </span>
            </div>
            <div style={{ marginTop: "4px", height: "6px", background: "#E8D3AC", borderRadius: "3px", overflow: "hidden" }}>
              <div style={{ width: `${stability}%`, height: "100%", background: stabilityColor }} />
            </div>
          </div>
        </div>
      )}

      {/* Assembly Constituency Directory Controls */}
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
            CONSTITUENCY DIRECTORY ({filteredAcs.length} OF {assemblyConstituencies.length})
          </span>
          {selectedDistrict && (
            <button
              type="button"
              onClick={() => onSelectDistrict(null)}
              style={{
                fontSize: "9px",
                background: "#E8D3AC",
                border: "1px solid var(--ink)",
                borderRadius: "2px",
                padding: "2px 6px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Clear District: {selectedDistrict} ✕
            </button>
          )}
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "8px", top: "8px", color: "#888" }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search AC name, #, or Lok Sabha PC..."
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

        {/* Filters: Reservation & Party */}
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
            <option value="sangha">Sangha (Monastic)</option>
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
            {stateParties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.abbreviation} ({p.name})
              </option>
            ))}
          </select>
        </div>

        {/* District Filter if multiple districts */}
        {districts.length > 1 && (
          <select
            value={selectedDistrict ?? "all"}
            onChange={(e) => onSelectDistrict(e.target.value === "all" ? null : e.target.value)}
            style={{
              width: "100%",
              padding: "4px 6px",
              fontSize: "10px",
              borderRadius: "3px",
              border: "1px solid #C8B99D",
              background: "#FFFDF6",
              fontWeight: 700,
            }}
          >
            <option value="all">District: All ({districts.length} districts)</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Selected Constituency Field Intelligence Modal / Box */}
      {selectedAc && (
        <div
          style={{
            padding: "12px",
            background: "#FFFDF6",
            border: "2px solid #D96B42",
            borderRadius: "4px",
            boxShadow: "0 2px 6px rgba(217,107,66,0.15)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#D96B42" }}>
                SELECTED CONSTITUENCY
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: 900, color: "var(--ink)" }}>
                #{selectedAc.constituencyNumber} {selectedAc.name}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAcId(null)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: "12px",
                color: "#888",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px" }}>
            <span
              style={{
                padding: "2px 6px",
                borderRadius: "2px",
                background: selectedAc.reservation === "general" ? "#E8D3AC" : "#FCEADE",
                color: selectedAc.reservation === "general" ? "#514235" : "#D96B42",
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              {selectedAc.reservation === "general" ? "General Seat" : `${selectedAc.reservation.toUpperCase()} Reserved`}
            </span>

            {selectedAc.districtNames.length > 0 && (
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "2px",
                  background: "#F8F1E3",
                  border: "1px solid #D6B995",
                  fontWeight: 700,
                }}
              >
                District: {selectedAc.districtNames.join(", ")}
              </span>
            )}

            {hasDistrictOffice && (
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "2px",
                  background: "#E2EDDC",
                  border: "1px solid #557C55",
                  color: "#274E13",
                  fontWeight: 800,
                  fontSize: "9px",
                }}
              >
                ★ Party District Headquarters Active
              </span>
            )}

            {selectedAc.lokSabhaConstituencyId && (
              <span
                style={{
                  padding: "2px 6px",
                  borderRadius: "2px",
                  background: "#F8F1E3",
                  border: "1px solid #D6B995",
                  fontWeight: 700,
                }}
              >
                Lok Sabha PC: {pcMap.get(selectedAc.lokSabhaConstituencyId) ?? selectedAc.lokSabhaConstituencyId}
              </span>
            )}
          </div>

          {/* Incumbent MLA details */}
          <div style={{ marginTop: "10px", padding: "8px", background: "#F8F1E3", borderRadius: "3px", border: "1px solid #D6B995" }}>
            <div style={{ fontSize: "9px", fontWeight: 900, color: "#8C5946", textTransform: "uppercase" }}>
              INCUMBENT LEGISLATIVE STATUS
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "2px",
                    backgroundColor: selectedAcParty?.branding.primaryColor ?? "#8C5946",
                    display: "inline-block",
                  }}
                />
                <strong style={{ fontSize: "11px" }}>
                  {selectedAcParty ? `${selectedAcParty.abbreviation} (${selectedAcParty.name})` : "Uncontested / Independent"}
                </strong>
              </div>
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#557C55" }}>
                ELECTED MLA
              </span>
            </div>
          </div>

          <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
            <Link
              href="/"
              style={{
                flex: 1,
                textAlign: "center",
                padding: "6px",
                background: "#D96B42",
                color: "#FFF",
                fontSize: "10px",
                fontWeight: 900,
                borderRadius: "3px",
                textDecoration: "none",
                textTransform: "uppercase",
              }}
            >
              Organize Rally in Seat
            </Link>
          </div>
        </div>
      )}

      {/* Assembly Constituencies Scrollable List */}
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
        {filteredAcs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px", color: "#888", fontSize: "11px" }}>
            No assembly constituencies match the current filter.
          </div>
        ) : (
          filteredAcs.map((ac) => {
            const control = controlMap.get(ac.id);
            const party = control?.partyId
              ? campaign.politicalWorld.parties.find((p) => p.id === control.partyId)
              : null;
            const isSelected = selectedAcId === ac.id;

            return (
              <div
                key={ac.id}
                onClick={() => setSelectedAcId(ac.id)}
                style={{
                  padding: "8px 10px",
                  background: isSelected ? "#FCEADE" : "#FFFDF6",
                  border: `1.5px solid ${isSelected ? "#D96B42" : "#D6B995"}`,
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
                    <span style={{ fontSize: "10px", fontWeight: 800, color: "#8C5946" }}>
                      #{ac.constituencyNumber}
                    </span>
                    <strong style={{ fontSize: "11px", color: "var(--ink)" }}>{ac.name}</strong>
                    {ac.reservation !== "general" && (
                      <span
                        style={{
                          fontSize: "8px",
                          fontWeight: 900,
                          padding: "1px 4px",
                          background: "#E8D3AC",
                          borderRadius: "2px",
                          color: "#514235",
                          textTransform: "uppercase",
                        }}
                      >
                        {ac.reservation}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "9px", color: "#777", marginTop: "2px" }}>
                    {ac.lokSabhaConstituencyId && (
                      <span>PC: {pcMap.get(ac.lokSabhaConstituencyId) ?? ac.lokSabhaConstituencyId}</span>
                    )}
                    {ac.districtNames.length > 0 && ` · Dist: ${ac.districtNames[0]}`}
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
