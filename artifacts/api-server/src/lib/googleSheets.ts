import { google } from "googleapis";
import {
  type TradeRecord,
  computeDailySummaries,
  computeWeeklySummaries,
  computeMonthlySummaries,
} from "./summaryUtils";

let connectionSettings: any;

async function getAccessToken() {
  if (
    connectionSettings &&
    connectionSettings.settings.expires_at &&
    new Date(connectionSettings.settings.expires_at).getTime() > Date.now()
  ) {
    return connectionSettings.settings.access_token;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? "depl " + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    throw new Error("X-Replit-Token not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" +
      hostname +
      "/api/v2/connection?include_secrets=true&connector_names=google-sheet",
    {
      headers: {
        Accept: "application/json",
        "X-Replit-Token": xReplitToken,
      },
    }
  )
    .then((res) => res.json())
    .then((data) => data.items?.[0]);

  const accessToken =
    connectionSettings?.settings?.access_token ||
    connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Google Sheet not connected — please re-authorize the Google Sheets integration");
  }
  return accessToken;
}

export async function getUncachableGoogleSheetClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.sheets({ version: "v4", auth: oauth2Client });
}

export async function getDriveClient() {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: "v3", auth: oauth2Client });
}

const SHEET_TITLE = "Trading Journal";

const TRADE_HEADERS = [
  "ID", "Date", "Symbol", "Type", "Instrument", "Entry Price", "Exit Price",
  "Quantity", "Gross P&L", "Charges", "Net P&L", "Stop Loss", "Target",
  "Risk Amount", "R:R Ratio", "Strategy", "Setup Type", "Notes", "Status",
];

const SUMMARY_HEADERS = [
  "Period", "Total Trades", "Closed", "Open", "Wins", "Losses",
  "Win Rate %", "Gross P&L (₹)", "Charges (₹)", "Net P&L (₹)",
];

async function ensureSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  title: string,
  existingTitles: string[]
) {
  if (!existingTitles.includes(title)) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title } } }],
      },
    });
  }
}

async function writeSheet(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string,
  sheetTitle: string,
  headers: string[],
  rows: unknown[][]
) {
  const colEnd = String.fromCharCode(64 + headers.length);
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetTitle}!A1:${colEnd}10000`,
  });
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetTitle}!A1`,
    valueInputOption: "RAW",
    requestBody: { values: [headers, ...rows] },
  });
}

export async function syncTradesToSheet(trades: TradeRecord[]) {
  const sheets = await getUncachableGoogleSheetClient();
  const drive = await getDriveClient();

  let spreadsheetId: string | undefined;

  const listRes = await drive.files.list({
    q: `name='${SHEET_TITLE}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    spreadsheetId = listRes.data.files[0].id!;
  } else {
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: { title: SHEET_TITLE },
        sheets: [
          { properties: { title: "Trades" } },
          { properties: { title: "Daily Summary" } },
          { properties: { title: "Weekly Summary" } },
          { properties: { title: "Monthly Summary" } },
        ],
      },
    });
    spreadsheetId = createRes.data.spreadsheetId!;
  }

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = (metaRes.data.sheets ?? []).map(
    (s) => s.properties?.title ?? ""
  );

  await ensureSheet(sheets, spreadsheetId, "Trades", existingTitles);
  await ensureSheet(sheets, spreadsheetId, "Daily Summary", existingTitles);
  await ensureSheet(sheets, spreadsheetId, "Weekly Summary", existingTitles);
  await ensureSheet(sheets, spreadsheetId, "Monthly Summary", existingTitles);

  const tradeRows = trades.map((t) => [
    t.id,
    t.trade_date,
    t.symbol,
    t.trade_type,
    t.instrument,
    t.entry_price,
    t.exit_price ?? "",
    t.quantity,
    t.gross_pnl ?? "",
    t.charges ?? "",
    t.net_pnl ?? "",
    t.stop_loss ?? "",
    t.target ?? "",
    t.risk_amount ?? "",
    t.risk_reward_ratio ?? "",
    t.strategy ?? "",
    t.setup_type ?? "",
    t.notes ?? "",
    t.status,
  ]);

  const toSummaryRow = (s: ReturnType<typeof computeDailySummaries>[0]) => [
    s.period,
    s.totalTrades,
    s.closedTrades,
    s.openTrades,
    s.wins,
    s.losses,
    s.winRate,
    Number(s.grossPnl.toFixed(2)),
    Number(s.charges.toFixed(2)),
    Number(s.netPnl.toFixed(2)),
  ];

  const dailyRows = computeDailySummaries(trades).map(toSummaryRow);
  const weeklyRows = computeWeeklySummaries(trades).map(toSummaryRow);
  const monthlyRows = computeMonthlySummaries(trades).map(toSummaryRow);

  await writeSheet(sheets, spreadsheetId, "Trades", TRADE_HEADERS, tradeRows);
  await writeSheet(sheets, spreadsheetId, "Daily Summary", SUMMARY_HEADERS, dailyRows);
  await writeSheet(sheets, spreadsheetId, "Weekly Summary", SUMMARY_HEADERS, weeklyRows);
  await writeSheet(sheets, spreadsheetId, "Monthly Summary", SUMMARY_HEADERS, monthlyRows);

  return { spreadsheetId, rowCount: trades.length };
}
