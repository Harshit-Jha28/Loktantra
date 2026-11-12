import type { LeaderArchetype } from "@/data/india2026";
import type { ReservationCategory } from "@/types/constituency";

export type { LeaderArchetype } from "@/data/india2026";
export type { ReservationCategory } from "@/types/constituency";

export type Ideology =
  | "Progressive"
  | "Centrist"
  | "Nationalist"
  | "Regionalist";

export type GovernmentType =
  | "majority"
  | "coalition"
  | "minority"
  | "caretaker"
  | "president_rule"
  | "unconfigured";

export type ElectionType =
  | "lok_sabha"
  | "vidhan_sabha"
  | "by_election"
  | "local";

export type ElectionStatus =
  | "scheduled"
  | "campaigning"
  | "polling"
  | "results"
  | "completed";

export type CadreTier =
  | "volunteer"
  | "worker"
  | "booth_coordinator"
  | "district_organizer"
  | "state_leader";

export type CandidateOrigin =
  | "party_leader"
  | "cadre_member"
  | "recruited_leader"
  | "scouted_local"
  | "ai_incumbent";

export type CampaignStyle =
  | "grassroots"
  | "orator"
  | "technocrat"
  | "money_power";

export type TicketAllocationStatus =
  | "claimed"
  | "confirmed"
  | "denied"
  | "withdrawn";

export interface TicketClaimant {
  candidateId: string;
  name: string;
  partyId: string;
  constituencyId: string;
  popularity: number;
  experience: number;
  loyalty: number;
  claimStrength: number; // 0-100: calculated from loyalty, popularity, experience, incumbency
  status: TicketAllocationStatus;
  dissatisfaction: number; // 0-100
  rebelRisk: number; // 0-100: percentage probability of rebelling if denied ticket
}

export interface RebelCandidate {
  id: string;
  candidateId: string;
  name: string;
  originalPartyId: string;
  constituencyId: string;
  electionId: string;
  popularity: number;
  voteSplitFactor: number; // 0.10 - 0.45: share of original party votes split away
  isIndependent: boolean;
  joinedPartyId?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  partyId: string;
  stateId: string;
  constituencyId?: string | null;
  age: number;
  gender: "male" | "female";
  reservationCategory: ReservationCategory;
  popularity: number; // 0-100
  experience: number; // 0-100
  integrity: number; // 0-100
  campaignStyle: CampaignStyle;
  origin: CandidateOrigin;
  sourceId?: string; // Links to member or leader ID
  isIncumbent?: boolean;
  ambition?: number; // 0-100
  dissatisfaction?: number; // 0-100
  preferredConstituencyId?: string | null;
}

export interface CampaignMetadata {
  id: string;
  campaignName: string;
  createdAt: string;
  updatedAt: string;
  gameVersion: string;
}

export interface CampaignCalendar {
  currentDate: string;
  startDate: string;
  currentTurn: number;
  paused: boolean;
}

export interface PartyBranding {
  slogan: string;
  symbol: string;
  primaryColor: string;
  secondaryColor: string;
}

export interface PoliticalParty {
  id: string;
  name: string;
  abbreviation: string;
  ideology: Ideology;
  description: string;
  branding: PartyBranding;
  foundedYear: number;
  headquartersStateId: string | null;
  allianceId: string | null;
  organizationStrength: number;
  electoralStrength: number;
  popularity: number;
  funds: number;
  isPlayerParty: boolean;
  isActive: boolean;
}

export interface PoliticalAlliance {
  id: string;
  name: string;
  abbreviation: string;
  memberPartyIds: string[];
  leaderPartyId: string | null;
  isActive: boolean;
}

export interface ChiefMinisterProfile {
  id: string;
  name: string;
  stateId: string;
  partyId: string;
  age: number;
  experience: number; // 0-100
  approvalRating: number; // 0-100
  leaderArchetype: LeaderArchetype;
  coalitionManagementSkill: number; // 0-100
  tenureDays: number;
  avatarSeed?: string;
  bio?: string;
}

export interface StateGovernment {
  stateId: string;
  rulingPartyId: string | null;
  rulingAllianceId: string | null;
  chiefMinisterName: string | null;
  chiefMinister?: ChiefMinisterProfile | null;
  cabinetStability?: number; // 0-100
  cabinetSeats?: number;
  governmentType: GovernmentType;
  assemblyTermEnd: string | null;
}

export interface ConstituencyControl {
  constituencyId: string;
  constituencyType: ElectionType;
  stateId: string;
  winningPartyId: string | null;
  candidateId: string | null;
  lastElectionId: string | null;
}

export interface PartyMember {
  id: string;
  partyId: string;
  name: string;
  role: string;
  tier?: CadreTier;
  stateId: string | null;
  districtName?: string | null;
  constituencyId: string | null;
  loyalty: number;
  influence: number;
  experience?: number;
  enthusiasm?: number;
  joinedAt: string;
}

