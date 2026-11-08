export type LeaderArchetype =
  | "coalition_broker"
  | "grassroots_organiser"
  | "charismatic_populist"
  | "technocratic_reformer"
  | "regional_identity_advocate"
  | "institutional_veteran"
  | "ideological_campaigner"
  | "business_friendly_moderniser"
  | "welfare_mobiliser"
  | "security_first_administrator"
  | "consensus_builder"
  | "movement_organiser"
  | "central_administrator";

export type RegionKind = "state" | "union_territory";

export interface PartySeed {
  id: string;
  name: string;
  abbreviation: string;
  ideology: "Progressive" | "Centrist" | "Nationalist" | "Regionalist";
  description: string;
  slogan: string;
  symbol: string;
  primaryColor: string;
  secondaryColor: string;
  allianceId: string | null;
  organizationStrength: number;
  electoralStrength: number;
  popularity: number;
}

export interface RegionSeed {
  id: string;
  name: string;
  kind: RegionKind;
  capital: string;
  assemblySeats: number;
  lokSabhaSeats: number;
  rulingPartyId: string | null;
  allianceId: string | null;
  chiefMinisterName: string | null;
  leaderArchetype: LeaderArchetype | null;
  governmentType:
    | "majority"
    | "coalition"
    | "minority"
    | "unconfigured";
}

export const INDIA_WORLD_SNAPSHOT_DATE = "2026-11-07";
export const INDIA_WORLD_VERSION = "india-2026.11.07";

