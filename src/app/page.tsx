"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { ChangeEvent, CSSProperties } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  Check,
  Flag,
  Landmark,
  MapPin,
  Megaphone,
  Shield,
  Users,
  Vote,
  Loader2,
  Star,
  Crown,
  Save,
  FolderOpen,
  Calendar,
  FastForward,
  Play,
  Building,
  CheckCircle2,
  FileText,
  Globe,
  Sparkles,
  Flame,
  Handshake,
  ShieldAlert,
} from "lucide-react";

import { useCampaignStore } from "@/engine/campaign/campaignStore";
import { createPlayerParty } from "@/engine/party/createPlayerParty";
import {
  createSaveEnvelope,
  downloadSaveFile,
  readSaveFile,
} from "@/save/saveFormat";
import type { CampaignState, PoliticalParty } from "@/types/campaign";
import type { PartyIdeology } from "@/engine/party/createPlayerParty";
import { INDIA_REGIONS } from "@/data/india2026";
import {
  POLITICAL_ACTIONS,
  executePoliticalAction,
  type PoliticalActionType,
} from "@/engine/party/campaignActions";
import {
  RECRUITABLE_LEADERS,
  recruitLeader,
} from "@/engine/party/politicalLeaders";
import {
  NATIONAL_POLICIES,
  enactPolicy,
} from "@/engine/governance/policyEngine";
import {
  simulateElection,
  nominateCandidate,
} from "@/engine/elections/electionEngine";
import CadreManagementView from "@/components/campaign/CadreManagementView";
import DistrictOfficeModal from "@/components/campaign/DistrictOfficeModal";
import CandidateNominationModal from "@/components/campaign/CandidateNominationModal";
import TicketDistributionModal from "@/components/campaign/TicketDistributionModal";
import CoalitionNegotiationModal from "@/components/campaign/CoalitionNegotiationModal";
import PartyDisciplineModal from "@/components/campaign/PartyDisciplineModal";
import StateParliamentaryView from "@/components/map/StateParliamentaryView";

type Ideology = {
  name: PartyIdeology;
  subtitle: string;
  description: string;
  colour: string;
  icon: string;
};

const IDEOLOGIES: Ideology[] = [
  {
    name: "Progressive",
    subtitle: "A fairer society",
    description: "Welfare, equality, education, healthcare and social inclusion.",
    colour: "#D96B42",
    icon: "✊",
  },
  {
    name: "Centrist",
    subtitle: "Practical progress",
    description: "Balanced policies, development, pragmatism and moderate welfare.",
    colour: "#557C55",
    icon: "⚖️",
  },
  {
    name: "Nationalist",
    subtitle: "Nation first",
    description: "National identity, sovereignty, security and national unity.",
    colour: "#D5A13D",
    icon: "🇮🇳",
  },
  {
    name: "Regionalist",
    subtitle: "Power to the regions",
    description: "State autonomy, regional identity and local development.",
    colour: "#567A9B",
    icon: "🏛️",
  },
];

const SYMBOLS = [
  "Flag", "Lion", "Sun", "Elephant", "Tree", "Hand",
  "Star", "Wheel", "Torch", "Book", "Flower", "Rising Sun",
];

function isValidCampaign(value: unknown): value is CampaignState {
  if (!value || typeof value !== "object") return false;

  const c = value as CampaignState;

  return (
    c.schemaVersion === 1 &&
    typeof c.metadata?.id === "string" &&
    typeof c.metadata?.campaignName === "string" &&
    typeof c.calendar?.currentDate === "string" &&
    typeof c.calendar?.currentTurn === "number" &&
    typeof c.player?.foundingStateId === "string" &&
    (c.player.partyId === null || typeof c.player.partyId === "string") &&
    Array.isArray(c.politicalWorld?.parties) &&
    Array.isArray(c.politicalWorld?.alliances) &&
    Array.isArray(c.politicalWorld?.stateGovernments) &&
    Array.isArray(c.politicalWorld?.constituencyControl) &&
    Array.isArray(c.politicalWorld?.relationships) &&
    Array.isArray(c.organization?.members) &&
    Array.isArray(c.organization?.leaders) &&
    Array.isArray(c.economy?.treasuries) &&
    Array.isArray(c.elections) &&
    Array.isArray(c.history?.events)
  );
}

