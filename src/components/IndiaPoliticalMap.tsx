"use client";

import Link from "next/link";
import { states as indiaStates, loadDistricts } from "vardhan-maps/data";
import { useEffect, useMemo, useState } from "react";
import {
  GeoJSON,
  MapContainer,
  useMap,
} from "react-leaflet";
import type { Layer, PathOptions } from "leaflet";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  ArrowLeft,
  Compass,
  MapPin,
  Minus,
  Plus,
  Search,
  X,
  Vote,
  Landmark,
  Shield,
  Award,
  AlertCircle,
  Calendar,
  Layers,
} from "lucide-react";
import { useCampaignStore } from "@/engine/campaign/campaignStore";
import type { CampaignState, PoliticalParty } from "@/types/campaign";
import { INDIA_REGIONS, type RegionSeed } from "@/data/india2026";
import StateAssemblyView from "@/components/map/StateAssemblyView";
import StateParliamentaryView from "@/components/map/StateParliamentaryView";

type StateProperties = {
  STNAME?: string;
  stname?: string;
  name?: string;
  NAME_1?: string;
  state_name?: string;
  [key: string]: unknown;
};

type IndiaGeoJSON = FeatureCollection<Geometry, StateProperties>;

const PAPER_COLOURS = [
  "#E9C995",
  "#D9B98B",
  "#C8D6B9",
  "#E8B9A1",
  "#D9C9A5",
  "#B8C9C2",
  "#E5C878",
];

function normaliseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function getFeatureName(
  feature: Feature<Geometry, StateProperties>,
): string {
  const properties = feature.properties || {};
  const possibleNames = [
    properties.name,
    properties.STNAME,
    properties.stname,
    properties.NAME_1,
    properties.state_name,
  ];

  const name = possibleNames.find(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0,
  );

  return name || "Unknown region";
}

function findRegionByName(name: string): RegionSeed | undefined {
  const norm = normaliseName(name);
  return INDIA_REGIONS.find(
    (r) => normaliseName(r.id) === norm || normaliseName(r.name) === norm,
  );
}

function computeFeatureCollectionBounds(features: Feature[]): [[number, number], [number, number]] | null {
  let minLat = 90;
  let maxLat = -90;
  let minLng = 180;
  let maxLng = -180;

  function processCoords(coords: unknown) {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [lng, lat] = coords as [number, number];
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    } else {
      coords.forEach(processCoords);
    }
  }

  for (const f of features) {
    if (f.geometry && "coordinates" in f.geometry) {
      processCoords((f.geometry as unknown as { coordinates: unknown }).coordinates);
    }
  }

  if (minLat > maxLat || minLng > maxLng) return null;
  return [[minLat, minLng], [maxLat, maxLng]];
}

function MapViewController({
  bounds,
  resetSignal,
}: {
  bounds: [[number, number], [number, number]] | null;
  resetSignal: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (resetSignal > 0) {
      map.setView([22.5, 79], 4.5);
    }
  }, [resetSignal, map]);

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8.5 });
    }
  }, [bounds, map]);

  return null;
}

function MapZoomControls() {
  const map = useMap();

  return (
    <div className="map-zoom-controls">
      <button
        type="button"
        aria-label="Zoom in"
        onClick={() => map.zoomIn()}
      >
        <Plus size={18} />
      </button>
      <button
        type="button"
        aria-label="Zoom out"
        onClick={() => map.zoomOut()}
      >
        <Minus size={18} />
      </button>
      <button
        type="button"
        aria-label="Reset India map"
        onClick={() => map.setView([22.5, 79], 4.5)}
      >
        <Compass size={17} />
      </button>
    </div>
  );
}

function getGovernmentForState(
  campaign: CampaignState,
  stateName: string,
) {
  const region = findRegionByName(stateName);
  const targetId = region ? region.id : stateName;

  return campaign.politicalWorld.stateGovernments.find(
    (government) =>
      normaliseName(government.stateId) === normaliseName(targetId),
  );
}

function getRulingPartyForState(
  campaign: CampaignState,
  stateName: string,
): PoliticalParty | undefined {
  const government = getGovernmentForState(campaign, stateName);
  if (!government) return undefined;

  const parties = campaign.politicalWorld.parties;

  if (government.rulingPartyId) {
    return parties.find(
      (party) => party.id === government.rulingPartyId,
    );
  }

  if (government.rulingAllianceId) {
    const alliance = campaign.politicalWorld.alliances.find(
      (item) => item.id === government.rulingAllianceId,
    );

    if (alliance) {
      const preferredPartyId =
        alliance.leaderPartyId || alliance.memberPartyIds[0];

      return parties.find((party) => party.id === preferredPartyId);
    }
  }

  return undefined;
}

function formatGameDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function IndiaPoliticalMap() {
  const campaign = useCampaignStore(
    (state) => state.campaign,
  );

  const [geoData, setGeoData] = useState<IndiaGeoJSON | null>(null);
  const [selectedName, setSelectedName] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Assembly drill-down mode states
  const [viewMode, setViewMode] = useState<"national" | "assembly" | "parliamentary">("national");
  const [districtGeoData, setDistrictGeoData] = useState<FeatureCollection | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const [stateBounds, setStateBounds] = useState<[[number, number], [number, number]] | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    try {
      const localGeoData =
        indiaStates as unknown as IndiaGeoJSON;

      if (
        !localGeoData ||
        !Array.isArray(localGeoData.features) ||
        localGeoData.features.length === 0
      ) {
        throw new Error("Local India map data is unavailable.");
      }

      if (!cancelled) {
        setGeoData(localGeoData);
        setError("");
      }
    } catch (err) {
      if (!cancelled) {
        setError(
          err instanceof Error
            ? err.message
            : "Could not load India's geographical boundaries.",
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredFeatures = useMemo(() => {
    if (!geoData) return [];

    const query = search.trim().toLowerCase();

    return geoData.features.filter((feature) =>
      getFeatureName(feature).toLowerCase().includes(query),
    );
  }, [geoData, search]);

  const selectedRegion = useMemo(() => {
    if (!selectedName) return undefined;
    return findRegionByName(selectedName);
  }, [selectedName]);

  const selectedGovernment = useMemo(() => {
    if (!campaign || !selectedName) return undefined;
    return getGovernmentForState(campaign, selectedName);
  }, [campaign, selectedName]);

  const selectedRulingParty = useMemo(() => {
    if (!campaign || !selectedName) return undefined;
    return getRulingPartyForState(campaign, selectedName);
  }, [campaign, selectedName]);

  const selectedAlliance = useMemo(() => {
    if (
      !campaign ||
      !selectedGovernment?.rulingAllianceId
    ) {
      return undefined;
    }

    return campaign.politicalWorld.alliances.find(
      (alliance) =>
        alliance.id === selectedGovernment.rulingAllianceId,
    );
  }, [campaign, selectedGovernment]);

  // Load state district boundaries when entering assembly drill-down view
  useEffect(() => {
    if ((viewMode !== "assembly" && viewMode !== "parliamentary") || !selectedRegion) {
      setDistrictGeoData(null);
      setStateBounds(null);
      return;
    }

    let cancelled = false;

    async function loadStateDistricts() {
      try {
        const districts = await loadDistricts(selectedRegion!.name);
        if (cancelled) return;

        if (Array.isArray(districts) && districts.length > 0) {
          const fc: FeatureCollection = {
            type: "FeatureCollection",
            features: districts as Feature[],
          };
          setDistrictGeoData(fc);
          const bounds = computeFeatureCollectionBounds(districts as Feature[]);
          if (bounds) setStateBounds(bounds);
        } else {
          // If no districts found for small UT, calculate from national state feature
          if (geoData) {
            const stateFeature = geoData.features.find(
              (f) => normaliseName(getFeatureName(f)) === normaliseName(selectedRegion!.name),
            );
            if (stateFeature) {
              const bounds = computeFeatureCollectionBounds([stateFeature as Feature]);
              if (bounds) setStateBounds(bounds);
            }
          }
        }
      } catch (err) {
        console.warn("Could not load district geometries:", err);
      }
    }

    loadStateDistricts();

    return () => {
      cancelled = true;
    };
  }, [viewMode, selectedRegion, geoData]);

  // Assembly Seat Composition calculation from campaign.politicalWorld.constituencyControl
  const assemblySeatComposition = useMemo(() => {
    if (!campaign || !selectedRegion || selectedRegion.assemblySeats === 0) {
      return null;
    }

    const stateId = selectedRegion.id;
    const acControls = campaign.politicalWorld.constituencyControl.filter(
      (c) => c.stateId === stateId && c.constituencyType === "vidhan_sabha",
    );

    const totalSeats = selectedRegion.assemblySeats;
    const majorityMark = Math.floor(totalSeats / 2) + 1;

    // Count seats per party
    const seatCountMap = new Map<string, number>();
    for (const c of acControls) {
      if (c.winningPartyId) {
        seatCountMap.set(c.winningPartyId, (seatCountMap.get(c.winningPartyId) ?? 0) + 1);
      }
    }

    // Identify ruling alliance parties
    const rulingPartyId = selectedGovernment?.rulingPartyId;
    const allianceMembers = new Set<string>();
    if (selectedAlliance) {
      selectedAlliance.memberPartyIds.forEach((id) => allianceMembers.add(id));
    }
    if (rulingPartyId) {
      allianceMembers.add(rulingPartyId);
    }

    const partyStats: {
      party: PoliticalParty;
      seats: number;
      percentage: number;
      isRuling: boolean;
      isCoalitionPartner: boolean;
      isOpposition: boolean;
    }[] = [];

    let rulingCoalitionSeats = 0;
    let oppositionSeats = 0;

    for (const [partyId, count] of seatCountMap.entries()) {
      const party = campaign.politicalWorld.parties.find((p) => p.id === partyId) ?? {
        id: partyId,
        name: partyId.toUpperCase(),
        abbreviation: partyId.slice(0, 4).toUpperCase(),
        ideology: "Regionalist",
        description: "",
        branding: {
          slogan: "",
          symbol: "Flag",
          primaryColor: "#8C5946",
          secondaryColor: "#F5E6C8",
        },
        foundedYear: 2000,
        headquartersStateId: null,
        allianceId: null,
        organizationStrength: 50,
        electoralStrength: 50,
        popularity: 50,
        funds: 0,
        isPlayerParty: false,
        isActive: true,
      };

      const isRuling = party.id === rulingPartyId;
      const isCoalitionPartner = !isRuling && allianceMembers.has(party.id);
      const isOpposition = !isRuling && !isCoalitionPartner;

      if (isRuling || isCoalitionPartner) {
        rulingCoalitionSeats += count;
      } else {
        oppositionSeats += count;
      }

      partyStats.push({
        party,
        seats: count,
        percentage: Math.round((count / totalSeats) * 100),
        isRuling,
        isCoalitionPartner,
        isOpposition,
      });
    }

    // Sort: ruling first, then coalition partners, then largest opposition
    partyStats.sort((a, b) => {
      if (a.isRuling && !b.isRuling) return -1;
      if (!a.isRuling && b.isRuling) return 1;
      if (a.isCoalitionPartner && b.isOpposition) return -1;
      if (a.isOpposition && b.isCoalitionPartner) return 1;
      return b.seats - a.seats;
    });

    const vacantSeats = totalSeats - acControls.length;

    return {
      totalSeats,
      majorityMark,
      rulingCoalitionSeats,
      oppositionSeats,
      vacantSeats,
      hasMajority: rulingCoalitionSeats >= majorityMark,
      partyStats,
    };
  }, [campaign, selectedRegion, selectedGovernment, selectedAlliance]);

  // Lok Sabha Seat Composition for selected state
  const lokSabhaSeatComposition = useMemo(() => {
    if (!campaign || !selectedRegion || selectedRegion.lokSabhaSeats === 0) {
      return null;
    }

    const stateId = selectedRegion.id;
    const pcControls = campaign.politicalWorld.constituencyControl.filter(
      (c) => c.stateId === stateId && c.constituencyType === "lok_sabha",
    );

    const seatCountMap = new Map<string, number>();
    for (const c of pcControls) {
      if (c.winningPartyId) {
        seatCountMap.set(c.winningPartyId, (seatCountMap.get(c.winningPartyId) ?? 0) + 1);
      }
    }

    const partyStats = Array.from(seatCountMap.entries()).map(([partyId, count]) => {
      const party = campaign.politicalWorld.parties.find((p) => p.id === partyId);
      return {
        partyId,
        name: party?.name ?? partyId.toUpperCase(),
        abbreviation: party?.abbreviation ?? partyId.toUpperCase(),
        color: party?.branding.primaryColor ?? "#8C5946",
        seats: count,
      };
    }).sort((a, b) => b.seats - a.seats);

    return {
      totalSeats: selectedRegion.lokSabhaSeats,
      partyStats,
    };
  }, [campaign, selectedRegion]);

  // Active / Upcoming election for selected state
  const stateElection = useMemo(() => {
    if (!campaign || !selectedRegion) return null;
    return campaign.elections.find(
      (e) => e.stateId === selectedRegion.id && e.status !== "completed",
    );
  }, [campaign, selectedRegion]);

  function styleFeature(
    feature?: Feature<Geometry, StateProperties>,
  ): PathOptions {
    const name = feature ? getFeatureName(feature) : "";
    const isSelected =
      normaliseName(name) === normaliseName(selectedName);

    const index =
      Math.abs(
        [...name].reduce(
          (sum, char) => sum + char.charCodeAt(0),
          0,
        ),
      ) % PAPER_COLOURS.length;

    const rulingParty =
      campaign && name
        ? getRulingPartyForState(campaign, name)
        : undefined;

    const partyColour = rulingParty?.branding.primaryColor;
    const fillColor =
      partyColour && /^#[0-9a-fA-F]{6}$/.test(partyColour)
        ? partyColour
        : PAPER_COLOURS[index];

    return {
      fillColor: isSelected ? "#D96B42" : fillColor,
      fillOpacity: isSelected ? 0.96 : rulingParty ? 0.88 : 0.72,
      color: isSelected ? "#8C3925" : "#514235",
      weight: isSelected ? 3.0 : 1.25,
      opacity: 1,
      lineJoin: "round",
    };
  }

  function handleFeature(
    feature: Feature<Geometry, StateProperties>,
    layer: Layer,
  ) {
    const name = getFeatureName(feature);
    const region = findRegionByName(name);
    const rulingParty = campaign ? getRulingPartyForState(campaign, name) : undefined;
    const government = campaign ? getGovernmentForState(campaign, name) : undefined;

    const tooltipText = `
      <div style="font-weight: 900; font-size: 11px; margin-bottom: 2px;">${name}</div>
      ${rulingParty ? `<div style="font-size: 9px; color: #555;">Ruling: <strong>${rulingParty.abbreviation}</strong> (${rulingParty.name})</div>` : ""}
      ${region?.assemblySeats ? `<div style="font-size: 9px; color: #777;">Assembly Seats: <strong>${region.assemblySeats}</strong> · LS: <strong>${region.lokSabhaSeats}</strong></div>` : ""}
      ${government?.governmentType ? `<div style="font-size: 8px; text-transform: uppercase; color: #D96B42;">${government.governmentType.replace("_", " ")}</div>` : ""}
    `;

    layer.on({
      click: () => {
        setSelectedName(name);
      },
    });

    layer.bindTooltip(tooltipText, {
      direction: "auto",
      sticky: true,
      className: "india-map-tooltip",
    });
  }

  function styleDistrictFeature(
    feature?: Feature<Geometry, Record<string, unknown>>,
  ): PathOptions {
    const distName = (feature?.properties?.name as string) || "";
    const isSelected = selectedDistrict && normaliseName(distName) === normaliseName(selectedDistrict);

    return {
      fillColor: isSelected ? "#D96B42" : "#EAD9B8",
      fillOpacity: isSelected ? 0.85 : 0.55,
      color: isSelected ? "#8C3925" : "#514235",
      weight: isSelected ? 2.5 : 1.2,
      opacity: 1,
      lineJoin: "round",
    };
  }

  function handleDistrictFeature(
    feature: Feature<Geometry, Record<string, unknown>>,
    layer: Layer,
  ) {
    const distName = (feature.properties?.name as string) || "District";

    const tooltipText = `
      <div style="font-weight: 900; font-size: 11px; margin-bottom: 2px;">District: ${distName}</div>
      <div style="font-size: 9px; color: #8C5946;">Click to filter assembly constituencies</div>
    `;

    layer.on({
      click: () => {
        setSelectedDistrict((prev) => (prev === distName ? null : distName));
      },
    });

    layer.bindTooltip(tooltipText, {
      direction: "auto",
      sticky: true,
      className: "india-map-tooltip",
    });
  }

  function selectState(name: string) {
    setSelectedName(name);
  }

  if (!campaign) {
    return (
      <main className="political-map-screen">
        <header className="map-game-header">
          <Link className="map-back-button" href="/">
            <ArrowLeft size={16} />
            MAIN MENU
          </Link>

          <div className="map-brand">
            <span className="map-brand-emblem">L</span>
            <div>
              <strong>LOKTANTRA</strong>
              <small>THE POLITICAL WORLD</small>
            </div>
          </div>
        </header>

        <section className="map-page-heading">
          <div>
            <span className="board-kicker">NO ACTIVE CAMPAIGN</span>
            <h1>THE MAP OF INDIA</h1>
            <p>
              Start a campaign or load a saved game to explore its
              political landscape.
            </p>
            <Link className="region-action-button" href="/" style={{ opacity: 1, cursor: "pointer" }}>
              RETURN TO MAIN MENU
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const activeParties = campaign.politicalWorld.parties.filter(
    (party) => party.isActive,
  );

  return (
    <main className="political-map-screen">
      <header className="map-game-header">
        <Link className="map-back-button" href="/">
          <ArrowLeft size={16} />
          COMMAND HQ
        </Link>

        <div className="map-brand">
          <span className="map-brand-emblem">L</span>
          <div>
            <strong>LOKTANTRA</strong>
            <small>THE POLITICAL WORLD · {formatGameDate(campaign.calendar.currentDate)}</small>
          </div>
        </div>

        <div className="map-date-pill">
          <span>TURN #{campaign.calendar.currentTurn}</span>
          <span className="dot">·</span>
          <span>{formatGameDate(campaign.calendar.currentDate)}</span>
        </div>
      </header>

      <div className="map-overview-strip">
        <div>
          <span className="board-kicker">STRATEGIC DISPATCH</span>
          <p>
            {(viewMode === "assembly" || viewMode === "parliamentary") && selectedRegion
              ? `Legislative Assembly Delimitation Map: Inspecting ${selectedRegion.assemblySeats} constituencies of ${selectedRegion.name}.`
              : "Explore the 36 states and Union Territories of India. Click any state to inspect its Legislative Assembly composition, ruling coalition, and chief minister."}
          </p>
        </div>

        <div className="map-strip-stats">
          {(viewMode === "assembly" || viewMode === "parliamentary") && selectedRegion ? (
            <button
              type="button"
              className="map-stat-pill"
              onClick={() => {
                setViewMode("national");
                setSelectedDistrict(null);
                setResetSignal((s) => s + 1);
              }}
              style={{ cursor: "pointer", background: "#E8D3AC" }}
            >
              ← RETURN TO INDIA MAP
            </button>
          ) : (
            <>
              <div className="map-stat-pill">
                STATES &amp; UTS
                <strong style={{ color: "#D96B42" }}>36</strong>
              </div>
              <div className="map-stat-pill">
                ASSEMBLY SEATS
                <strong style={{ color: "#8C5946" }}>4,123</strong>
              </div>
              <div className="map-stat-pill">
                LOK SABHA
                <strong style={{ color: "#557C55" }}>543</strong>
              </div>
            </>
          )}
        </div>
      </div>

      <section className="map-game-layout">
        <div className="india-map-frame">
          <div className="map-frame-heading">
            <div>
              <strong>
                {(viewMode === "assembly" || viewMode === "parliamentary") && selectedRegion
                  ? `${selectedRegion.name.toUpperCase()} ASSEMBLY MAP`
                  : "REPUBLIC OF INDIA"}
              </strong>
              <small>
                {viewMode === "assembly"
                  ? "DISTRICT DELIMITATION BOUNDARIES · CLICK A DISTRICT TO FILTER ACs"
                  : "SELECT A STATE OR UNION TERRITORY TO INSPECT"}
              </small>
            </div>
            <span className="map-live-dot">
              {viewMode === "assembly" ? "AC LEVEL VIEW" : viewMode === "parliamentary" ? "LOK SABHA PC VIEW" : "LIVE SIMULATION MAP"}
            </span>
          </div>

          <div className="india-map-canvas">
            {loading && (
              <div className="map-loading">
                <div className="map-loading-stamp">L</div>
                <strong>Unfolding the map of India...</strong>
                <small>Loading geographical boundaries</small>
              </div>
            )}

            {error && (
              <div className="map-error">
                <strong>Map unavailable</strong>
                <p>{error}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                >
                  TRY AGAIN
                </button>
              </div>
            )}

            {!loading && !error && geoData && (
              <MapContainer
                center={[22.5, 79]}
                zoom={4.5}
                minZoom={3.5}
                maxZoom={10}
                scrollWheelZoom
                zoomControl={false}
                className="india-leaflet-map"
              >
                <MapViewController bounds={stateBounds} resetSignal={resetSignal} />

                {(viewMode === "assembly" || viewMode === "parliamentary") && districtGeoData ? (
                  <GeoJSON
                    key={`districts-${selectedName}-${selectedDistrict}`}
                    data={districtGeoData}
                    style={styleDistrictFeature}
                    onEachFeature={handleDistrictFeature}
                  />
                ) : (
                  <GeoJSON
                    key={`${selectedName}-${campaign.metadata.updatedAt}`}
                    data={geoData}
                    style={styleFeature}
                    onEachFeature={handleFeature}
                  />
                )}

                <MapZoomControls />
              </MapContainer>
            )}
          </div>

          {/* Political Map Legend */}
          <div
            style={{
              padding: "10px 15px",
              background: "#F8F1E3",
              borderTop: "2px solid var(--ink)",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "8px 14px",
              fontSize: "10px",
            }}
          >
            <strong style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: "#8C5946" }}>
              POLITICAL PARTIES:
            </strong>
            {activeParties.slice(0, 10).map((party) => (
              <div
                key={party.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  cursor: "pointer",
                }}
                title={party.name}
              >
                <span
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "2px",
                    backgroundColor: party.branding.primaryColor,
                    border: "1px solid #34495E",
                    display: "inline-block",
                  }}
                />
                <span style={{ fontWeight: 700 }}>{party.abbreviation}</span>
              </div>
            ))}
          </div>

          <div className="map-frame-footer">
            <span>
              {viewMode === "assembly"
                ? "✦ CLICK DISTRICTS TO FILTER CONSTITUENCIES · DRILL DOWN ACTIVE"
                : "✦ CLICK ANY STATE TO VIEW ASSEMBLY & PARLIAMENT SEATS"}
            </span>
            <span>OFFLINE LOCAL GEOGRAPHY DATA · REAL DELIMITATION BOUNDARIES</span>
          </div>
        </div>

        <aside className="map-side-panel" style={{ maxHeight: "calc(100vh - 120px)", overflowY: "auto" }}>
          {viewMode === "assembly" && selectedRegion ? (
            <StateAssemblyView
              campaign={campaign}
              region={selectedRegion}
              selectedDistrict={selectedDistrict}
              onSelectDistrict={(dist) => setSelectedDistrict(dist)}
              onBackToNational={() => {
                setViewMode("national");
                setSelectedDistrict(null);
                setResetSignal((s) => s + 1);
              }}
              onSwitchToParliamentaryView={() => setViewMode("parliamentary")}
            />
          ) : viewMode === "parliamentary" && selectedRegion ? (
            <StateParliamentaryView
              campaign={campaign}
              region={selectedRegion}
              onBackToNational={() => {
                setViewMode("national");
                setSelectedDistrict(null);
                setResetSignal((s) => s + 1);
              }}
              onSwitchToAssemblyView={() => setViewMode("assembly")}
            />
          ) : (
            <>
              <div className="map-panel-heading">
                <div>
                  <span className="board-kicker">FIELD INTELLIGENCE</span>
                  <h2>{selectedName || "Select a State"}</h2>
                </div>
                {selectedName && (
                  <button
                    type="button"
                    className="clear-state-button"
                    aria-label="Clear selected state"
                    onClick={() => setSelectedName("")}
                  >
                    <X size={17} />
                  </button>
                )}
              </div>

              {selectedName ? (
                <div className="selected-region-content" style={{ marginTop: "12px" }}>
                  <div className="region-banner">
                    <span>📍</span>
                    <div>
                      <strong>{selectedName}</strong>
                      <small>
                        {selectedRegion ? `${selectedRegion.kind.toUpperCase().replace("_", " ")} · CAPITAL: ${selectedRegion.capital}` : "REGION"}
                      </small>
                    </div>
                  </div>

                  {/* Prominent Assembly Drilldown Button */}
                  {selectedRegion && selectedRegion.assemblySeats > 0 && (
                    <button
                      type="button"
                      onClick={() => setViewMode("assembly")}
                      style={{
                        marginTop: "12px",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#D96B42",
                        color: "#FFF",
                        fontWeight: 900,
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        padding: "9px 12px",
                        border: "2px solid var(--ink)",
                        borderRadius: "3px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                      }}
                    >
                      <Layers size={15} />
                      EXPLORE ASSEMBLY CONSTITUENCIES ({selectedRegion.assemblySeats} SEATS)
                    </button>
                  )}

                  {/* Prominent Parliamentary Drilldown Button */}
                  {selectedRegion && selectedRegion.lokSabhaSeats > 0 && (
                    <button
                      type="button"
                      onClick={() => setViewMode("parliamentary")}
                      style={{
                        marginTop: "8px",
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        background: "#557C55",
                        color: "#FFF",
                        fontWeight: 900,
                        fontSize: "11px",
                        letterSpacing: "0.5px",
                        padding: "9px 12px",
                        border: "2px solid var(--ink)",
                        borderRadius: "3px",
                        cursor: "pointer",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
                      }}
                    >
                      <Vote size={15} />
                      EXPLORE PARLIAMENTARY SEATS ({selectedRegion.lokSabhaSeats} LOK SABHA)
                    </button>
                  )}

                  {/* State Active Election Notice */}
                  {stateElection && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px 12px",
                        background: "#FCEADE",
                        border: "2px solid #D96B42",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#A8492C", fontWeight: 900, fontSize: "10px" }}>
                        <Vote size={15} />
                        <span>ELECTION STATUS: {stateElection.status.toUpperCase()}</span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#34495E" }}>
                        <strong>{stateElection.name}</strong>
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: "10px", color: "#8C5946" }}>
                        Polling scheduled on: {formatGameDate(stateElection.date)}
                      </p>
                    </div>
                  )}

                  {/* Legislative Assembly Composition Panel */}
                  {assemblySeatComposition ? (
                    <div
                      style={{
                        marginTop: "14px",
                        padding: "12px",
                        background: "#F8F1E3",
                        border: "2px solid #8C5946",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="board-kicker" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Landmark size={13} />
                          VIDHAN SABHA (ASSEMBLY)
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 900, color: "#34495E" }}>
                          {assemblySeatComposition.totalSeats} SEATS
                        </span>
                      </div>

                      <div style={{ marginTop: "6px", display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                        <span>Majority Mark: <strong>{assemblySeatComposition.majorityMark}</strong> seats</span>
                        <span
                          style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            fontSize: "9px",
                            fontWeight: 900,
                            background: assemblySeatComposition.hasMajority ? "#E2EDDC" : "#FCEADE",
                            color: assemblySeatComposition.hasMajority ? "#557C55" : "#D96B42",
                            border: `1px solid ${assemblySeatComposition.hasMajority ? "#557C55" : "#D96B42"}`,
                          }}
                        >
                          {assemblySeatComposition.hasMajority ? "MAJORITY SECURED" : "HUNG / MINORITY"}
                        </span>
                      </div>

                      {/* Horizontal Seat Distribution Bar */}
                      <div
                        style={{
                          marginTop: "10px",
                          height: "22px",
                          display: "flex",
                          width: "100%",
                          borderRadius: "3px",
                          overflow: "hidden",
                          border: "2px solid #34495E",
                          position: "relative",
                          background: "#E8D3AC",
                        }}
                      >
                        {assemblySeatComposition.partyStats.map((stat) => (
                          <div
                            key={stat.party.id}
                            title={`${stat.party.name} (${stat.party.abbreviation}): ${stat.seats} seats (${stat.percentage}%)`}
                            style={{
                              width: `${(stat.seats / assemblySeatComposition.totalSeats) * 100}%`,
                              backgroundColor: stat.party.branding.primaryColor,
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
                            {stat.seats >= 3 ? stat.party.abbreviation : ""}
                          </div>
                        ))}
                        {/* Majority Marker Indicator */}
                        <div
                          title={`Majority threshold: ${assemblySeatComposition.majorityMark} seats`}
                          style={{
                            position: "absolute",
                            left: `${(assemblySeatComposition.majorityMark / assemblySeatComposition.totalSeats) * 100}%`,
                            top: 0,
                            bottom: 0,
                            width: "2px",
                            backgroundColor: "#000",
                            zIndex: 2,
                            boxShadow: "0 0 2px #fff",
                          }}
                        />
                      </div>

                      {/* Party breakdown list */}
                      <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {assemblySeatComposition.partyStats.map((stat) => (
                          <div
                            key={stat.party.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "10px",
                              padding: "4px 6px",
                              background: "#FFFDF6",
                              border: "1px solid #D6B995",
                              borderRadius: "2px",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span
                                style={{
                                  width: "10px",
                                  height: "10px",
                                  borderRadius: "2px",
                                  backgroundColor: stat.party.branding.primaryColor,
                                  border: "1px solid #34495E",
                                }}
                              />
                              <strong>{stat.party.abbreviation}</strong>
                              <span style={{ color: "#666", fontSize: "9px" }}>
                                {stat.isRuling ? "(Ruling)" : stat.isCoalitionPartner ? "(Coalition)" : "(Opposition)"}
                              </span>
                            </div>
                            <div style={{ fontWeight: 900 }}>
                              {stat.seats} seats <span style={{ color: "#8C5946", fontWeight: 400 }}>({stat.percentage}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : selectedRegion && selectedRegion.assemblySeats === 0 ? (
                    <div style={{ marginTop: "12px", padding: "10px", background: "#F2E5CD", borderLeft: "3px solid #8C5946", fontSize: "11px" }}>
                      <strong>Union Territory without Legislative Assembly</strong>
                      <p style={{ margin: "4px 0 0", color: "#655548", fontSize: "10px" }}>
                        Directly administered by the President through an appointed Administrator or Lieutenant Governor.
                      </p>
                    </div>
                  ) : null}

                  {/* Lok Sabha Composition for State */}
                  {lokSabhaSeatComposition && (
                    <div
                      style={{
                        marginTop: "12px",
                        padding: "10px 12px",
                        background: "#F8F1E3",
                        border: "1px solid #D6B995",
                        borderRadius: "4px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="board-kicker" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                          <Vote size={13} />
                          LOK SABHA (PARLIAMENT)
                        </span>
                        <span style={{ fontSize: "10px", fontWeight: 900, color: "#34495E" }}>
                          {lokSabhaSeatComposition.totalSeats} SEATS
                        </span>
                      </div>

                      <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {lokSabhaSeatComposition.partyStats.map((p) => (
                          <span
                            key={p.partyId}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "3px 7px",
                              background: "#FFFDF6",
                              border: "1px solid #D6B995",
                              borderRadius: "3px",
                              fontSize: "10px",
                              fontWeight: 700,
                            }}
                          >
                            <span
                              style={{
                                width: "8px",
                                height: "8px",
                                borderRadius: "50%",
                                backgroundColor: p.color,
                              }}
                            />
                            {p.abbreviation}: <strong>{p.seats}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Government Details */}
                  <div className="region-intelligence">
                    <span className="board-kicker">GOVERNANCE INTELLIGENCE</span>

                    <div className="intelligence-row">
                      <span>Ruling Party</span>
                      <strong>
                        {selectedRulingParty?.name || "Not configured"}
                      </strong>
                    </div>

                    {selectedAlliance && (
                      <div className="intelligence-row">
                        <span>Ruling Alliance</span>
                        <strong>{selectedAlliance.name} ({selectedAlliance.abbreviation})</strong>
                      </div>
                    )}

                    <div className="intelligence-row">
                      <span>Chief Minister</span>
                      <strong>
                        {selectedGovernment?.chiefMinisterName || "Not configured"}
                      </strong>
                    </div>

                    {selectedGovernment?.chiefMinister && (
                      <>
                        <div className="intelligence-row">
                          <span>CM Archetype</span>
                          <strong style={{ textTransform: "capitalize" }}>
                            {selectedGovernment.chiefMinister.leaderArchetype.replace(/_/g, " ")}
                          </strong>
                        </div>
                        <div className="intelligence-row">
                          <span>CM Approval</span>
                          <strong style={{ color: "#557C55" }}>
                            {selectedGovernment.chiefMinister.approvalRating}%
                          </strong>
                        </div>
                      </>
                    )}

                    {selectedGovernment?.cabinetStability !== undefined && (
                      <div className="intelligence-row">
                        <span>Cabinet Stability</span>
                        <strong style={{ color: selectedGovernment.cabinetStability >= 70 ? "#557C55" : "#D97706" }}>
                          {selectedGovernment.cabinetStability}%
                        </strong>
                      </div>
                    )}

                    <div className="intelligence-row">
                      <span>Government Type</span>
                      <strong style={{ textTransform: "capitalize" }}>
                        {selectedGovernment?.governmentType
                          ? selectedGovernment.governmentType.replace(/_/g, " ")
                          : "Not configured"}
                      </strong>
                    </div>

                    <div className="intelligence-row">
                      <span>Assembly Term Ends</span>
                      <strong>
                        {selectedGovernment?.assemblyTermEnd
                          ? formatGameDate(selectedGovernment.assemblyTermEnd)
                          : "Not configured"}
                      </strong>
                    </div>
                  </div>

                  <Link
                    href="/"
                    className="primary-button"
                    style={{
                      textDecoration: "none",
                      marginTop: "16px",
                      fontSize: "11px",
                    }}
                  >
                    RETURN TO HEADQUARTERS
                  </Link>
                </div>
              ) : (
                <div className="map-empty-selection">
                  <div className="empty-map-illustration">🗺️</div>
                  <h3>The nation awaits.</h3>
                  <p>
                    Click any state or Union Territory on the map to inspect its
                    Legislative Assembly composition, ruling coalition, and parliamentary seats.
                  </p>
                </div>
              )}

              <div className="region-search">
                <label htmlFor="stateSearch">
                  <Search size={15} />
                  FIND A STATE OR UNION TERRITORY
                </label>
                <input
                  id="stateSearch"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by state name..."
                />
                <div className="region-search-results">
                  {filteredFeatures.slice(0, 10).map((feature, index) => {
                    const name = getFeatureName(feature);

                    return (
                      <button
                        key={`${name}-${index}`}
                        type="button"
                        onClick={() => selectState(name)}
                        className={
                          normaliseName(name) === normaliseName(selectedName)
                            ? "search-result-selected"
                            : ""
                        }
                      >
                        <MapPin size={13} />
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </aside>
      </section>

      <footer className="map-page-footer">
        <span>LOKTANTRA · THE INDIAN POLITICAL SIMULATION</span>
        <span>DELIMITATION-CORRELATED CONSTITUENCY DISTRIBUTION</span>
      </footer>
    </main>
  );
}