export const INDIA_PARTIES: PartySeed[] = [
  {
    id: "ndf",
    name: "National Development Front",
    abbreviation: "NDF",
    ideology: "Nationalist",
    description: "A national political movement focused on national unity, infrastructure, security and economic development.",
    slogan: "A Stronger Nation, A Better Tomorrow",
    symbol: "Rising Sun",
    primaryColor: "#E5A13A",
    secondaryColor: "#FFF0CE",
    allianceId: "national-democratic-alliance",
    organizationStrength: 88,
    electoralStrength: 86,
    popularity: 76,
  },
  {
    id: "ppc",
    name: "People's Progress Congress",
    abbreviation: "PPC",
    ideology: "Progressive",
    description: "A national party focused on social welfare, public institutions, economic opportunity and inclusive development.",
    slogan: "Progress for Every Citizen",
    symbol: "Open Hand",
    primaryColor: "#4D78A8",
    secondaryColor: "#E7F0FA",
    allianceId: "progressive-united-front",
    organizationStrength: 78,
    electoralStrength: 73,
    popularity: 68,
  },
  {
    id: "rjm",
    name: "Regional Justice Movement",
    abbreviation: "RJM",
    ideology: "Regionalist",
    description: "A regional movement advocating state autonomy, social justice and local representation.",
    slogan: "Our Land, Our Voice",
    symbol: "Tree",
    primaryColor: "#6C9B62",
    secondaryColor: "#EAF4E5",
    allianceId: "eastern-regional-front",
    organizationStrength: 72,
    electoralStrength: 70,
    popularity: 67,
  },
  {
    id: "pfp",
    name: "People First Party",
    abbreviation: "PFP",
    ideology: "Progressive",
    description: "A reform-oriented party focused on public services, accountability and urban governance.",
    slogan: "People Before Power",
    symbol: "Broom",
    primaryColor: "#B66A9A",
    secondaryColor: "#F7EAF2",
    allianceId: null,
    organizationStrength: 67,
    electoralStrength: 64,
    popularity: 65,
  },
  {
    id: "mpp",
    name: "Mountain People's Party",
    abbreviation: "MPP",
    ideology: "Regionalist",
    description: "A regional party focused on mountain communities, local culture and sustainable development.",
    slogan: "The Mountains, Our Future",
    symbol: "Mountain",
    primaryColor: "#4C8A83",
    secondaryColor: "#E4F2EF",
    allianceId: null,
    organizationStrength: 65,
    electoralStrength: 62,
    popularity: 64,
  },
  {
    id: "dpu",
    name: "Democratic People's Union",
    abbreviation: "DPU",
    ideology: "Regionalist",
    description: "A regional democratic party built around state identity, decentralisation and public welfare.",
    slogan: "Democracy at the Grassroots",
    symbol: "Torch",
    primaryColor: "#B68B3D",
    secondaryColor: "#F8F0D9",
    allianceId: null,
    organizationStrength: 64,
    electoralStrength: 61,
    popularity: 62,
  },
  {
    id: "fda",
    name: "Frontier Democratic Alliance",
    abbreviation: "FDA",
    ideology: "Regionalist",
    description: "A regional political organisation representing frontier communities and local development priorities.",
    slogan: "Every Region Matters",
    symbol: "Star",
    primaryColor: "#6579A9",
    secondaryColor: "#E9EDFA",
    allianceId: null,
    organizationStrength: 61,
    electoralStrength: 58,
    popularity: 60,
  },
  {
    id: "zpm",
    name: "Zoram People's Movement",
    abbreviation: "ZPM",
    ideology: "Regionalist",
    description: "A regional reform movement focused on accountable administration and community-led development.",
    slogan: "A New Way Forward",
    symbol: "Star",
    primaryColor: "#4B9B8B",
    secondaryColor: "#E5F4EF",
    allianceId: null,
    organizationStrength: 62,
    electoralStrength: 60,
    popularity: 63,
  },
  {
    id: "skm",
    name: "Sikkim Krantikari Morcha",
    abbreviation: "SKM",
    ideology: "Regionalist",
    description: "A regional party focused on Sikkim's development, public welfare and regional representation.",
    slogan: "Sikkim First",
    symbol: "Mountain",
    primaryColor: "#D66D49",
    secondaryColor: "#FBECE4",
    allianceId: null,
    organizationStrength: 65,
    electoralStrength: 63,
    popularity: 66,
  },
  {
    id: "tvk",
    name: "Tamilaga Vetri Kazhagam",
    abbreviation: "TVK",
    ideology: "Regionalist",
    description: "A state-focused political movement built around public participation, governance reform and Tamil identity.",
    slogan: "Victory Through the People",
    symbol: "Whistle",
    primaryColor: "#8C6CB5",
    secondaryColor: "#F0EAF8",
    allianceId: null,
    organizationStrength: 70,
    electoralStrength: 75,
    popularity: 74,
  },
  {
    id: "npp",
    name: "National People's Party",
    abbreviation: "NPP",
    ideology: "Regionalist",
    description: "A regional political force focused on northeastern representation and coalition-based governance.",
    slogan: "Together We Rise",
    symbol: "Book",
    primaryColor: "#4E9B72",
    secondaryColor: "#E6F4EB",
    allianceId: "meghalaya-democratic-alliance",
    organizationStrength: 64,
    electoralStrength: 61,
    popularity: 65,
  },
  {
    id: "ainrc",
    name: "All India N.R. Congress",
    abbreviation: "AINRC",
    ideology: "Centrist",
    description: "A regional party focused on administrative stability, development and Puducherry's interests.",
    slogan: "Stable Leadership, Local Progress",
    symbol: "Jug",
    primaryColor: "#5A8BBD",
    secondaryColor: "#E9F2FA",
    allianceId: "national-democratic-alliance",
    organizationStrength: 59,
    electoralStrength: 57,
    popularity: 60,
  },
  {
    id: "ndpp",
    name: "Nationalist Democratic Progressive Party",
    abbreviation: "NDPP",
    ideology: "Regionalist",
    description: "A regional party focused on peace, development and political representation in Nagaland.",
    slogan: "Peace and Progress",
    symbol: "Feather",
    primaryColor: "#B67B4B",
    secondaryColor: "#F6EDE3",
    allianceId: "progressive-democratic-alliance",
    organizationStrength: 60,
    electoralStrength: 58,
    popularity: 61,
  },
  {
    id: "jknc",
    name: "Jammu Kashmir National Conference",
    abbreviation: "JKNC",
    ideology: "Regionalist",
    description: "A regional political party focused on representation, autonomy and development in Jammu and Kashmir.",
    slogan: "Voice of the Valley",
    symbol: "Plough",
    primaryColor: "#4F8A61",
    secondaryColor: "#E7F1E8",
    allianceId: "progressive-united-front",
    organizationStrength: 66,
    electoralStrength: 64,
    popularity: 65,
  },
];