export default function Home() {
  const router = useRouter();
  const [screen, setScreen] = useState<
    "menu" | "new-campaign" | "party-creation" | "headquarters"
  >("menu");

  const [hqTab, setHqTab] = useState<
    "actions" | "cadre" | "leaders" | "elections" | "parliament" | "policies" | "history"
  >("actions");
  const [isOfficeModalOpen, setIsOfficeModalOpen] = useState(false);
  const [isDisciplineModalOpen, setIsDisciplineModalOpen] = useState(false);

  const campaign = useCampaignStore((state) => state.campaign);
  const hasUnsavedChanges = useCampaignStore((state) => state.hasUnsavedChanges);
  const startCampaign = useCampaignStore((state) => state.startCampaign);
  const loadCampaign = useCampaignStore((state) => state.loadCampaign);
  const updateCampaign = useCampaignStore((state) => state.updateCampaign);
  const advanceSimulationDay = useCampaignStore((state) => state.advanceSimulationDay);
  const advanceSimulationWeek = useCampaignStore((state) => state.advanceSimulationWeek);
  const markSaved = useCampaignStore((state) => state.markSaved);
  const closeCampaign = useCampaignStore((state) => state.closeCampaign);

  const [campaignName, setCampaignName] = useState("My Political Journey");
  const [homeStateId, setHomeStateId] = useState("west-bengal");
  const [partyName, setPartyName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [ideology, setIdeology] = useState<PartyIdeology>("Centrist");
  const [slogan, setSlogan] = useState("");
  const [symbol, setSymbol] = useState("Flag");
  const [primaryColor, setPrimaryColor] = useState("#D96B42");
  const [secondaryColor, setSecondaryColor] = useState("#F5E6C8");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Nomination modal & Parliamentary drill-down state
  const [nominationModalElectionId, setNominationModalElectionId] = useState<string | null>(null);
  const [ticketModalElectionId, setTicketModalElectionId] = useState<string | null>(null);
  const [coalitionModalElectionId, setCoalitionModalElectionId] = useState<string | null>(null);
  const [selectedParliamentStateId, setSelectedParliamentStateId] = useState<string | null>(null);
  const [nomCandidateName, setNomCandidateName] = useState("");
  const [selectedElectionId, setSelectedElectionId] = useState<string>("");

  // Restore the active campaign after a browser refresh.
  useEffect(() => {
    let mounted = true;

    Promise.resolve(useCampaignStore.persist.rehydrate()).finally(() => {
      if (!mounted) return;

      const restoredCampaign = useCampaignStore.getState().campaign;
      if (restoredCampaign) {
        setScreen(
          restoredCampaign.player.partyId ? "headquarters" : "party-creation"
        );
      }
    });

    return () => {
      mounted = false;
    };
  }, []);

  const selectedState = INDIA_REGIONS.find((state) => state.id === homeStateId);
  const party: PoliticalParty | null = campaign?.player.partyId
    ? campaign.politicalWorld.parties.find((item) => item.id === campaign.player.partyId) ?? null
    : null;

  const treasuryBalance = useMemo(() => {
    if (!campaign || !party) return 0;
    return campaign.economy.treasuries.find((t) => t.partyId === party.id)?.balance ?? 0;
  }, [campaign, party]);

  const playerSeatsWon = useMemo(() => {
    if (!campaign || !party) return { mlas: 0, mps: 0 };
    const mlas = campaign.politicalWorld.constituencyControl.filter(
      (c) => c.winningPartyId === party.id && c.constituencyType === "vidhan_sabha",
    ).length;
    const mps = campaign.politicalWorld.constituencyControl.filter(
      (c) => c.winningPartyId === party.id && c.constituencyType === "lok_sabha",
    ).length;
    return { mlas, mps };
  }, [campaign, party]);

  // National Parliament Calculation (543 seats)
  const parliamentTally = useMemo(() => {
    if (!campaign) return { nda: 0, puf: 0, others: 0, player: 0, total: 543, majority: 272, partyStats: [] };

    const pcControls = campaign.politicalWorld.constituencyControl.filter(
      (c) => c.constituencyType === "lok_sabha",
    );

    const counts = new Map<string, number>();
    for (const c of pcControls) {
      if (c.winningPartyId) {
        counts.set(c.winningPartyId, (counts.get(c.winningPartyId) ?? 0) + 1);
      }
    }

    let nda = 0;
    let puf = 0;
    let others = 0;
    let player = 0;

    const stats = Array.from(counts.entries()).map(([pId, seats]) => {
      const p = campaign.politicalWorld.parties.find((party) => party.id === pId);
      if (p?.isPlayerParty) {
        player += seats;
      } else if (p?.allianceId === "national-democratic-alliance") {
        nda += seats;
      } else if (p?.allianceId === "progressive-united-front") {
        puf += seats;
      } else {
        others += seats;
      }

      return {
        partyId: pId,
        name: p?.name ?? pId.toUpperCase(),
        abbreviation: p?.abbreviation ?? pId.toUpperCase(),
        color: p?.branding.primaryColor ?? "#8C5946",
        seats,
      };
    }).sort((a, b) => b.seats - a.seats);

    return {
      nda,
      puf,
      others,
      player,
      total: 543,
      majority: 272,
      partyStats: stats,
    };
  }, [campaign]);

  const selectedParliamentRegion = useMemo(() => {
    if (!selectedParliamentStateId) return null;
    return INDIA_REGIONS.find((r) => r.id === selectedParliamentStateId) ?? null;
  }, [selectedParliamentStateId]);

  function createCampaign() {
    if (!campaignName.trim()) {
      setError("Please enter a campaign name.");
      return;
    }
    if (campaign) {
      const confirmed = window.confirm(
        "Starting a new campaign replaces the campaign currently in memory. Have you downloaded a save of your current progress?"
      );
      if (!confirmed) return;
    }
    try {
      setError("");
      setMessage("");
      startCampaign(campaignName.trim(), homeStateId);
      setScreen("party-creation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Campaign creation failed.");
    }
  }

  function registerParty() {
    if (!campaign) {
      setError("No active campaign was found.");
      return;
    }
    try {
      setError("");
      updateCampaign((current) =>
        createPlayerParty(current, {
          name: partyName,
          abbreviation: abbreviation.trim().toUpperCase(),
          ideology,
          description,
          slogan,
          symbol,
          primaryColor,
          secondaryColor,
        })
      );
      setMessage("Your political party has officially been founded!");
      setScreen("headquarters");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Party registration failed.");
    }
  }

  function saveCampaign() {
    if (!campaign) {
      setError("There is no active campaign to save.");
      return;
    }
    try {
      const save = createSaveEnvelope(campaign);
      downloadSaveFile(save);
      markSaved();
      setMessage("Campaign save prepared. Keep your downloaded .lok file safe.");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save campaign.");
    }
  }

  async function loadCampaignFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setBusy(true);
      setError("");
      setMessage("");
      const save = await readSaveFile<CampaignState>(file);
      if (!isValidCampaign(save.campaign)) {
        throw new Error("This save file does not contain a complete supported campaign.");
      }
      loadCampaign(save.campaign);
      setMessage(`Loaded campaign: ${save.campaign.metadata.campaignName}`);
      setScreen(save.campaign.player.partyId ? "headquarters" : "party-creation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load this campaign.");
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function openLoadDialog() {
    fileInputRef.current?.click();
  }

  function closeCurrentCampaign() {
    if (!campaign) return;
    const warning = hasUnsavedChanges
      ? "You have unsaved changes. Close anyway? Progress will be lost unless you downloaded a .lok save."
      : "Close this campaign?";
    if (!window.confirm(warning)) return;
    closeCampaign();
    setMessage("Campaign closed.");
    setError("");
    setScreen("menu");
  }

  function handleTakeAction(actionType: PoliticalActionType) {
    if (!campaign) return;
    try {
      setError("");
      setMessage("");
      const result = executePoliticalAction(campaign, actionType);
      updateCampaign(() => result.campaign);
      setMessage(result.resultMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    }
  }

  function handleRecruitLeader(leaderId: string) {
    if (!campaign) return;
    try {
      setError("");
      setMessage("");
      const updated = recruitLeader(campaign, leaderId);
      updateCampaign(() => updated);
      setMessage("New leader has officially joined your party leadership committee!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recruitment failed.");
    }
  }

  function handleEnactPolicy(policyId: string) {
    if (!campaign) return;
    try {
      setError("");
      setMessage("");
      const result = enactPolicy(campaign, policyId);
      updateCampaign(() => result.campaign);
      setMessage(result.resultMessage);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Policy promulgation failed.");
    }
  }

  function handleSimulateElection(electionId: string) {
    if (!campaign) return;
    try {
      setError("");
      setMessage("");
      const updated = simulateElection(campaign, electionId);
      updateCampaign(() => updated);
      setMessage("Polling completed! Votes tallied and government updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Election simulation failed.");
    }
  }

  function handleNominateCandidate(electionId: string, constituencyId: string) {
    if (!campaign || !party) return;
    if (!nomCandidateName.trim()) {
      setError("Please enter candidate name.");
      return;
    }
    try {
      setError("");
      setMessage("");
      const updated = nominateCandidate(campaign, electionId, {
        name: nomCandidateName.trim(),
        partyId: party.id,
        constituencyId,
        popularity: Math.floor(45 + Math.random() * 25),
        experience: Math.floor(40 + Math.random() * 30),
      });
      updateCampaign(() => updated);
      setMessage(`Nominated ${nomCandidateName} in constituency ${constituencyId}!`);
      setNomCandidateName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nomination failed.");
    }
  }

  return (
    <main className="game-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".lok,application/json"
        onChange={loadCampaignFile}
        className="hidden"
        aria-label="Load campaign save file"
      />
      <div className="game-topbar">
        <button
          className="brand-mark"
          onClick={() => setScreen("menu")}
          aria-label="Go to main menu"
        >
          <span className="brand-emblem">L</span>
          <span>
            <strong>LOKTANTRA</strong>
            <small>THE INDIAN POLITICAL SIMULATION</small>
          </span>
        </button>

        <div className="topbar-right">
          <span className="year-label">
            INDIA · {campaign?.calendar.currentDate ? new Date(campaign.calendar.currentDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "2027"}
          </span>
          <span className="topbar-divider" />
          {campaign ? (
            <>
              <span className="campaign-status">
                <span
                  className="status-dot"
                  style={{ background: hasUnsavedChanges ? "#E5B94F" : "#557C55" }}
                />
                {hasUnsavedChanges ? "UNSAVED" : "SAVED"}
              </span>
              <button className="primary-button" style={{ marginTop: 0, padding: "8px 14px" }} onClick={saveCampaign}>
                <Save size={15} /> SAVE
              </button>
              <button className="back-button" onClick={openLoadDialog}>
                <FolderOpen size={15} /> LOAD
              </button>
              <button className="back-button" onClick={closeCurrentCampaign}>
                MENU
              </button>
            </>
          ) : (
            <span className="campaign-status">
              <span className="status-dot" /> MAIN MENU
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="game-error">
          <span>⚠</span>
          {error}
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {message && (
        <div
          className="game-success"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            margin: "14px auto",
            maxWidth: 1200,
            padding: "12px 16px",
            background: "#e2eddc",
            border: "2px solid #557c55",
            color: "#34495e",
            fontWeight: 700,
            fontSize: "12px",
            borderRadius: 6,
          }}
        >
          <CheckCircle2 size={18} color="#557c55" />
          <span>{message}</span>
          <button
            onClick={() => setMessage("")}
            style={{ marginLeft: "auto", background: "transparent", border: 0, cursor: "pointer", fontWeight: 900 }}
          >
            ✕
          </button>
        </div>
      )}

      {/* SCREEN 1: MAIN MENU */}
      {screen === "menu" && (
        <section className="menu-screen">
          <div className="menu-intro">
            <div className="chapter-label">
              <span /> A NEW POLITICAL ERA BEGINS <span />
            </div>

            <h1>
              YOUR COUNTRY.
              <br />
              <span>YOUR MOVEMENT.</span>
              <br />
              YOUR MANDATE.
            </h1>

            <p>
              Establish a political party from the grassroots on January 1, 2027.
              Win public recognition, recruit leaders, contest assembly and parliamentary elections,
              and form governments across the Indian Republic.
            </p>

            <div className="intro-decoration">
              <span>✦</span>
              <span>✦</span>
              <span>✦</span>
            </div>
          </div>

          <div className="mode-board">
            <div className="board-heading">
              <span className="board-kicker">CAMPAIGN MODE</span>
              <h2>How will you enter politics?</h2>
            </div>

            <button
              className="mode-card primary-mode"
              onClick={() => {
                setError("");
                setScreen("new-campaign");
              }}
            >
              <div className="mode-illustration grassroots-art">
                <div className="sun-disc" />
                <div className="hill hill-one" />
                <div className="hill hill-two" />
                <div className="crowd">
                  <span>●</span><span>●</span><span>●</span><span>●</span><span>●</span>
                </div>
                <div className="banner-flag">✊</div>
              </div>
              <div className="mode-content">
                <div className="mode-number">01 · THE LONG ROAD TO POWER</div>
                <h3>Start Your Political Movement</h3>
                <p>
                  Found a party with limited funds, low recognition, and no elected representatives.
                  Organize districts, recruit leaders, nominate candidates, and win power constituency by constituency.
                </p>
                <div className="mode-features">
                  <span><Users size={14} /> Organization &amp; Rallies</span>
                  <span><Vote size={14} /> Assembly &amp; Lok Sabha Elections</span>
                  <span><Landmark size={14} /> Coalition &amp; Governance</span>
                </div>
                <div className="mode-action">
                  BEGIN YOUR JOURNEY <ArrowRight size={17} />
                </div>
              </div>
              <span className="mode-corner">PLAYABLE DEMO</span>
            </button>
          </div>

          <section className="saved-campaigns">
            <div className="section-heading">
              <div>
                <span className="board-kicker">LOCAL-FIRST PERSISTENCE</span>
                <h2>Continue your journey</h2>
              </div>
            </div>
            <p style={{ fontSize: "12px", color: "var(--ink-soft)" }}>
              Campaigns persist in browser session storage and can be exported as permanent, user-managed .lok files.
            </p>
            <button className="primary-button" style={{ maxWidth: 280 }} onClick={openLoadDialog} disabled={busy}>
              <FolderOpen size={18} /> LOAD .LOK CAMPAIGN FILE
            </button>
          </section>

          <div className="menu-footer">
            <span>LOKTANTRA · AN INDIAN POLITICAL STRATEGY SIMULATION</span>
            <span>EVERY DECISION HAS CONSEQUENCES</span>
          </div>
        </section>
      )}

      {/* SCREEN 2: NEW CAMPAIGN SETUP */}
      {screen === "new-campaign" && (
        <section className="setup-screen">
          <button className="back-button" onClick={() => setScreen("menu")}>
            <ArrowLeft size={16} /> MAIN MENU
          </button>

          <div className="setup-layout">
            <div className="setup-story">
              <div className="chapter-label">
                <span /> CHAPTER 01 <span />
              </div>
              <h1>
                EVERY
                <br />
                MOVEMENT
                <br />
                <span>STARTS</span>
                <br />
                SOMEWHERE.
              </h1>
              <p>
                It is January 1, 2027. The political landscape of 28 states and 8 Union Territories is set.
                Choose where your political party will plant its roots.
              </p>
              <div className="story-stamp">
                <span>2027</span>
                <small>A NEW BEGINNING</small>
              </div>
            </div>

            <div className="paper-panel setup-panel">
              <div className="paper-topline">
                <span>LOKTANTRA · ELECTION COMMISSION OF INDIA</span>
                <span>FORM 001 — REGISTRATION INTENT</span>
              </div>
              <div className="paper-title">
                <div className="paper-icon"><Flag size={23} /></div>
                <div>
                  <span className="board-kicker">FOUNDING STEP</span>
                  <h2>Start your campaign</h2>
                </div>
              </div>

              <label className="field-label" htmlFor="campaignName">
                CAMPAIGN NAME
              </label>
              <input
                id="campaignName"
                className="game-input"
                value={campaignName}
                onChange={(event) => setCampaignName(event.target.value)}
                maxLength={150}
                placeholder="Name your journey"
              />

              <label className="field-label" htmlFor="homeState">
                YOUR FOUNDING STATE / UNION TERRITORY
              </label>
              <div className="select-wrap">
                <MapPin size={18} />
                <select
                  id="homeState"
                  className="game-select"
                  value={homeStateId}
                  onChange={(event) => setHomeStateId(event.target.value)}
                >
                  {INDIA_REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name} ({region.kind === "state" ? "State" : "UT"} · {region.assemblySeats} Assembly / {region.lokSabhaSeats} Lok Sabha)
                    </option>
                  ))}
                </select>
              </div>

              {selectedState && (
                <div className="state-fact-card">
                  <div className="state-fact-icon">📍</div>
                  <div>
                    <strong>{selectedState.name}</strong>
                    <small>
                      {selectedState.assemblySeats} ASSEMBLY SEATS
                      &nbsp;·&nbsp;
                      {selectedState.lokSabhaSeats} LOK SABHA SEATS
                      &nbsp;·&nbsp;
                      CAPITAL: {selectedState.capital}
                    </small>
                  </div>
                </div>
              )}

              <div className="starting-condition">
                <span className="board-kicker">YOUR STARTING POSITION</span>
                <div className="condition-grid">
                  <div><Users size={17} /><strong>Small</strong><small>Committee</small></div>
                  <div><Banknote size={17} /><strong>₹2,50,000</strong><small>Treasury</small></div>
                  <div><Award size={17} /><strong>0 MPs / MLAs</strong><small>Seats</small></div>
                </div>
              </div>

              <button
                className="primary-button"
                onClick={createCampaign}
                disabled={busy}
              >
                {busy ? <Loader2 className="spin" size={18} /> : null}
                PROCEED TO PARTY REGISTRATION <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* SCREEN 3: PARTY REGISTRATION */}
      {screen === "party-creation" && campaign && (
        <section className="party-screen">
          <button className="back-button" onClick={() => setScreen("menu")}>
            <ArrowLeft size={16} /> MAIN MENU
          </button>

          <div className="party-heading">
            <div className="chapter-label">
              <span /> CHAPTER 02 · FOUNDING YOUR MOVEMENT <span />
            </div>
            <h1>
              GIVE YOUR
              <br />
              <span>MOVEMENT</span> AN IDENTITY.
            </h1>
            <p>
              Define your party name, abbreviation, ideology, symbol, and colors.
            </p>
          </div>

          <div className="registration-layout">
            <div className="paper-panel registration-panel">
              <div className="paper-topline">
                <span>PARTY REGISTRATION REGISTRY</span>
                <span>FORM 002</span>
              </div>

              <div className="registration-section">
                <div className="section-number">01</div>
                <div className="registration-section-content">
                  <h2>Party identity</h2>
                  <p>Choose the title that will appear on official ballots.</p>

                  <label className="field-label" htmlFor="partyName">PARTY NAME</label>
                  <input
                    id="partyName"
                    className="game-input"
                    value={partyName}
                    onChange={(event) => setPartyName(event.target.value)}
                    maxLength={50}
                    placeholder="e.g. Lok Vikas Manch"
                  />

                  <label className="field-label" htmlFor="abbreviation">PARTY ABBREVIATION (2-8 LETTERS)</label>
                  <input
                    id="abbreviation"
                    className="game-input abbreviation-input"
                    value={abbreviation}
                    onChange={(event) => setAbbreviation(event.target.value.toUpperCase().slice(0, 8))}
                    maxLength={8}
                    placeholder="e.g. LVM"
                  />

                  <label className="field-label" htmlFor="slogan">PARTY SLOGAN</label>
                  <input
                    id="slogan"
                    className="game-input"
                    value={slogan}
                    onChange={(event) => setSlogan(event.target.value)}
                    maxLength={160}
                    placeholder="A message the people will remember"
                  />

                  <label className="field-label" htmlFor="description">PARTY DESCRIPTION</label>
                  <textarea
                    id="description"
                    className="game-input game-textarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    maxLength={500}
                    placeholder="What does your movement stand for?"
                  />
                </div>
              </div>

              <div className="registration-separator" />

              <div className="registration-section">
                <div className="section-number">02</div>
                <div className="registration-section-content">
                  <h2>Political ideology</h2>
                  <p>Select your primary ideological foundation.</p>

                  <div className="ideology-grid">
                    {IDEOLOGIES.map((item) => (
                      <button
                        key={item.name}
                        className={`ideology-card ${ideology === item.name ? "ideology-selected" : ""}`}
                        onClick={() => setIdeology(item.name)}
                        type="button"
                        style={{ "--ideology-colour": item.colour } as CSSProperties}
                      >
                        <span className="ideology-icon">{item.icon}</span>
                        <span className="ideology-name">{item.name}</span>
                        <span className="ideology-subtitle">{item.subtitle}</span>
                        <span className="ideology-description">{item.description}</span>
                        {ideology === item.name && (
                          <span className="ideology-check"><Check size={13} /></span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="registration-separator" />

              <div className="registration-section">
                <div className="section-number">03</div>
                <div className="registration-section-content">
                  <h2>Party symbol</h2>
                  <div className="symbol-grid">
                    {SYMBOLS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        className={`symbol-option ${symbol === item ? "symbol-selected" : ""}`}
                        onClick={() => setSymbol(item)}
                      >
                        <span>{symbolEmoji(item)}</span>
                        <small>{item}</small>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="registration-separator" />

              <div className="registration-section">
                <div className="section-number">04</div>
                <div className="registration-section-content">
                  <h2>Party colours</h2>
                  <div className="colour-controls">
                    <label className="colour-picker">
                      <span>PRIMARY COLOUR</span>
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(event) => setPrimaryColor(event.target.value)}
                      />
                      <code>{primaryColor.toUpperCase()}</code>
                    </label>
                    <label className="colour-picker">
                      <span>SECONDARY COLOUR</span>
                      <input
                        type="color"
                        value={secondaryColor}
                        onChange={(event) => setSecondaryColor(event.target.value)}
                      />
                      <code>{secondaryColor.toUpperCase()}</code>
                    </label>
                  </div>
                </div>
              </div>

              <button
                className="primary-button registration-submit"
                onClick={registerParty}
                disabled={busy || partyName.trim().length < 3 || abbreviation.trim().length < 2}
              >
                {busy ? <Loader2 className="spin" size={18} /> : null}
                ESTABLISH &amp; REGISTER POLITICAL PARTY <ArrowRight size={18} />
              </button>
            </div>

            <aside className="party-preview-column">
              <div className="preview-heading">
                <span className="board-kicker">PARTY EMBLEM PREVIEW</span>
                <span className="live-indicator">LIVE</span>
              </div>

              <div
                className="party-flag-preview"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0 50%, ${secondaryColor} 50% 100%)`,
                }}
              >
                <div className="flag-symbol">{symbolEmoji(symbol)}</div>
                <div className="flag-caption">
                  <span>{abbreviation || "YOUR PARTY"}</span>
                </div>
              </div>

              <div className="preview-party-name">
                <small>OFFICIAL REGISTERED TITLE</small>
                <h3>{partyName || "Your Party Name"}</h3>
                <p>{slogan || "Your slogan will appear here."}</p>
              </div>

              <div className="preview-detail">
                <span>IDEOLOGY</span>
                <strong>{ideology}</strong>
              </div>
              <div className="preview-detail">
                <span>FOUNDING STATE</span>
                <strong>{INDIA_REGIONS.find((s) => s.id === campaign?.player.foundingStateId)?.name}</strong>
              </div>

              <div className="starting-resources">
                <span className="board-kicker">STARTING RESOURCES</span>
                <div><Users size={17} /><span>Small Founding Committee</span></div>
                <div><Banknote size={17} /><span>₹2,50,000 Party Funds</span></div>
                <div><Vote size={17} /><span>0 Elected Representatives</span></div>
                <div><Star size={17} /><span>Grassroots Recognition (1%)</span></div>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* SCREEN 4: INTERACTIVE HEADQUARTERS & CAMPAIGN COMMAND CENTER */}
      {screen === "headquarters" && campaign && party && (
        <section className="headquarters-screen" style={{ maxWidth: 1200 }}>
          {/* Top Bar with Turn Progression */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "16px 20px",
              background: "#F8F1E3",
              border: "3px solid #34495E",
              boxShadow: "var(--shadow)",
              marginBottom: 20,
            }}
          >
            <div>
              <span className="board-kicker">SIMULATION CALENDAR</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                <Calendar size={20} color="#D96B42" />
                <strong style={{ fontSize: 20, fontFamily: "Georgia, serif" }}>
                  {new Date(campaign.calendar.currentDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                <span style={{ padding: "3px 8px", background: "#E5B94F", border: "1px solid #34495E", fontSize: 10, fontWeight: 900 }}>
                  TURN {campaign.calendar.currentTurn}
                </span>
              </div>
            </div>

            {/* Time Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="primary-button"
                style={{ marginTop: 0, padding: "10px 16px", background: "#557C55" }}
                onClick={() => {
                  advanceSimulationDay();
                  setMessage("Turn advanced by 1 day.");
                }}
              >
                <Play size={15} /> ADVANCE 1 DAY
              </button>
              <button
                className="primary-button"
                style={{ marginTop: 0, padding: "10px 16px", background: "#D96B42" }}
                onClick={() => {
                  advanceSimulationWeek();
                  setMessage("Turn advanced by 1 week.");
                }}
              >
                <FastForward size={15} /> ADVANCE 1 WEEK
              </button>
              <Link
                href="/map"
                className="primary-button"
                style={{ marginTop: 0, padding: "10px 16px", background: "#34495E", textDecoration: "none" }}
              >
                <Globe size={15} /> POLITICAL MAP
              </Link>
            </div>
          </div>

          {/* Party Banner */}
          <div
            style={{
              padding: "18px 24px",
              background: party.branding.primaryColor,
              color: "#FFF",
              border: "3px solid #34495E",
              boxShadow: "var(--shadow)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 36 }}>{symbolEmoji(party.branding.symbol)}</span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h1 style={{ margin: 0, fontSize: 26, fontFamily: "Georgia, serif", fontWeight: 900 }}>
                    {party.name} ({party.abbreviation})
                  </h1>
                  <span
                    style={{
                      padding: "3px 8px",
                      background: "rgba(0,0,0,0.3)",
                      borderRadius: 3,
                      fontSize: 10,
                      fontWeight: 900,
                    }}
                  >
                    {party.ideology.toUpperCase()}
                  </span>
                </div>
                <p style={{ margin: "4px 0 0", fontStyle: "italic", fontSize: 13, opacity: 0.9 }}>
                  &ldquo;{party.branding.slogan}&rdquo;
                </p>
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>STATE HQ</span>
              <strong style={{ display: "block", fontSize: 14 }}>
                {INDIA_REGIONS.find((r) => r.id === campaign.player.foundingStateId)?.name}
              </strong>
            </div>
          </div>

          {/* Key Metric Cards */}
          <div className="hq-stats" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 25 }}>
            <div>
              <Banknote size={24} />
              <small>PARTY TREASURY</small>
              <strong style={{ color: "#557C55" }}>₹{treasuryBalance.toLocaleString("en-IN")}</strong>
            </div>
            <div>
              <Users size={24} />
              <small>ACTIVE VOLUNTEERS</small>
              <strong>{campaign.organization.members.filter((m) => m.partyId === party.id).length}</strong>
            </div>
            <div>
              <Award size={24} />
              <small>RECRUITED LEADERS</small>
              <strong>{campaign.organization.leaders.filter((l) => l.partyId === party.id).length}</strong>
            </div>
            <div>
              <Landmark size={24} />
              <small>ELECTED SEATS</small>
              <strong>
                {playerSeatsWon.mlas} MLAs · {playerSeatsWon.mps} MPs
              </strong>
            </div>
          </div>

          {/* Headquarters Tab Navigation */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              borderBottom: "2px solid #34495E",
              paddingBottom: 2,
              marginBottom: 20,
            }}
          >
            <button
              onClick={() => setHqTab("actions")}
              style={{
                padding: "10px 18px",
                border: "2px solid #34495E",
                borderBottom: hqTab === "actions" ? "2px solid #F5E6C8" : "2px solid #34495E",
                background: hqTab === "actions" ? "#F5E6C8" : "#E8D3AC",
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ✊ POLITICAL ACTIONS
            </button>
            <button
              onClick={() => setHqTab("cadre")}
              style={{
                padding: "10px 18px",
                border: "2px solid #34495E",
                borderBottom: hqTab === "cadre" ? "2px solid #F5E6C8" : "2px solid #34495E",
                background: hqTab === "cadre" ? "#F5E6C8" : "#E8D3AC",
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              👥 CADRE &amp; VOLUNTEERS ({campaign.organization.members.filter((m) => m.partyId === party.id).length})
            </button>
            <button
              onClick={() => setHqTab("leaders")}
              style={{
                padding: "10px 18px",
                border: "2px solid #34495E",
                borderBottom: hqTab === "leaders" ? "2px solid #F5E6C8" : "2px solid #34495E",
                background: hqTab === "leaders" ? "#F5E6C8" : "#E8D3AC",
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ⭐ LEADERS &amp; RECRUITMENT ({campaign.organization.leaders.filter((l) => l.partyId === party.id).length})
            </button>
            <button
              onClick={() => setHqTab("elections")}
              style={{
                padding: "10px 18px",
                border: "2px solid #34495E",
                borderBottom: hqTab === "elections" ? "2px solid #F5E6C8" : "2px solid #34495E",
                background: hqTab === "elections" ? "#F5E6C8" : "#E8D3AC",
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ⚔️ ELECTIONS &amp; CONTESTS ({campaign.elections.filter((e) => e.status !== "completed").length})
            </button>
            <button
              onClick={() => setHqTab("parliament")}
              style={{
                padding: "10px 18px",
                border: "2px solid #34495E",
                borderBottom: hqTab === "parliament" ? "2px solid #F5E6C8" : "2px solid #34495E",
                background: hqTab === "parliament" ? "#F5E6C8" : "#E8D3AC",
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              🏛️ NATIONAL PARLIAMENT (543)
            </button>
            <button
              onClick={() => setHqTab("policies")}
              style={{
                padding: "10px 18px",
                border: "2px solid #34495E",
                borderBottom: hqTab === "policies" ? "2px solid #F5E6C8" : "2px solid #34495E",
                background: hqTab === "policies" ? "#F5E6C8" : "#E8D3AC",
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              📜 POLICY REFORMS
            </button>
            <button
              onClick={() => setHqTab("history")}
              style={{
                padding: "10px 18px",
                border: "2px solid #34495E",
                borderBottom: hqTab === "history" ? "2px solid #F5E6C8" : "2px solid #34495E",
                background: hqTab === "history" ? "#F5E6C8" : "#E8D3AC",
                fontWeight: 900,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              📰 CAMPAIGN DISPATCHES ({campaign.history.events.length})
            </button>
          </div>

          {/* TAB CONTENT: ACTIONS */}
          {hqTab === "actions" && (
            <div className="paper-panel" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <span className="board-kicker">GRASSROOTS OPERATIONS</span>
                  <h2 style={{ margin: "4px 0 0", fontFamily: "Georgia, serif" }}>Deploy Party Resources</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                    Expend treasury funds to organize rallies, recruit volunteers, and expand organizational strength.
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <small style={{ fontWeight: 900, color: "var(--ink-soft)" }}>AVAILABLE FUNDS</small>
                  <strong style={{ display: "block", fontSize: 18, color: "#557C55" }}>
                    ₹{treasuryBalance.toLocaleString("en-IN")}
                  </strong>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                {POLITICAL_ACTIONS.map((act) => {
                  const canAfford = treasuryBalance >= act.cost;

                  return (
                    <div
                      key={act.type}
                      style={{
                        padding: 16,
                        background: "#FFFDF6",
                        border: "2px solid #8C5946",
                        borderRadius: 4,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: 14, fontFamily: "Georgia, serif" }}>{act.name}</strong>
                          <span
                            style={{
                              padding: "2px 8px",
                              background: canAfford ? "#E2EDDC" : "#FCEADE",
                              color: canAfford ? "#557C55" : "#D96B42",
                              fontWeight: 900,
                              fontSize: 11,
                              border: "1px solid #34495E",
                            }}
                          >
                            ₹{act.cost.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <p style={{ margin: "8px 0 0", fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                          {act.description}
                        </p>
                        <p style={{ margin: "8px 0 0", fontSize: 10, fontWeight: 700, color: "#557C55" }}>
                          ✦ {act.effectSummary}
                        </p>
                      </div>

                      <button
                        className="primary-button"
                        style={{ marginTop: 14, padding: "10px" }}
                        disabled={!canAfford}
                        onClick={() => {
                          if (act.type === "district_office") {
                            setIsOfficeModalOpen(true);
                          } else {
                            handleTakeAction(act.type);
                          }
                        }}
                      >
                        {canAfford ? `EXECUTE ACTION (₹${act.cost.toLocaleString("en-IN")})` : "INSUFFICIENT FUNDS"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT: CADRE & VOLUNTEERS */}
          {hqTab === "cadre" && (
            <CadreManagementView
              campaign={campaign}
              onUpdateCampaign={(updated, msg) => {
                updateCampaign(() => updated);
                if (msg) setMessage(msg);
              }}
            />
          )}

          {/* TAB CONTENT: LEADERS */}
          {hqTab === "leaders" && (
            <div className="paper-panel" style={{ padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <span className="board-kicker">PARTY LEADERSHIP COMMITTEE</span>
                  <h2 style={{ margin: "4px 0 0", fontFamily: "Georgia, serif" }}>Recruit Political Leaders</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                    Leaders bring distinct political perks, improve candidate popularity, and broker post-election coalitions.
                  </p>
                </div>
                <button
                  className="primary-button"
                  style={{ marginTop: 0, padding: "8px 16px", background: "#7D2E1E" }}
                  onClick={() => setIsDisciplineModalOpen(true)}
                >
                  <ShieldAlert size={15} /> PARTY DISCIPLINE &amp; DEFECTIONS
                </button>
              </div>

              {/* Recruited Leaders Section */}
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "#8C5946", marginBottom: 10 }}>
                  Active Party Committee ({campaign.organization.leaders.filter((l) => l.partyId === party.id).length})
                </h3>
                {campaign.organization.leaders.filter((l) => l.partyId === party.id).length === 0 ? (
                  <p style={{ fontSize: 12, color: "var(--ink-soft)", fontStyle: "italic" }}>
                    No additional leaders recruited yet. Recruit your first leader from the national directory below.
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
                    {campaign.organization.leaders
                      .filter((l) => l.partyId === party.id)
                      .map((l) => (
                        <div
                          key={l.id}
                          style={{
                            padding: 14,
                            background: "#FFFDF6",
                            border: "2px solid #557C55",
                            borderRadius: 4,
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: 15, fontFamily: "Georgia, serif" }}>{l.name}</strong>
                            <span style={{ fontSize: 10, padding: "2px 6px", background: "#557C55", color: "#FFF", borderRadius: 2 }}>
                              ACTIVE
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#8C5946" }}>{l.role}</p>
                          <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 10, color: "var(--ink-soft)" }}>
                            <span>Popularity: <strong>{l.popularity}%</strong></span>
                            <span>Experience: <strong>{l.experience}%</strong></span>
                            <span>Loyalty: <strong>{l.loyalty}%</strong></span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Directory of Recruitable Leaders */}
              <div>
                <h3 style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1, color: "#8C5946", marginBottom: 10 }}>
                  Available Political Figures to Recruit
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                  {RECRUITABLE_LEADERS.map((template) => {
                    const isRecruited = campaign.organization.leaders.some((l) => l.id === template.id);
                    const canAfford = treasuryBalance >= template.recruitmentCost;

                    return (
                      <div
                        key={template.id}
                        style={{
                          padding: 16,
                          background: isRecruited ? "#EAE2CF" : "#FFFDF6",
                          border: `2px solid ${isRecruited ? "#999" : "#8C5946"}`,
                          borderRadius: 4,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          opacity: isRecruited ? 0.7 : 1,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <strong style={{ fontSize: 15, fontFamily: "Georgia, serif" }}>{template.name}</strong>
                            <span
                              style={{
                                padding: "2px 8px",
                                background: isRecruited ? "#999" : canAfford ? "#E2EDDC" : "#FCEADE",
                                color: isRecruited ? "#FFF" : canAfford ? "#557C55" : "#D96B42",
                                fontWeight: 900,
                                fontSize: 10,
                                border: "1px solid #34495E",
                              }}
                            >
                              {isRecruited ? "JOINED" : `₹${template.recruitmentCost.toLocaleString("en-IN")}`}
                            </span>
                          </div>
                          <p style={{ margin: "4px 0 0", fontSize: 11, fontWeight: 700, color: "#D96B42", textTransform: "capitalize" }}>
                            {template.archetype.replace(/_/g, " ")} · {INDIA_REGIONS.find((r) => r.id === template.stateId)?.name}
                          </p>
                          <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                            {template.description}
                          </p>
                          <p style={{ margin: "6px 0 0", fontSize: 10, fontWeight: 700, color: "#557C55" }}>
                            ✦ {template.perkDescription}
                          </p>
                        </div>

                        <button
                          className="primary-button"
                          style={{ marginTop: 14, padding: "9px" }}
                          disabled={isRecruited || !canAfford}
                          onClick={() => handleRecruitLeader(template.id)}
                        >
                          {isRecruited ? "ALREADY ON COMMITTEE" : canAfford ? `RECRUIT (${template.name})` : "INSUFFICIENT FUNDS"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: ELECTIONS */}
          {hqTab === "elections" && (
            <div className="paper-panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <span className="board-kicker">ELECTION COMMISSION SCHEDULE</span>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Georgia, serif" }}>Electoral Battles &amp; Contests</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                  Nominate candidates in scheduled elections, campaign in constituencies, and simulate democratic polling.
                </p>
              </div>

              {campaign.elections.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", background: "#FFFDF6", border: "1px dashed #8C5946" }}>
                  <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>
                    No elections are currently in the schedule notice window. Advance simulation turns to reach upcoming elections!
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {campaign.elections
                    .filter((elec, idx, arr) => arr.findIndex((e) => e.id === elec.id) === idx)
                    .map((elec) => {
                    const region = elec.stateId ? INDIA_REGIONS.find((r) => r.id === elec.stateId) : null;
                    const isCompleted = elec.status === "completed";
                    const isPolling = elec.status === "polling";
                    const isCampaigning = elec.status === "campaigning";

                    return (
                      <div
                        key={elec.id}
                        style={{
                          padding: 18,
                          background: isCompleted ? "#F2EADB" : "#FFFDF6",
                          border: `2px solid ${isCompleted ? "#999" : isPolling ? "#D96B42" : "#34495E"}`,
                          borderRadius: 4,
                          boxShadow: "2px 3px 0 rgba(0,0,0,0.08)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <span
                              style={{
                                padding: "2px 8px",
                                background: isCompleted ? "#557C55" : isPolling ? "#D96B42" : isCampaigning ? "#E5B94F" : "#34495E",
                                color: "#FFF",
                                fontSize: 9,
                                fontWeight: 900,
                                textTransform: "uppercase",
                                borderRadius: 2,
                              }}
                            >
                              {elec.status}
                            </span>
                            <h3 style={{ margin: "6px 0 0", fontSize: 18, fontFamily: "Georgia, serif" }}>
                              {elec.name}
                            </h3>
                            <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8C5946" }}>
                              Polling Date: <strong>{new Date(elec.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong>
                              {region && ` · ${region.assemblySeats} Assembly Seats`}
                            </p>
                          </div>

                          {/* Action Buttons for election */}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {!isCompleted ? (
                              <>
                                <button
                                  className="primary-button"
                                  style={{ marginTop: 0, padding: "8px 14px", background: "#2E5266" }}
                                  onClick={() => setCoalitionModalElectionId(elec.id)}
                                >
                                  <Handshake size={15} /> COALITION &amp; SEAT-SHARING
                                </button>
                                <button
                                  className="primary-button"
                                  style={{ marginTop: 0, padding: "8px 14px", background: "#7D2E1E" }}
                                  onClick={() => setTicketModalElectionId(elec.id)}
                                >
                                  <Flame size={15} /> TICKET ALLOCATION &amp; REBELS
                                </button>
                                <button
                                  className="primary-button"
                                  style={{ marginTop: 0, padding: "8px 14px", background: "#34495E" }}
                                  onClick={() => setNominationModalElectionId(elec.id)}
                                >
                                  <Users size={15} /> CANDIDATE DIRECTORY &amp; NOMINATIONS
                                </button>
                                <button
                                  className="primary-button"
                                  style={{ marginTop: 0, padding: "8px 14px", background: "#D96B42" }}
                                  onClick={() => handleSimulateElection(elec.id)}
                                >
                                  <Vote size={15} /> SIMULATE POLLING &amp; RESULTS
                                </button>
                              </>
                            ) : (
                              <button
                                className="primary-button"
                                style={{ marginTop: 0, padding: "6px 14px", background: "#2E5266", fontSize: 11 }}
                                onClick={() => setCoalitionModalElectionId(elec.id)}
                              >
                                <Handshake size={14} /> VIEW POST-POLL BARGAIN &amp; CABINET
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Candidate Nomination Section (if active) */}
                        {!isCompleted && (
                          <div
                            style={{
                              marginTop: 14,
                              paddingTop: 12,
                              borderTop: "1px dashed #D6B995",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              flexWrap: "wrap",
                              gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#2C3E50" }}>
                                Party Candidates Fielded:
                              </span>
                              <strong style={{ fontSize: 13, color: "#D96B42" }}>
                                {elec.candidates.filter((c) => c.partyId === party.id).length} of {region?.assemblySeats ?? 543} seats
                              </strong>
                              <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>
                                (Security deposits paid: ₹{(elec.candidates.filter((c) => c.partyId === party.id).length * (elec.type === "lok_sabha" ? 10000 : 5000)).toLocaleString("en-IN")})
                              </span>
                            </div>
                            <button
                              className="primary-button"
                              style={{ marginTop: 0, padding: "6px 14px", width: "auto", fontSize: 11, background: "#557C55" }}
                              onClick={() => setNominationModalElectionId(elec.id)}
                            >
                              FIELD CANDIDATES / SCOUT
                            </button>
                          </div>
                        )}

                        {/* Completed Election Results Summary */}
                        {isCompleted && elec.results.length > 0 && (
                          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #BBA47D" }}>
                            <strong style={{ fontSize: 11, color: "#557C55" }}>✓ OFFICIAL RESULTS CERTIFIED</strong>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                              {(() => {
                                const seatWins = new Map<string, number>();
                                for (const res of elec.results) {
                                  if (res.won) {
                                    seatWins.set(res.partyId, (seatWins.get(res.partyId) ?? 0) + 1);
                                  }
                                }
                                return Array.from(seatWins.entries()).map(([pId, seats]) => {
                                  const p = campaign.politicalWorld.parties.find((item) => item.id === pId);
                                  return (
                                    <span
                                      key={pId}
                                      style={{
                                        padding: "3px 8px",
                                        background: "#FFFDF6",
                                        border: "1px solid #34495E",
                                        fontSize: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {p?.abbreviation ?? pId.toUpperCase()}: <strong>{seats} seats</strong>
                                    </span>
                                  );
                                });
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Candidate Nomination Directory Modal */}
              {nominationModalElectionId && (
                <CandidateNominationModal
                  isOpen={Boolean(nominationModalElectionId)}
                  electionId={nominationModalElectionId}
                  onClose={() => setNominationModalElectionId(null)}
                  onSuccess={(msg) => setMessage(msg)}
                />
              )}

              {/* Ticket Allocation & Rebel Management Modal */}
              {ticketModalElectionId && (
                <TicketDistributionModal
                  isOpen={Boolean(ticketModalElectionId)}
                  electionId={ticketModalElectionId}
                  onClose={() => setTicketModalElectionId(null)}
                  onSuccess={(msg) => setMessage(msg)}
                />
              )}

              {/* Coalition Negotiation & Seat-Sharing Modal */}
              {coalitionModalElectionId && (
                <CoalitionNegotiationModal
                  isOpen={Boolean(coalitionModalElectionId)}
                  electionId={coalitionModalElectionId}
                  onClose={() => setCoalitionModalElectionId(null)}
                  onSuccess={(msg) => setMessage(msg)}
                />
              )}
            </div>
          )}

          {/* TAB CONTENT: PARLIAMENT (543 SEATS) */}
          {hqTab === "parliament" && (
            <div className="paper-panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <span className="board-kicker">LOK SABHA · 18TH PARLIAMENT</span>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Georgia, serif" }}>National Parliamentary Arithmetic</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                  543 Parliamentary Constituencies across all states and Union Territories. Majority mark: 272 seats.
                </p>
              </div>

              {/* Alliance Tally */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
                <div style={{ padding: 14, background: "#FFFDF6", border: "2px solid #E5A13A", borderRadius: 4 }}>
                  <small style={{ fontWeight: 900, color: "#8C5946" }}>NDA (GOVERNING)</small>
                  <strong style={{ display: "block", fontSize: 24, color: "#E5A13A" }}>{parliamentTally.nda} SEATS</strong>
                  <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Majority threshold (+{parliamentTally.nda - 272})</span>
                </div>
                <div style={{ padding: 14, background: "#FFFDF6", border: "2px solid #4D78A8", borderRadius: 4 }}>
                  <small style={{ fontWeight: 900, color: "#8C5946" }}>PUF (OPPOSITION)</small>
                  <strong style={{ display: "block", fontSize: 24, color: "#4D78A8" }}>{parliamentTally.puf} SEATS</strong>
                  <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Main federal opposition front</span>
                </div>
                <div style={{ padding: 14, background: "#FFFDF6", border: "2px solid #557C55", borderRadius: 4 }}>
                  <small style={{ fontWeight: 900, color: "#8C5946" }}>YOUR PARTY ({party.abbreviation})</small>
                  <strong style={{ display: "block", fontSize: 24, color: "#557C55" }}>{parliamentTally.player} SEATS</strong>
                  <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>Contest general election in 2029</span>
                </div>
                <div style={{ padding: 14, background: "#FFFDF6", border: "2px solid #8C5946", borderRadius: 4 }}>
                  <small style={{ fontWeight: 900, color: "#8C5946" }}>REGIONAL &amp; INDEPENDENTS</small>
                  <strong style={{ display: "block", fontSize: 24, color: "#8C5946" }}>{parliamentTally.others} SEATS</strong>
                  <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>State-based parties</span>
                </div>
              </div>

              {/* Horizontal Parliament Seat Bar */}
              <div
                style={{
                  height: 28,
                  display: "flex",
                  width: "100%",
                  borderRadius: 4,
                  overflow: "hidden",
                  border: "2px solid #34495E",
                  position: "relative",
                  background: "#E8D3AC",
                  marginBottom: 16,
                }}
              >
                {parliamentTally.partyStats.map((stat) => (
                  <div
                    key={stat.partyId}
                    title={`${stat.name} (${stat.abbreviation}): ${stat.seats} seats`}
                    style={{
                      width: `${(stat.seats / 543) * 100}%`,
                      backgroundColor: stat.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFF",
                      fontSize: 9,
                      fontWeight: 900,
                      textShadow: "0 1px 2px rgba(0,0,0,0.6)",
                      borderRight: "1px solid rgba(0,0,0,0.2)",
                    }}
                  >
                    {stat.seats >= 15 ? stat.abbreviation : ""}
                  </div>
                ))}
                {/* 272 Majority Indicator */}
                <div
                  title="272 Majority Mark"
                  style={{
                    position: "absolute",
                    left: `${(272 / 543) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: "3px",
                    backgroundColor: "#000",
                    zIndex: 2,
                    boxShadow: "0 0 4px #fff",
                  }}
                />
              </div>

              {/* Party-wise list */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                {parliamentTally.partyStats.map((stat) => (
                  <div
                    key={stat.partyId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "6px 10px",
                      background: "#FFFDF6",
                      border: "1px solid #D6B995",
                      fontSize: 11,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: stat.color,
                          borderRadius: 2,
                          border: "1px solid #34495E",
                        }}
                      />
                      <strong>{stat.abbreviation}</strong>
                    </div>
                    <span>{stat.seats} MPs</span>
                  </div>
                ))}
              </div>

              {/* State-by-State Parliamentary Constituencies Drill-down */}
              {selectedParliamentRegion ? (
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: "2px solid #E2D7C3" }}>
                  <StateParliamentaryView
                    campaign={campaign}
                    region={selectedParliamentRegion}
                    onBackToNational={() => setSelectedParliamentStateId(null)}
                  />
                </div>
              ) : (
                <div style={{ marginTop: 24, paddingTop: 18, borderTop: "2px solid #E2D7C3" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 16, fontFamily: "Georgia, serif" }}>
                        Explore All 543 Parliamentary Constituencies by State / UT
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--ink-soft)" }}>
                        Select any state below to inspect its Lok Sabha seats, reservation categories, incumbent MPs, and ground Assembly segments.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8 }}>
                    {INDIA_REGIONS.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedParliamentStateId(r.id)}
                        style={{
                          padding: "8px 10px",
                          backgroundColor: "#FFFDF6",
                          border: "1px solid #D6B995",
                          borderRadius: 3,
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div>
                          <strong style={{ display: "block", fontSize: 12, color: "#2C3E50" }}>{r.name}</strong>
                          <span style={{ fontSize: 10, color: "#8C5946" }}>{r.kind === "union_territory" ? "UT" : "State"}</span>
                        </div>
                        <span
                          style={{
                            padding: "2px 6px",
                            background: "#34495E",
                            color: "#FFF",
                            borderRadius: 2,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {r.lokSabhaSeats} LS
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: POLICIES */}
          {hqTab === "policies" && (
            <div className="paper-panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <span className="board-kicker">GOVERNANCE &amp; POLICY REFORMS</span>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Georgia, serif" }}>Sponsor &amp; Enact Public Schemes</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                  Translate your political ideology into tangible public welfare and development projects.
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
                {NATIONAL_POLICIES.map((policy) => {
                  const canAfford = treasuryBalance >= policy.cost;

                  return (
                    <div
                      key={policy.id}
                      style={{
                        padding: 16,
                        background: "#FFFDF6",
                        border: "2px solid #8C5946",
                        borderRadius: 4,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: 14, fontFamily: "Georgia, serif" }}>{policy.title}</strong>
                          <span
                            style={{
                              padding: "2px 8px",
                              background: canAfford ? "#E2EDDC" : "#FCEADE",
                              color: canAfford ? "#557C55" : "#D96B42",
                              fontWeight: 900,
                              fontSize: 10,
                              border: "1px solid #34495E",
                            }}
                          >
                            ₹{policy.cost.toLocaleString("en-IN")}
                          </span>
                        </div>
                        <span
                          style={{
                            display: "inline-block",
                            margin: "4px 0",
                            fontSize: 9,
                            fontWeight: 900,
                            textTransform: "uppercase",
                            color: "#D96B42",
                          }}
                        >
                          {policy.category}
                        </span>
                        <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                          {policy.description}
                        </p>
                        <p style={{ margin: "6px 0 0", fontSize: 10, fontWeight: 700, color: "#557C55" }}>
                          ✦ {policy.effectDescription}
                        </p>
                      </div>

                      <button
                        className="primary-button"
                        style={{ marginTop: 14, padding: "10px" }}
                        disabled={!canAfford}
                        onClick={() => handleEnactPolicy(policy.id)}
                      >
                        {canAfford ? `PROMULGATE SCHEME (₹${policy.cost.toLocaleString("en-IN")})` : "INSUFFICIENT FUNDS"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB CONTENT: HISTORY & DISPATCHES */}
          {hqTab === "history" && (
            <div className="paper-panel" style={{ padding: 24 }}>
              <div style={{ marginBottom: 18 }}>
                <span className="board-kicker">CHRONICLE OF EVENTS</span>
                <h2 style={{ margin: "4px 0 0", fontFamily: "Georgia, serif" }}>Political Dispatches</h2>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
                  A recorded timeline of all historical rallies, election results, committee expansions, and government formations.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[...campaign.history.events].reverse().map((ev) => (
                  <div
                    key={ev.id}
                    style={{
                      padding: "12px 16px",
                      background: "#FFFDF6",
                      borderLeft: `4px solid ${
                        ev.importance === "critical"
                          ? "#D96B42"
                          : ev.importance === "high"
                          ? "#E5B94F"
                          : "#557C55"
                      }`,
                      border: "1px solid #D6B995",
                      borderLeftWidth: 4,
                      borderRadius: 2,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13, fontFamily: "Georgia, serif" }}>{ev.title}</strong>
                      <span style={{ fontSize: 10, color: "var(--ink-soft)", fontWeight: 700 }}>
                        {new Date(ev.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                      {ev.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

                    {/* District Office Building Modal */}
          <DistrictOfficeModal
            campaign={campaign}
            isOpen={isOfficeModalOpen}
            onClose={() => setIsOfficeModalOpen(false)}
            onOfficeBuilt={(updated, msg) => {
              updateCampaign(() => updated);
              setMessage(msg);
            }}
          />

          {/* Party Discipline & Defections Modal */}
          <PartyDisciplineModal
            isOpen={isDisciplineModalOpen}
            onClose={() => setIsDisciplineModalOpen(false)}
            onSuccess={(msg) => setMessage(msg)}
          />

          {/* Footer Navigation Bar */}
          <div className="hq-footer" style={{ marginTop: 25, padding: "12px 0", borderTop: "1px dashed #BBA47D" }}>
            <span>
              {campaign.metadata.campaignName.toUpperCase()} · REPUBLIC OF INDIA · {new Date(campaign.calendar.currentDate).getFullYear()}
            </span>
            <div style={{ display: "flex", gap: 10 }}>
              <Link href="/map" className="primary-button" style={{ marginTop: 0, textDecoration: "none" }}>
                VIEW POLITICAL MAP <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {busy && screen === "menu" && (
        <div className="busy-overlay">
          <Loader2 className="spin" size={28} />
          <span>Opening your political journey...</span>
        </div>
      )}
    </main>
  );
}

function symbolEmoji(symbol: string) {
  const icons: Record<string, string> = {
    Flag: "🚩",
    Lion: "🦁",
    Sun: "☀️",
    Elephant: "🐘",
    Tree: "🌳",
    Hand: "✋",
    Star: "⭐",
    Wheel: "☸️",
    Torch: "🔥",
    Book: "📖",
    Flower: "🌼",
    "Rising Sun": "🌅",
  };

  return icons[symbol] || "🚩";
}
