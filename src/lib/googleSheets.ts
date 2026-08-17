import { randomBytes } from "crypto";
import { google } from "googleapis";
import { prisma } from "./prisma";
import { toBool, toNumberOrNull } from "./csv";
import type { Department } from "@prisma/client";

// CSRF state for the OAuth redirect round trip. The Google consent screen can
// only carry this "state" param back, not our Firebase bearer token, so
// /callback can't call requireAuthUser directly — this ties the callback back
// to a /connect call that was already admin-gated. A plain module-level Set
// isn't reliable here (Next.js can compile each route.ts as a separate module
// instance), so the state round-trips via a short-lived cookie instead.
export const STATE_COOKIE = "sheets_oauth_state";

export function createState(): string {
  return randomBytes(16).toString("hex");
}

const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

const TAB_BUDGET = "เกณฑ์งบประมาณ";
const TAB_MASTER_LIST = "Master List โรงแรม";
const TAB_ADDRESS = "ที่อยู่ RM/AM/TN/Audit";
const TAB_APPROVERS = "ผู้อนุมัติ";
const TAB_STORE_MASTER = "Store Master";

function oauthConfig() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing Google OAuth env vars: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI"
    );
  }
  return { clientId, clientSecret, redirectUri };
}

function newOAuthClient() {
  const { clientId, clientSecret, redirectUri } = oauthConfig();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getConsentUrl(state: string): string {
  const client = newOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [SHEETS_SCOPE, "openid", "email"],
    state,
  });
}

export async function saveConnectionFromCode(code: string): Promise<string> {
  const client = newOAuthClient();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google did not return a refresh token. Revoke this app's access at https://myaccount.google.com/permissions and try connecting again."
    );
  }
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data } = await oauth2.userinfo.get();
  const email = data.email ?? "unknown";

  await prisma.googleSheetsConnection.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", refreshToken: tokens.refresh_token, connectedEmail: email },
    update: { refreshToken: tokens.refresh_token, connectedEmail: email },
  });

  return email;
}

export async function getConnectionStatus() {
  return prisma.googleSheetsConnection.findUnique({ where: { id: "singleton" } });
}

async function getAuthorizedClient() {
  const connection = await prisma.googleSheetsConnection.findUnique({ where: { id: "singleton" } });
  if (!connection) {
    throw new Error("Google Sheet is not connected yet. Connect it from the admin page first.");
  }
  const client = newOAuthClient();
  client.setCredentials({ refresh_token: connection.refreshToken });
  return client;
}

interface SheetTabs {
  budget: string[][];
  masterList: string[][];
  address: string[][];
  approvers: string[][];
  storeMaster: string[][];
}

export async function fetchSheetTabs(): Promise<SheetTabs> {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!spreadsheetId) {
    throw new Error("Missing env var GOOGLE_SHEETS_SPREADSHEET_ID");
  }

  const auth = await getAuthorizedClient();
  const sheets = google.sheets({ version: "v4", auth });

  const { data } = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [
      `'${TAB_BUDGET}'!A2:F`,
      `'${TAB_MASTER_LIST}'!A3:K`,
      `'${TAB_ADDRESS}'!A2:J`,
      `'${TAB_APPROVERS}'!A2:D`,
      `'${TAB_STORE_MASTER}'!A3:V`,
    ],
  });

  const [budget, masterList, address, approvers, storeMaster] = data.valueRanges ?? [];
  return {
    budget: (budget?.values as string[][]) ?? [],
    masterList: (masterList?.values as string[][]) ?? [],
    address: (address?.values as string[][]) ?? [],
    approvers: (approvers?.values as string[][]) ?? [],
    storeMaster: (storeMaster?.values as string[][]) ?? [],
  };
}

function cell(row: string[], index: number): string {
  return (row[index] ?? "").trim();
}

