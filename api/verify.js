const { OAuth2Client, GoogleAuth } = require("google-auth-library");

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const SERVICE_ACCOUNT_PRIVATE_KEY = (
  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || ""
).replace(/\\n/g, "\n");

const oauthClient = new OAuth2Client(CLIENT_ID);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ verified: false, error: "Method not allowed" });
    return;
  }

  const credential = req.body && req.body.credential;
  if (!credential) {
    res.status(400).json({ verified: false, error: "Missing credential" });
    return;
  }

  let payload;
  try {
    const ticket = await oauthClient.verifyIdToken({
      idToken: credential,
      audience: CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    res.status(200).json({ verified: false, error: "Token verification failed" });
    return;
  }

  const profile = {
    verified: true,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name,
  };

  // Sheets logging is best-effort — a logging hiccup shouldn't fail sign-in
  // for someone who presented a genuinely valid token.
  try {
    await logToSheet(profile);
  } catch (err) {
    console.error("Failed to log sign-in to sheet:", err);
  }

  res.status(200).json(profile);
};

async function logToSheet(profile) {
  if (!SHEET_ID || !SERVICE_ACCOUNT_EMAIL || !SERVICE_ACCOUNT_PRIVATE_KEY) {
    return;
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: SERVICE_ACCOUNT_EMAIL,
      private_key: SERVICE_ACCOUNT_PRIVATE_KEY,
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();

  const row = [new Date().toISOString(), profile.email, profile.name];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A1:append?valueInputOption=RAW`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [row] }),
  });

  if (!res.ok) {
    throw new Error(`Sheets API responded ${res.status}: ${await res.text()}`);
  }
}
