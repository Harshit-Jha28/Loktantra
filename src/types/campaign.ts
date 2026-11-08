
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

export interface StateGovernment {
  stateId: string;
  rulingPartyId: string | null;
  rulingAllianceId: string | null;
  chiefMinisterName: string | null;
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
  stateId: string | null;
  constituencyId: string | null;
  loyalty: number;
  influence: number;
  joinedAt: string;
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
  };

  organization: {
    members: PartyMember[];
    leaders: PoliticalLeader[];
  };

  economy: {
    treasuries: PartyTreasury[];
  };

  elections: Election[];

  history: {
    events: CampaignEvent[];
  };
}
