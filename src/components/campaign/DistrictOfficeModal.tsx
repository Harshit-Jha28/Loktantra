"use client";

import React, { useState, useMemo } from "react";
import {
  Building,
  MapPin,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  Banknote,
  Sparkles,
} from "lucide-react";
import type { CampaignState } from "@/types/campaign";
import { INDIA_REGIONS } from "@/data/india2026";
import { getDistrictsForState } from "@/data/indiaDistricts";
import { buildDistrictOffice } from "@/engine/party/cadreSystem";

interface DistrictOfficeModalProps {
  campaign: CampaignState;
  isOpen: boolean;
  onClose: () => void;
  onOfficeBuilt: (updatedCampaign: CampaignState, message: string) => void;
  initialStateId?: string;
}

export default function DistrictOfficeModal({
  campaign,
  isOpen,
  onClose,
  onOfficeBuilt,
  initialStateId,
}: DistrictOfficeModalProps) {
  const [selectedStateId, setSelectedStateId] = useState<string>(
    initialStateId ?? campaign.player.foundingStateId,
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>("");
  const [error, setError] = useState<string>("");

  const playerPartyId = campaign.player.partyId;
  const playerParty = campaign.politicalWorld.parties.find((p) => p.id === playerPartyId);
  const treasury = campaign.economy.treasuries.find((t) => t.partyId === playerPartyId);
  const treasuryBalance = treasury?.balance ?? 0;
  const officeCost = 45000;
  const canAfford = treasuryBalance >= officeCost;

  // Selected state region info
  const selectedRegion = useMemo(() => {
    return INDIA_REGIONS.find((r) => r.id === selectedStateId);
  }, [selectedStateId]);

  // Available districts for the selected state
  const availableDistricts = useMemo(() => {
    const dists = getDistrictsForState(selectedStateId);
    return dists.length > 0 ? dists : ["Central District", "North District", "South District"];
  }, [selectedStateId]);

  // Set default district when state changes
  React.useEffect(() => {
    if (availableDistricts.length > 0) {
      setSelectedDistrict(availableDistricts[0]);
    }
  }, [availableDistricts]);

  // Check if an office already exists in this district
  const existingOffices = campaign.organization.offices ?? [];
  const existingOffice = useMemo(() => {
    return existingOffices.find(
      (o) =>
        o.partyId === playerPartyId &&
        o.stateId === selectedStateId &&
        o.districtName.toLowerCase() === selectedDistrict.toLowerCase(),
    );
  }, [existingOffices, playerPartyId, selectedStateId, selectedDistrict]);

  // Existing cadre in this district
  const cadreInDistrict = useMemo(() => {
    return campaign.organization.members.filter(
      (m) =>
        m.partyId === playerPartyId &&
        m.stateId === selectedStateId &&
        m.districtName?.toLowerCase() === selectedDistrict.toLowerCase(),
    );
  }, [campaign.organization.members, playerPartyId, selectedStateId, selectedDistrict]);

  if (!isOpen) return null;

  function handleConfirmBuild() {
    if (!canAfford) {
      setError("Insufficient party treasury balance.");
      return;
    }
    if (existingOffice) {
      setError(`A district office already operates in ${selectedDistrict}.`);
      return;
    }

    try {
      setError("");
      const result = buildDistrictOffice(campaign, selectedStateId, selectedDistrict);
      onOfficeBuilt(result.campaign, result.resultMessage);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build district office.");
    }
  }

  return (
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
          maxWidth: "560px",
          background: "#FFFDF6",
          border: "3px solid #514235",
          borderRadius: "6px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "14px 18px",
            background: "#F2E5CD",
            borderBottom: "2px solid #514235",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Building size={20} color="#8C5946" />
            <div>
              <strong style={{ fontSize: "16px", fontFamily: "Georgia, serif", color: "var(--ink)" }}>
                Inaugurate District Party Office
              </strong>
              <div style={{ fontSize: "10px", color: "#665", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Select any Indian state and district to establish local headquarters
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#665",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {error && (
            <div
              style={{
                padding: "8px 12px",
                background: "#FCEADE",
                border: "1.5px solid #D96B42",
                color: "#A8492C",
                fontSize: "11px",
                fontWeight: 700,
                borderRadius: "3px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* State & District Selectors */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "4px", color: "var(--ink)" }}>
                1. SELECT STATE / UT
              </label>
              <select
                value={selectedStateId}
                onChange={(e) => setSelectedStateId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  border: "1.5px solid #8C5946",
                  background: "#FFF",
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                {INDIA_REGIONS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.kind === "union_territory" ? "UT" : `${r.assemblySeats} ACs`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 900, marginBottom: "4px", color: "var(--ink)" }}>
                2. SELECT DISTRICT
              </label>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  border: "1.5px solid #8C5946",
                  background: "#FFF",
                  fontWeight: 700,
                  color: "var(--ink)",
                }}
              >
                {availableDistricts.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* District Status Card */}
          <div
            style={{
              padding: "12px 14px",
              background: "#F8F1E3",
              border: "1.5px solid #D6B995",
              borderRadius: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <span style={{ fontSize: "9px", fontWeight: 900, color: "#8C5946", textTransform: "uppercase" }}>
                  DISTRICT FIELD INTELLIGENCE
                </span>
                <h4 style={{ margin: "2px 0 0", fontSize: "15px", fontWeight: 900, color: "var(--ink)" }}>
                  {selectedDistrict}, {selectedRegion?.name}
                </h4>
              </div>

              <span
                style={{
                  padding: "3px 8px",
                  borderRadius: "3px",
                  fontSize: "10px",
                  fontWeight: 900,
                  textTransform: "uppercase",
                  background: existingOffice ? "#FCEADE" : "#E2EDDC",
                  color: existingOffice ? "#D96B42" : "#557C55",
                  border: `1px solid ${existingOffice ? "#D96B42" : "#557C55"}`,
                }}
              >
                {existingOffice ? "OFFICE ALREADY ACTIVE" : "NO ESTABLISHED OFFICE"}
              </span>
            </div>

            <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "11px" }}>
              <div style={{ background: "#FFFDF6", padding: "6px 8px", borderRadius: "3px", border: "1px solid #E2D3B8" }}>
                <span style={{ color: "#777", display: "block", fontSize: "10px" }}>Active Cadre in District:</span>
                <strong>{cadreInDistrict.length} members</strong>
              </div>
              <div style={{ background: "#FFFDF6", padding: "6px 8px", borderRadius: "3px", border: "1px solid #E2D3B8" }}>
                <span style={{ color: "#777", display: "block", fontSize: "10px" }}>State Assembly Seats:</span>
                <strong>{selectedRegion?.assemblySeats ?? 0} Constituencies</strong>
              </div>
            </div>
          </div>

          {/* Benefits & Cost Preview */}
          <div
            style={{
              padding: "12px",
              background: "#FFFDF6",
              border: "1.5px solid #557C55",
              borderRadius: "4px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "12px", color: "#557C55", display: "flex", alignItems: "center", gap: "6px" }}>
                <Sparkles size={14} />
                ESTABLISHMENT DELIVERABLES
              </strong>
              <div style={{ fontSize: "12px", fontWeight: 900 }}>
                Cost: <span style={{ color: "#8C5946" }}>₹{officeCost.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "11px", color: "#444", lineHeight: 1.6 }}>
              <li><strong>+5 Organization Strength</strong> in {selectedRegion?.name}</li>
              <li><strong>+2 Electoral Vote-Share Capacity</strong> across district assembly seats</li>
              <li><strong>Deploys 1 District Organizer</strong> (Tier 4 leader) with authentic regional profile</li>
              <li><strong>Enrolls 3 Active Cadre Workers</strong> (Tier 2) to mobilize local polling booths</li>
            </ul>
          </div>

          {/* Treasury Status */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px" }}>
            <span>
              Available Treasury: <strong>₹{treasuryBalance.toLocaleString("en-IN")}</strong>
            </span>
            <span style={{ color: canAfford ? "#557C55" : "#D96B42", fontWeight: 800 }}>
              {canAfford ? "Funds Approved" : "Insufficient Funds"}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "12px 18px",
            background: "#F2E5CD",
            borderTop: "2px solid #514235",
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 16px",
              fontSize: "12px",
              fontWeight: 800,
              background: "#E8D3AC",
              border: "1.5px solid #514235",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>

          <button
            type="button"
            disabled={!canAfford || Boolean(existingOffice)}
            onClick={handleConfirmBuild}
            style={{
              padding: "8px 20px",
              fontSize: "12px",
              fontWeight: 900,
              background: !canAfford || existingOffice ? "#C8B99D" : "#D96B42",
              color: "#FFF",
              border: "1.5px solid #514235",
              borderRadius: "4px",
              cursor: !canAfford || existingOffice ? "not-allowed" : "pointer",
              boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
            }}
          >
            {existingOffice
              ? "OFFICE ALREADY EXISTS"
              : canAfford
              ? `BUILD OFFICE IN ${selectedDistrict.toUpperCase()} (₹45,000)`
              : "INSUFFICIENT FUNDS"}
          </button>
        </div>
      </div>
    </div>
  );
}