export const INDIA_REGIONS: RegionSeed[] = [
  // 28 STATES
  { id: "andhra-pradesh", name: "Andhra Pradesh", kind: "state", capital: "Amaravati", assemblySeats: 175, lokSabhaSeats: 25, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Vikram Dev Varma", leaderArchetype: "coalition_broker", governmentType: "coalition" },
  { id: "arunachal-pradesh", name: "Arunachal Pradesh", kind: "state", capital: "Itanagar", assemblySeats: 60, lokSabhaSeats: 2, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Tashi Norbu", leaderArchetype: "institutional_veteran", governmentType: "majority" },
  { id: "assam", name: "Assam", kind: "state", capital: "Dispur", assemblySeats: 126, lokSabhaSeats: 14, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Arindam Hazarika", leaderArchetype: "charismatic_populist", governmentType: "majority" },
  { id: "bihar", name: "Bihar", kind: "state", capital: "Patna", assemblySeats: 243, lokSabhaSeats: 40, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Raghavendra Pratap", leaderArchetype: "coalition_broker", governmentType: "coalition" },
  { id: "chhattisgarh", name: "Chhattisgarh", kind: "state", capital: "Raipur", assemblySeats: 90, lokSabhaSeats: 11, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Mahendra Korram", leaderArchetype: "grassroots_organiser", governmentType: "majority" },
  { id: "goa", name: "Goa", kind: "state", capital: "Panaji", assemblySeats: 40, lokSabhaSeats: 2, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Rohan Naik", leaderArchetype: "coalition_broker", governmentType: "coalition" },
  { id: "gujarat", name: "Gujarat", kind: "state", capital: "Gandhinagar", assemblySeats: 182, lokSabhaSeats: 26, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Ketan Desai", leaderArchetype: "business_friendly_moderniser", governmentType: "majority" },
  { id: "haryana", name: "Haryana", kind: "state", capital: "Chandigarh", assemblySeats: 90, lokSabhaSeats: 10, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Devendra Malik", leaderArchetype: "institutional_veteran", governmentType: "majority" },
  { id: "himachal-pradesh", name: "Himachal Pradesh", kind: "state", capital: "Shimla", assemblySeats: 68, lokSabhaSeats: 4, rulingPartyId: "ppc", allianceId: "progressive-united-front", chiefMinisterName: "Devraj Thakur", leaderArchetype: "consensus_builder", governmentType: "majority" },
  { id: "jharkhand", name: "Jharkhand", kind: "state", capital: "Ranchi", assemblySeats: 81, lokSabhaSeats: 14, rulingPartyId: "rjm", allianceId: "eastern-regional-front", chiefMinisterName: "Birsa Munda Oraon", leaderArchetype: "movement_organiser", governmentType: "coalition" },
  { id: "karnataka", name: "Karnataka", kind: "state", capital: "Bengaluru", assemblySeats: 224, lokSabhaSeats: 28, rulingPartyId: "ppc", allianceId: "progressive-united-front", chiefMinisterName: "Siddharth Gowda", leaderArchetype: "coalition_broker", governmentType: "majority" },
  { id: "kerala", name: "Kerala", kind: "state", capital: "Thiruvananthapuram", assemblySeats: 140, lokSabhaSeats: 20, rulingPartyId: "ppc", allianceId: "progressive-united-front", chiefMinisterName: "Anand Menon", leaderArchetype: "technocratic_reformer", governmentType: "coalition" },
  { id: "madhya-pradesh", name: "Madhya Pradesh", kind: "state", capital: "Bhopal", assemblySeats: 230, lokSabhaSeats: 29, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Prakash Tiwari", leaderArchetype: "ideological_campaigner", governmentType: "majority" },
  { id: "maharashtra", name: "Maharashtra", kind: "state", capital: "Mumbai", assemblySeats: 288, lokSabhaSeats: 48, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Vishal Kulkarni", leaderArchetype: "coalition_broker", governmentType: "coalition" },
  { id: "manipur", name: "Manipur", kind: "state", capital: "Imphal", assemblySeats: 60, lokSabhaSeats: 2, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Ningthouja Ibocha", leaderArchetype: "security_first_administrator", governmentType: "coalition" },
  { id: "meghalaya", name: "Meghalaya", kind: "state", capital: "Shillong", assemblySeats: 60, lokSabhaSeats: 2, rulingPartyId: "npp", allianceId: "meghalaya-democratic-alliance", chiefMinisterName: "Dawell Marak", leaderArchetype: "consensus_builder", governmentType: "coalition" },
  { id: "mizoram", name: "Mizoram", kind: "state", capital: "Aizawl", assemblySeats: 40, lokSabhaSeats: 1, rulingPartyId: "zpm", allianceId: null, chiefMinisterName: "Lalrinmawia", leaderArchetype: "grassroots_organiser", governmentType: "majority" },
  { id: "nagaland", name: "Nagaland", kind: "state", capital: "Kohima", assemblySeats: 60, lokSabhaSeats: 1, rulingPartyId: "ndpp", allianceId: "progressive-democratic-alliance", chiefMinisterName: "Kevizeto Angami", leaderArchetype: "coalition_broker", governmentType: "coalition" },
  { id: "odisha", name: "Odisha", kind: "state", capital: "Bhubaneswar", assemblySeats: 147, lokSabhaSeats: 21, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Debashish Patnaik", leaderArchetype: "technocratic_reformer", governmentType: "majority" },
  { id: "punjab", name: "Punjab", kind: "state", capital: "Chandigarh", assemblySeats: 117, lokSabhaSeats: 13, rulingPartyId: "pfp", allianceId: null, chiefMinisterName: "Gurmeet Sandhu", leaderArchetype: "welfare_mobiliser", governmentType: "majority" },
  { id: "rajasthan", name: "Rajasthan", kind: "state", capital: "Jaipur", assemblySeats: 200, lokSabhaSeats: 25, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Arvind Rathore", leaderArchetype: "ideological_campaigner", governmentType: "majority" },
  { id: "sikkim", name: "Sikkim", kind: "state", capital: "Gangtok", assemblySeats: 32, lokSabhaSeats: 1, rulingPartyId: "skm", allianceId: null, chiefMinisterName: "Tenzing Lepcha", leaderArchetype: "regional_identity_advocate", governmentType: "majority" },
  { id: "tamil-nadu", name: "Tamil Nadu", kind: "state", capital: "Chennai", assemblySeats: 234, lokSabhaSeats: 39, rulingPartyId: "tvk", allianceId: null, chiefMinisterName: "Arjun Selvan", leaderArchetype: "charismatic_populist", governmentType: "majority" },
  { id: "telangana", name: "Telangana", kind: "state", capital: "Hyderabad", assemblySeats: 119, lokSabhaSeats: 17, rulingPartyId: "ppc", allianceId: "progressive-united-front", chiefMinisterName: "Rudra Reddy", leaderArchetype: "grassroots_organiser", governmentType: "majority" },
  { id: "tripura", name: "Tripura", kind: "state", capital: "Agartala", assemblySeats: 60, lokSabhaSeats: 2, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Anupam Debbarma", leaderArchetype: "institutional_veteran", governmentType: "majority" },
  { id: "uttar-pradesh", name: "Uttar Pradesh", kind: "state", capital: "Lucknow", assemblySeats: 403, lokSabhaSeats: 80, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Rudransh Pratap", leaderArchetype: "charismatic_populist", governmentType: "majority" },
  { id: "uttarakhand", name: "Uttarakhand", kind: "state", capital: "Dehradun", assemblySeats: 70, lokSabhaSeats: 5, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Aviral Bisht", leaderArchetype: "consensus_builder", governmentType: "majority" },
  { id: "west-bengal", name: "West Bengal", kind: "state", capital: "Kolkata", assemblySeats: 294, lokSabhaSeats: 42, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Samarjit Roy", leaderArchetype: "charismatic_populist", governmentType: "majority" },

  // 8 UNION TERRITORIES
  { id: "andaman-nicobar", name: "Andaman and Nicobar Islands", kind: "union_territory", capital: "Sri Vijaya Puram", assemblySeats: 0, lokSabhaSeats: 1, rulingPartyId: null, allianceId: null, chiefMinisterName: null, leaderArchetype: null, governmentType: "unconfigured" },
  { id: "chandigarh", name: "Chandigarh", kind: "union_territory", capital: "Chandigarh", assemblySeats: 0, lokSabhaSeats: 1, rulingPartyId: null, allianceId: null, chiefMinisterName: null, leaderArchetype: null, governmentType: "unconfigured" },
  { id: "dadra-nagar-haveli-daman-diu", name: "Dadra and Nagar Haveli and Daman and Diu", kind: "union_territory", capital: "Daman", assemblySeats: 0, lokSabhaSeats: 2, rulingPartyId: null, allianceId: null, chiefMinisterName: null, leaderArchetype: null, governmentType: "unconfigured" },
  { id: "delhi", name: "Delhi", kind: "union_territory", capital: "New Delhi", assemblySeats: 70, lokSabhaSeats: 7, rulingPartyId: "ndf", allianceId: "national-democratic-alliance", chiefMinisterName: "Ira Malhotra", leaderArchetype: "technocratic_reformer", governmentType: "majority" },
  { id: "jammu-kashmir", name: "Jammu and Kashmir", kind: "union_territory", capital: "Srinagar / Jammu", assemblySeats: 90, lokSabhaSeats: 5, rulingPartyId: "jknc", allianceId: "progressive-united-front", chiefMinisterName: "Amaan Mir", leaderArchetype: "regional_identity_advocate", governmentType: "coalition" },
  { id: "ladakh", name: "Ladakh", kind: "union_territory", capital: "Leh", assemblySeats: 0, lokSabhaSeats: 1, rulingPartyId: null, allianceId: null, chiefMinisterName: null, leaderArchetype: null, governmentType: "unconfigured" },
  { id: "lakshadweep", name: "Lakshadweep", kind: "union_territory", capital: "Kavaratti", assemblySeats: 0, lokSabhaSeats: 1, rulingPartyId: null, allianceId: null, chiefMinisterName: null, leaderArchetype: null, governmentType: "unconfigured" },
  { id: "puducherry", name: "Puducherry", kind: "union_territory", capital: "Puducherry", assemblySeats: 30, lokSabhaSeats: 1, rulingPartyId: "ainrc", allianceId: "national-democratic-alliance", chiefMinisterName: "R.K. Varadan", leaderArchetype: "coalition_broker", governmentType: "coalition" },
];
/**
 * Official assembly term expiry dates.
 * These are term-end dates, NOT polling dates.
 * null = no elected legislative assembly.
 */
export const INDIA_ASSEMBLY_TERM_ENDS: Record<string, string | null> = {
  "andhra-pradesh": "2029-06-20",
  "arunachal-pradesh": "2029-06-13",
  "assam": "2031-05-20",
  "bihar": "2030-11-30",
  "chhattisgarh": "2028-12-18",
  "goa": "2027-03-14",
  "gujarat": "2027-12-19",
  "haryana": "2029-10-24",
  "himachal-pradesh": "2028-01-03",
  "jharkhand": "2029-12-08",
  "karnataka": "2028-05-21",
  "kerala": "2031-05-20",
  "madhya-pradesh": "2028-12-17",
  "maharashtra": "2029-12-06",
  "manipur": "2027-03-13",
  "meghalaya": "2028-03-05",
  "mizoram": "2028-12-11",
  "nagaland": "2028-03-19",
  "odisha": "2029-07-21",
  "punjab": "2027-03-16",
  "rajasthan": "2028-12-19",
  "sikkim": "2029-06-11",
  "tamil-nadu": "2031-05-10",
  "telangana": "2028-12-08",
  "tripura": "2028-03-23",
  "uttar-pradesh": "2027-05-22",
  "uttarakhand": "2027-03-28",
  "west-bengal": "2031-05-14",

  "andaman-nicobar": null,
  "chandigarh": null,
  "dadra-nagar-haveli-daman-diu": null,
  "delhi": "2030-02-23",
  "jammu-kashmir": "2029-11-03",
  "ladakh": null,
  "lakshadweep": null,
  "puducherry": "2031-05-19",
};
export function getIndiaRegion(id: string) {
  return INDIA_REGIONS.find((region) => region.id === id);
}