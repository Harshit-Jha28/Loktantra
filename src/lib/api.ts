const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:8000/api";

export interface WorldOverview {
  year: number;
  country: string;
  alliances: number;
  parties: number;
  states_and_uts: number;
  campaign_ready: boolean;
}

export interface StateData {
  id: number;
  name: string;
  capital: string;
  state_type: string;
  total_assembly_seats: number;
  total_lok_sabha_seats: number;
}

export interface PartyData {
  id: number;
  name: string;
  abbreviation: string | null;
  ideology: string | null;
  alliance_id: number | null;
  organization_strength: number;
  electoral_strength: number;
  is_player_party: boolean;
}

export interface CampaignData {
  id: number;
  campaign_name: string;
  start_date: string;
  current_date: string;
  home_state_id: number;
  player_party_id: number | null;
  created_at: string;
}

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(
    `${API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      cache: "no-store",
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => null);

    throw new Error(
      error?.detail || `Request failed: ${response.status}`
    );
  }

  return response.json();
}

export const api = {

  getOverview: () =>
    request<WorldOverview>("/world/overview"),

  getStates: () =>
    request<StateData[]>("/world/states"),

  getParties: () =>
    request<PartyData[]>("/world/parties"),

  getCampaigns: () =>
    request<CampaignData[]>("/campaigns/"),

  createCampaign: (data: {
    campaign_name: string;
    home_state_id: number;
  }) =>
    request<CampaignData>("/campaigns/", {
      method: "POST",
      body: JSON.stringify(data),
    }),

};