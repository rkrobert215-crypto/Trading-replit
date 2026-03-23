import { google } from "googleapis";

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
    connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Google Sheet not connected");
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

const HEADERS = [
  "ID", "Date", "Symbol", "Type", "Instrument", "Entry Price", "Exit Price",
  "Quantity", "Gross P&L", "Charges", "Net P&L", "Stop Loss", "Target",
  "Risk Amount", "R:R Ratio", "Strategy", "Setup Type", "Notes", "Status",
];

export async function syncTradesToSheet(trades: Record<string, unknown>[]) {
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
        sheets: [{ properties: { title: "Trades" } }],
      },
    });
    spreadsheetId = createRes.data.spreadsheetId!;
  }

  const rows = trades.map((t) => [
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

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: "Trades!A1:S10000",
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: "Trades!A1",
    valueInputOption: "RAW",
    requestBody: {
      values: [HEADERS, ...rows],
    },
  });

  return { spreadsheetId, rowCount: rows.length };
}