function parseDateOrNull(value: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidLat(n: number | null): n is number {
  return n != null && n >= -90 && n <= 90;
}

function isValidLng(n: number | null): n is number {
  return n != null && n >= -180 && n <= 180;
}

export interface MappedBranch {
  code: string;
  name: string;
  lat: number;
  lng: number;
  budgetPerNight: number;
  isNewBranch: boolean;
  openDate: Date | null;
  rmAssignee: string | null;
  amAssignee: string | null;
}

export function mapBranches(tabs: SheetTabs): { rows: MappedBranch[]; errors: string[] } {
  const errors: string[] = [];
  const coords = new Map<string, { lat: number; lng: number }>();

  tabs.masterList.forEach((row, i) => {
    const code = cell(row, 0);
    if (!code) return;
    const lat = toNumberOrNull(cell(row, 2));
    const lng = toNumberOrNull(cell(row, 3));
    if (!isValidLat(lat) || !isValidLng(lng)) {
      errors.push(`Master List โรงแรม row ${i + 3}: invalid branch lat/lng for "${code}"`);
      return;
    }
    coords.set(code, { lat, lng });
  });

  // Store Master maps each branch to whichever RM/AM person is responsible for
  // it (columns R and V hold a "code+nickname" string, e.g. "RMX002 ปุ๋ย") —
  // optional, unlike lat/lng: a branch missing from this tab just gets nulls.
  const assignees = new Map<string, { rmAssignee: string | null; amAssignee: string | null }>();
  tabs.storeMaster.forEach((row) => {
    const code = cell(row, 0);
    if (!code) return;
    assignees.set(code, {
      rmAssignee: cell(row, 17) || null,
      amAssignee: cell(row, 21) || null,
    });
  });

  const rows: MappedBranch[] = [];
  tabs.budget.forEach((row, i) => {
    const code = cell(row, 0);
    const name = cell(row, 1);
    if (!code || !name) return;

    const coord = coords.get(code);
    if (!coord) {
      errors.push(`เกณฑ์งบประมาณ row ${i + 2}: no matching branch coordinates for "${code}" in Master List โรงแรม`);
      return;
    }

    const assignee = assignees.get(code);

    rows.push({
      code,
      name,
      lat: coord.lat,
      lng: coord.lng,
      budgetPerNight: toNumberOrNull(cell(row, 2)) ?? 560,
      isNewBranch: toBool(cell(row, 3)),
      openDate: parseDateOrNull(cell(row, 4)),
      rmAssignee: assignee?.rmAssignee ?? null,
      amAssignee: assignee?.amAssignee ?? null,
    });
  });

  return { rows, errors };
}

export interface MappedEmployee {
  code: string;
  name: string;
  department: Department;
  amTeam: string | null;
  codeNickname: string | null;
  storeCenterBranchCode: string | null;
  hasCompanyCar: boolean;
}

const VALID_DEPARTMENTS: Department[] = ["AM", "RM", "TN", "Audit"];

export function mapEmployees(tabs: SheetTabs): { rows: MappedEmployee[]; errors: string[] } {
  const errors: string[] = [];
  const rows: MappedEmployee[] = [];

  tabs.address.forEach((row, i) => {
    const department = cell(row, 0) as Department;
    const code = cell(row, 1);
    const name = cell(row, 2);

    if (!code || !name || !VALID_DEPARTMENTS.includes(department)) {
      errors.push(`${TAB_ADDRESS} row ${i + 2}: missing code/name or invalid department`);
      return;
    }

    rows.push({
      code,
      name,
      department,
      amTeam: cell(row, 3) || null,
      codeNickname: cell(row, 4) || null,
      storeCenterBranchCode: cell(row, 7) || null,
      hasCompanyCar: cell(row, 9).length > 0,
    });
  });

  return { rows, errors };
}

export interface MappedHotel {
  branchCode: string;
  name: string;
  lat: number | null;
  lng: number | null;
  distanceKm: number | null;
  pricePerNight: number | null;
  note: string | null;
}

export function mapHotels(tabs: SheetTabs): { rows: MappedHotel[]; errors: string[] } {
  const errors: string[] = [];
  const rows: MappedHotel[] = [];

  tabs.masterList.forEach((row, i) => {
    const branchCode = cell(row, 0);
    const name = cell(row, 4);
    if (!name) return;

    if (!branchCode) {
      errors.push(`Master List โรงแรม row ${i + 3}: hotel "${name}" has no branch code`);
      return;
    }

    const lat = toNumberOrNull(cell(row, 5));
    const lng = toNumberOrNull(cell(row, 6));
    if ((lat != null && !isValidLat(lat)) || (lng != null && !isValidLng(lng))) {
      errors.push(`Master List โรงแรม row ${i + 3}: invalid hotel lat/lng for "${name}"`);
      return;
    }

    rows.push({
      branchCode,
      name,
      lat,
      lng,
      distanceKm: toNumberOrNull(cell(row, 7)),
      pricePerNight: toNumberOrNull(cell(row, 8)),
      note: cell(row, 10) || null,
    });
  });

  return { rows, errors };
}

export interface MappedApprover {
  department: Department;
  nickname: string;
  fullName: string | null;
  email: string | null;
}

export function mapApprovers(tabs: SheetTabs): { rows: MappedApprover[]; errors: string[] } {
  const errors: string[] = [];
  const rows: MappedApprover[] = [];

  tabs.approvers.forEach((row, i) => {
    const department = cell(row, 0) as Department;
    const nickname = cell(row, 1);
    if (!VALID_DEPARTMENTS.includes(department) || !nickname) {
      errors.push(`${TAB_APPROVERS} row ${i + 2}: invalid department or missing nickname`);
      return;
    }

    rows.push({
      department,
      nickname,
      fullName: cell(row, 2) || null,
      email: cell(row, 3) || null,
    });
  });

  return { rows, errors };
}
