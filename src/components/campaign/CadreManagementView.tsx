"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Building,
  Shield,
  Award,
  ArrowUpRight,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus,
  Sparkles,
  MapPin,
  ChevronRight,
  TrendingUp,
  X,
} from "lucide-react";
import type { CampaignState, PartyMember, CadreTier } from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import {
  CADRE_TIER_DATA,
  getCadreTierInfo,
  canPromoteCadre,
  promoteCadre,
  getCadreStatistics,
} from "@/engine/party/cadreSystem";
import DistrictOfficeModal from "./DistrictOfficeModal";

interface CadreManagementViewProps {
  campaign: CampaignState;
  onUpdateCampaign: (updatedCampaign: CampaignState, message?: string) => void;
}

export default function CadreManagementView({
  campaign,
  onUpdateCampaign,
}: CadreManagementViewProps) {
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [districtFilter, setDistrictFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState<boolean>(false);
  const [promotingMember, setPromotingMember] = useState<PartyMember | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const playerPartyId = campaign.player.partyId;
  const treasury = campaign.economy.treasuries.find((t) => t.partyId === playerPartyId);
  const treasuryBalance = treasury?.balance ?? 0;

  // Filter cadre belonging to player's party
  const partyMembers = useMemo(() => {
    return campaign.organization.members.filter((m) => m.partyId === playerPartyId);
  }, [campaign.organization.members, playerPartyId]);

  // Statistics
  const stats = useMemo(() => {
    return getCadreStatistics(campaign);
  }, [campaign]);

  // Unique states and districts represented
  const statesWithMembers = useMemo(() => {
    const set = new Set<string>();
    partyMembers.forEach((m) => {
      if (m.stateId) set.add(m.stateId);
    });
    return Array.from(set).sort();
  }, [partyMembers]);

  const districtsInSelectedState = useMemo(() => {
    if (stateFilter === "all") return [];
    const set = new Set<string>();
    partyMembers
      .filter((m) => m.stateId === stateFilter && m.districtName)
      .forEach((m) => set.add(m.districtName!));
    return Array.from(set).sort();
  }, [partyMembers, stateFilter]);

  // Filtered members roster
  const filteredMembers = useMemo(() => {
    return partyMembers.filter((m) => {
      const currentTier = m.tier ?? "volunteer";
      const matchesTier = tierFilter === "all" || currentTier === tierFilter;
      const matchesState = stateFilter === "all" || m.stateId === stateFilter;
      const matchesDistrict = districtFilter === "all" || m.districtName === districtFilter;
      const matchesSearch =
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.districtName && m.districtName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesTier && matchesState && matchesDistrict && matchesSearch;
    });
  }, [partyMembers, tierFilter, stateFilter, districtFilter, searchQuery]);

  function handleExecutePromotion(member: PartyMember) {
    try {
      setError("");
      setMessage("");
      const result = promoteCadre(campaign, member.id);
      onUpdateCampaign(result.campaign, result.resultMessage);
      setMessage(result.resultMessage);
      setPromotingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promotion failed.");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Banner & Title */}
      <div
        style={{
          padding: "16px",
          background: "#F8F1E3",
          border: "2px solid #8C5946",
          borderRadius: "4px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div>
          <span style={{ fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1px", color: "#8C5946" }}>
            INTERNAL PARTY ORGANIZATION
          </span>
          <h2 style={{ margin: "2px 0 0", fontSize: "20px", fontFamily: "Georgia, serif", color: "var(--ink)" }}>
            Cadre Directory &amp; Leadership Ladder
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--ink-soft)" }}>
            Develop volunteers through the 5-tier progression ladder from grassroots workers to district organizers and state leaders.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "10px", fontWeight: 900, color: "#777", textTransform: "uppercase" }}>TREASURY BALANCE</span>
            <strong style={{ display: "block", fontSize: "16px", color: "#557C55" }}>
              ₹{treasuryBalance.toLocaleString("en-IN")}
            </strong>
          </div>

          <button
            type="button"
            onClick={() => setIsOfficeModalOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 14px",
              background: "#D96B42",
              color: "#FFF",
              fontWeight: 900,
              fontSize: "11px",
              border: "1.5px solid #514235",
              borderRadius: "4px",
              cursor: "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            <Building size={15} />
            BUILD DISTRICT OFFICE
          </button>
        </div>
      </div>

      {/* Message Notifications */}
      {message && (
        <div
          style={{
            padding: "10px 14px",
            background: "#E2EDDC",
            border: "1.5px solid #557C55",
            color: "#274E13",
            fontSize: "12px",
            fontWeight: 700,
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "#FCEADE",
            border: "1.5px solid #D96B42",
            color: "#A8492C",
            fontSize: "12px",
            fontWeight: 700,
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 5-Tier Overview Stat Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "10px",
        }}
      >
        {/* Tier 1: Volunteers */}
        <div style={{ background: "#FFFDF6", padding: "10px 12px", border: "1.5px solid #D6B995", borderRadius: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#6B7280" }}>
              TIER 1: VOLUNTEERS
            </span>
            <Users size={14} color="#6B7280" />
          </div>
          <strong style={{ display: "block", fontSize: "20px", marginTop: "4px", color: "var(--ink)" }}>
            {stats.byTier.volunteer}
          </strong>
          <small style={{ fontSize: "9px", color: "#888" }}>Grassroots supporters</small>
        </div>

        {/* Tier 2: Workers */}
        <div style={{ background: "#FFFDF6", padding: "10px 12px", border: "1.5px solid #D6B995", borderRadius: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#2563EB" }}>
              TIER 2: WORKERS
            </span>
            <Users size={14} color="#2563EB" />
          </div>
          <strong style={{ display: "block", fontSize: "20px", marginTop: "4px", color: "var(--ink)" }}>
            {stats.byTier.worker}
          </strong>
          <small style={{ fontSize: "9px", color: "#888" }}>Active canvassers</small>
        </div>

        {/* Tier 3: Booth Coordinators */}
        <div style={{ background: "#FFFDF6", padding: "10px 12px", border: "1.5px solid #D6B995", borderRadius: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#D97706" }}>
              TIER 3: COORDINATORS
            </span>
            <Shield size={14} color="#D97706" />
          </div>
          <strong style={{ display: "block", fontSize: "20px", marginTop: "4px", color: "var(--ink)" }}>
            {stats.byTier.booth_coordinator}
          </strong>
          <small style={{ fontSize: "9px", color: "#888" }}>Polling booth operators</small>
        </div>

        {/* Tier 4: District Organizers */}
        <div style={{ background: "#FFFDF6", padding: "10px 12px", border: "1.5px solid #D6B995", borderRadius: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#7C3AED" }}>
              TIER 4: ORGANIZERS
            </span>
            <Building size={14} color="#7C3AED" />
          </div>
          <strong style={{ display: "block", fontSize: "20px", marginTop: "4px", color: "var(--ink)" }}>
            {stats.byTier.district_organizer}
          </strong>
          <small style={{ fontSize: "9px", color: "#888" }}>District managers</small>
        </div>

        {/* Tier 5: State Leaders */}
        <div style={{ background: "#FFFDF6", padding: "10px 12px", border: "1.5px solid #D6B995", borderRadius: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#DC2626" }}>
              TIER 5: LEADERS
            </span>
            <Award size={14} color="#DC2626" />
          </div>
          <strong style={{ display: "block", fontSize: "20px", marginTop: "4px", color: "var(--ink)" }}>
            {stats.byTier.state_leader}
          </strong>
          <small style={{ fontSize: "9px", color: "#888" }}>Senior leadership</small>
        </div>

        {/* District Offices */}
        <div style={{ background: "#F2E5CD", padding: "10px 12px", border: "1.5px solid #8C5946", borderRadius: "4px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "9px", fontWeight: 900, textTransform: "uppercase", color: "#8C5946" }}>
              DISTRICT OFFICES
            </span>
            <Building size={14} color="#8C5946" />
          </div>
          <strong style={{ display: "block", fontSize: "20px", marginTop: "4px", color: "#8C5946" }}>
            {stats.totalOffices}
          </strong>
          <small style={{ fontSize: "9px", color: "#665" }}>Permanent headquarters</small>
        </div>
      </div>

      {/* Directory Controls & Filters */}
      <div
        style={{
          padding: "12px 14px",
          background: "#F8F1E3",
          border: "1.5px solid #D6B995",
          borderRadius: "4px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          {/* Tier Filter Tabs */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {[
              { id: "all", label: "All Cadre" },
              { id: "volunteer", label: "Volunteers" },
              { id: "worker", label: "Workers" },
              { id: "booth_coordinator", label: "Coordinators" },
              { id: "district_organizer", label: "Organizers" },
              { id: "state_leader", label: "State Leaders" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTierFilter(t.id)}
                style={{
                  padding: "4px 8px",
                  fontSize: "10px",
                  fontWeight: 800,
                  borderRadius: "3px",
                  border: "1px solid #8C5946",
                  background: tierFilter === t.id ? "#D96B42" : "#FFFDF6",
                  color: tierFilter === t.id ? "#FFF" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <span style={{ fontSize: "10px", fontWeight: 800, color: "#665" }}>
            Showing {filteredMembers.length} of {partyMembers.length} Cadre
          </span>
        </div>

        {/* Search & Location Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "8px" }}>
          {/* Search Box */}
          <div style={{ position: "relative" }}>
            <Search size={14} style={{ position: "absolute", left: "8px", top: "8px", color: "#888" }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cadre by name, role, or district..."
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

          {/* State Filter */}
          <select
            value={stateFilter}
            onChange={(e) => {
              setStateFilter(e.target.value);
              setDistrictFilter("all");
            }}
            style={{
              padding: "6px",
              fontSize: "11px",
              borderRadius: "3px",
              border: "1px solid #C8B99D",
              background: "#FFFDF6",
              fontWeight: 700,
            }}
          >
            <option value="all">All States ({statesWithMembers.length})</option>
            {statesWithMembers.map((s) => {
              const reg = INDIA_REGIONS.find((r) => r.id === s);
              return (
                <option key={s} value={s}>
                  {reg?.name ?? s}
                </option>
              );
            })}
          </select>

          {/* District Filter */}
          <select
            value={districtFilter}
            disabled={stateFilter === "all" || districtsInSelectedState.length === 0}
            onChange={(e) => setDistrictFilter(e.target.value)}
            style={{
              padding: "6px",
              fontSize: "11px",
              borderRadius: "3px",
              border: "1px solid #C8B99D",
              background: "#FFFDF6",
              fontWeight: 700,
            }}
          >
            <option value="all">
              {stateFilter === "all" ? "Select State First" : `All Districts (${districtsInSelectedState.length})`}
            </option>
            {districtsInSelectedState.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cadre Roster Grid */}
      {filteredMembers.length === 0 ? (
        <div
          style={{
            padding: "40px",
            textAlign: "center",
            background: "#FFFDF6",
            border: "1.5px dashed #D6B995",
            borderRadius: "4px",
          }}
        >
          <Users size={32} color="#C8B99D" style={{ margin: "0 auto 8px" }} />
          <h3 style={{ margin: 0, fontSize: "14px", color: "var(--ink)" }}>No Cadre Found</h3>
          <p style={{ margin: "4px 0 12px", fontSize: "11px", color: "#777" }}>
            Conduct grassroots membership drives or inaugurate district party offices to recruit new dedicated cadre.
          </p>
          <button
            type="button"
            onClick={() => setIsOfficeModalOpen(true)}
            style={{
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: 800,
              background: "#D96B42",
              color: "#FFF",
              border: "1px solid #514235",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            Open First District Office
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "12px",
          }}
        >
          {filteredMembers.map((member) => {
            const currentTier = member.tier ?? "volunteer";
            const tierInfo = getCadreTierInfo(currentTier);
            const promoCheck = canPromoteCadre(member, treasuryBalance);
            const currentExp = member.experience ?? tierInfo.baseExp;
            const expPercent = Math.min(100, Math.round((currentExp / (tierInfo.requiredExp || 100)) * 100));

            return (
              <div
                key={member.id}
                style={{
                  padding: "12px",
                  background: "#FFFDF6",
                  border: "1.5px solid #D6B995",
                  borderRadius: "4px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                }}
              >
                <div>
                  {/* Top row: Avatar & Tier Badge */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          background: tierInfo.badgeColor,
                          color: "#FFF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 900,
                          fontSize: "13px",
                          border: "1.5px solid #34495E",
                        }}
                      >
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{member.name}</strong>
                        <div style={{ fontSize: "10px", color: "#777", textTransform: "capitalize" }}>
                          {member.role}
                        </div>
                      </div>
                    </div>

                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "2px",
                        fontSize: "9px",
                        fontWeight: 900,
                        textTransform: "uppercase",
                        backgroundColor: `${tierInfo.badgeColor}15`,
                        color: tierInfo.badgeColor,
                        border: `1px solid ${tierInfo.badgeColor}`,
                      }}
                    >
                      {currentTier.replace(/_/g, " ")}
                    </span>
                  </div>

                  {/* Location Station */}
                  <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", color: "#665" }}>
                    <MapPin size={12} color="#8C5946" />
                    <span>
                      {member.districtName ? `${member.districtName}, ` : ""}
                      {INDIA_REGIONS.find((r) => r.id === member.stateId)?.name ?? member.stateId ?? "National"}
                    </span>
                  </div>

                  {/* Experience & Advancement Bar */}
                  <div style={{ marginTop: "10px", background: "#F8F1E3", padding: "6px 8px", borderRadius: "3px", border: "1px solid #E2D3B8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "9px", fontWeight: 800 }}>
                      <span>EXPERIENCE: {currentExp} PTS</span>
                      {tierInfo.nextTier ? (
                        <span style={{ color: currentExp >= tierInfo.requiredExp ? "#557C55" : "#8C5946" }}>
                          {currentExp >= tierInfo.requiredExp ? "Eligible" : `Need ${tierInfo.requiredExp} PTS`}
                        </span>
                      ) : (
                        <span style={{ color: "#DC2626" }}>Max Tier</span>
                      )}
                    </div>
                    {tierInfo.nextTier && (
                      <div style={{ marginTop: "4px", height: "4px", background: "#E8D3AC", borderRadius: "2px", overflow: "hidden" }}>
                        <div
                          style={{
                            width: `${expPercent}%`,
                            height: "100%",
                            background: currentExp >= tierInfo.requiredExp ? "#557C55" : "#D97706",
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Attributes: Loyalty & Influence */}
                  <div style={{ marginTop: "8px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#777" }}>Loyalty:</span>
                      <strong style={{ color: "#557C55" }}>{member.loyalty}%</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "#777" }}>Influence:</span>
                      <strong style={{ color: "#2563EB" }}>{member.influence}</strong>
                    </div>
                  </div>
                </div>

                {/* Promotion Action Button */}
                {tierInfo.nextTier ? (
                  <button
                    type="button"
                    disabled={!promoCheck.canPromote}
                    onClick={() => setPromotingMember(member)}
                    title={promoCheck.reason}
                    style={{
                      marginTop: "12px",
                      padding: "6px 10px",
                      fontSize: "10px",
                      fontWeight: 900,
                      borderRadius: "3px",
                      cursor: promoCheck.canPromote ? "pointer" : "not-allowed",
                      background: promoCheck.canPromote ? "#557C55" : "#E5E7EB",
                      color: promoCheck.canPromote ? "#FFF" : "#9CA3AF",
                      border: "1px solid #34495E",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                    }}
                  >
                    <ArrowUpRight size={13} />
                    {promoCheck.canPromote
                      ? `PROMOTE TO ${tierInfo.nextTier.toUpperCase().replace(/_/g, " ")} (₹${tierInfo.promotionCost.toLocaleString("en-IN")})`
                      : promoCheck.reason}
                  </button>
                ) : (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "6px",
                      textAlign: "center",
                      fontSize: "10px",
                      fontWeight: 800,
                      color: "#DC2626",
                      background: "#FCEADE",
                      borderRadius: "3px",
                      border: "1px solid #D96B42",
                    }}
                  >
                    Senior Political Leader
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Established District Offices Section */}
      {stats.offices.length > 0 && (
        <div
          style={{
            marginTop: "14px",
            padding: "16px",
            background: "#FFFDF6",
            border: "2px solid #8C5946",
            borderRadius: "4px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#8C5946", textTransform: "uppercase" }}>
                NETWORK REACH
              </span>
              <h3 style={{ margin: "2px 0 0", fontSize: "16px", fontFamily: "Georgia, serif", color: "var(--ink)" }}>
                Established District Headquarters ({stats.offices.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOfficeModalOpen(true)}
              style={{
                fontSize: "10px",
                fontWeight: 800,
                padding: "4px 8px",
                background: "#E8D3AC",
                border: "1px solid #514235",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              + Add Another District Office
            </button>
          </div>

          <div
            style={{
              marginTop: "12px",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: "10px",
            }}
          >
            {stats.offices.map((office) => {
              const stateObj = INDIA_REGIONS.find((r) => r.id === office.stateId);
              const cadreInThisOffice = partyMembers.filter(
                (m) =>
                  m.stateId === office.stateId &&
                  m.districtName?.toLowerCase() === office.districtName.toLowerCase(),
              );

              return (
                <div
                  key={office.id}
                  style={{
                    padding: "10px 12px",
                    background: "#F8F1E3",
                    border: "1px solid #D6B995",
                    borderRadius: "3px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "12px", color: "var(--ink)" }}>
                      {office.districtName}
                    </strong>
                    <div style={{ fontSize: "10px", color: "#665" }}>
                      {stateObj?.name ?? office.stateId} · {office.level === 2 ? "Headquarters" : "Branch Office"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "#557C55" }}>
                      {cadreInThisOffice.length} Cadre
                    </span>
                    <small style={{ display: "block", fontSize: "8px", color: "#888" }}>
                      Since {office.establishedDate}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Promotion Confirmation Modal */}
      {promotingMember && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(35, 25, 20, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "16px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              background: "#FFFDF6",
              border: "3px solid #514235",
              borderRadius: "6px",
              padding: "18px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "15px", fontFamily: "Georgia, serif" }}>
                Confirm Cadre Promotion
              </strong>
              <button
                type="button"
                onClick={() => setPromotingMember(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginTop: "12px", padding: "10px", background: "#F8F1E3", borderRadius: "4px" }}>
              <div style={{ fontSize: "11px", color: "#666" }}>Promoting:</div>
              <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{promotingMember.name}</strong>
              <div style={{ fontSize: "10px", marginTop: "2px", color: "#8C5946" }}>
                Current Role: {promotingMember.role}
              </div>
            </div>

            {(() => {
              const currentTier = promotingMember.tier ?? "volunteer";
              const tierInfo = getCadreTierInfo(currentTier);
              const nextTierInfo = tierInfo.nextTier ? getCadreTierInfo(tierInfo.nextTier) : null;
              if (!nextTierInfo) return null;

              return (
                <div style={{ marginTop: "12px", fontSize: "11px", lineHeight: 1.6 }}>
                  <p style={{ margin: "0 0 6px" }}>
                    Advancing to: <strong style={{ color: nextTierInfo.badgeColor }}>{nextTierInfo.title}</strong>
                  </p>
                  <p style={{ margin: "0 0 6px" }}>
                    Promotion Investment: <strong>₹{tierInfo.promotionCost.toLocaleString("en-IN")}</strong>
                  </p>
                  <p style={{ margin: "0 0 6px", color: "#557C55", fontWeight: 700 }}>
                    ✦ Deliverables: {nextTierInfo.benefits}
                  </p>
                  {tierInfo.nextTier === "state_leader" && (
                    <div
                      style={{
                        padding: "8px",
                        background: "#FCEADE",
                        border: "1px solid #D96B42",
                        borderRadius: "3px",
                        color: "#A8492C",
                        fontWeight: 700,
                        fontSize: "10px",
                        marginTop: "8px",
                      }}
                    >
                      ★ {promotingMember.name} will formally enter your party senior leadership committee and can be nominated for elections!
                    </div>
                  )}
                </div>
              );
            })()}

            <div style={{ marginTop: "16px", display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                type="button"
                onClick={() => setPromotingMember(null)}
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 800,
                  background: "#E8D3AC",
                  border: "1px solid #514235",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={() => handleExecutePromotion(promotingMember)}
                style={{
                  padding: "6px 16px",
                  fontSize: "11px",
                  fontWeight: 900,
                  background: "#557C55",
                  color: "#FFF",
                  border: "1px solid #34495E",
                  borderRadius: "3px",
                  cursor: "pointer",
                }}
              >
                CONFIRM PROMOTION
              </button>
            </div>
          </div>
        </div>
      )}

      {/* District Office Modal */}
      <DistrictOfficeModal
        campaign={campaign}
        isOpen={isOfficeModalOpen}
        onClose={() => setIsOfficeModalOpen(false)}
        onOfficeBuilt={(updated, msg) => {
          onUpdateCampaign(updated, msg);
          setMessage(msg);
        }}
        initialStateId={stateFilter !== "all" ? stateFilter : undefined}
      />
    </div>
  );
}