export interface PartyDistrictOffice {
  id: string;
  partyId: string;
  stateId: string;
  districtName: string;
  establishedDate: string;
  level: number; // 1 = District Branch, 2 = Regional Headquarters
  cadreCount: number;
}

export interface PoliticalLeader {
  id: string;
  partyId: string;
  name: string;
  role: string;
  stateId: string | null;
  popularity: number;
  experience: number;
  loyalty: number;
}

export interface FinanceTransaction {
  id: string;
  partyId: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string;
  date: string;
}

export interface PartyTreasury {
  partyId: string;
  balance: number;
  transactions: FinanceTransaction[];
}

export interface ElectionCandidate {
  id: string;
  name: string;
  partyId: string;
  constituencyId: string;
  popularity: number;
  experience: number;
  reservationCategory?: ReservationCategory;
  stateId?: string;
  age?: number;
  campaignStyle?: CampaignStyle;
  sourceProfileId?: string;
  isRebel?: boolean;
  formerPartyId?: string;
  voteSplitFactor?: number;
}

export interface ElectionResult {
  candidateId: string;
  partyId: string;
  votes: number;
  voteShare: number;
  won: boolean;
}

export interface Election {
  id: string;
  name: string;
  type: ElectionType;
  stateId: string | null;
  date: string;
  status: ElectionStatus;
  candidates: ElectionCandidate[];
  results: ElectionResult[];
  rebels?: RebelCandidate[];
  ticketClaimants?: TicketClaimant[];
}

export interface CampaignEvent {
  id: string;
  date: string;
  category: string;
  title: string;
  description: string;
  importance: "low" | "medium" | "high" | "critical";
}

export interface PoliticalRelationship {
  id: string;
  sourcePartyId: string;
  targetPartyId: string;
  relationship: "friendly" | "neutral" | "rival" | "hostile";
  strength: number;
}

export interface CoalitionAgreement {
  id: string;
  electionId: string;
  allianceId: string;
  partnerPartyIds: string[];
  leadPartyId: string;
  seatQuotas: Record<string, number>; // partyId -> number of seats agreed
  allocatedSeats: Record<string, string>; // constituencyId -> partyId
  cmpPolicies: string[]; // policy IDs agreed in Common Minimum Programme
  ideologicalFriction: number; // 0-100
  status: "negotiating" | "agreed" | "collapsed";
}

export interface PostPollBargain {
  electionId: string;
  stateId: string;
  claimantPartyIds: string[];
  leadPartyId: string;
  cabinetPortfolios: Record<string, number>; // partyId -> number of cabinet berths
  hasDeputyChiefMinister: boolean;
  deputyCmPartyId?: string;
  stabilityScore: number; // 0-100
  status: "proposed" | "ratified" | "deadlocked";
}

export interface PartyFaction {
  id: string;
  partyId: string;
  name: string;
  leaderId: string;
  leaderName: string;
  memberCount: number;
  influence: number; // 0-100
  loyaltyToHighCommand: number; // 0-100
  grievanceLevel: number; // 0-100
}

export interface DefectionAttempt {
  id: string;
  targetId: string; // leader or member ID
  targetName: string;
  sourcePartyId: string;
  destinationPartyId: string;
  cost: number;
  successProbability: number; // 0-100
  status: "attempted" | "succeeded" | "failed";
  date: string;
}

export interface AntiDefectionEvent {
  id: string;
  stateId: string;
  originalPartyId: string;
  newPartyId: string;
  defectedSeatsCount: number;
  totalPartySeatsCount: number;
  isTwoThirdsThresholdMet: boolean; // >= 66.7%
  disqualifiedCount: number;
  governmentCollapsed: boolean;
  date: string;
}

export interface CampaignState {
  schemaVersion: number;

  metadata: CampaignMetadata;
  calendar: CampaignCalendar;

  player: {
    partyId: string | null;
    foundingStateId: string;
  };

  politicalWorld: {
    parties: PoliticalParty[];
    alliances: PoliticalAlliance[];
    stateGovernments: StateGovernment[];
    constituencyControl: ConstituencyControl[];
    relationships: PoliticalRelationship[];
    coalitionAgreements?: CoalitionAgreement[];
    postPollBargains?: PostPollBargain[];
    factions?: PartyFaction[];
    defectionHistory?: DefectionAttempt[];
    antiDefectionEvents?: AntiDefectionEvent[];
  };

  organization: {
    members: PartyMember[];
    leaders: PoliticalLeader[];
    offices?: PartyDistrictOffice[];
    candidatePool?: CandidateProfile[];
  };

  economy: {
    treasuries: PartyTreasury[];
  };

  elections: Election[];

  history: {
    events: CampaignEvent[];
  };
}
