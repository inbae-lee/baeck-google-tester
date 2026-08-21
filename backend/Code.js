// Google Apps Script Web App: verifies a Google ID token server-side.
// Deploy: Deploy > New deployment > type "Web app" > Execute as: Me,
// Who has access: Anyone. Point the frontend's BACKEND_VERIFY_URL
// (config.js) at the resulting /exec URL.

var ALLOWED_CLIENT_ID =
  "394344500550-rm3l29483m54c60fpuergmldevb2vb3k.apps.googleusercontent.com";

function doPost(e) {
  var result = verifyCredential_(e);
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function verifyCredential_(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return { verified: false, error: "Invalid request body" };
  }

  var idToken = body.credential;
  if (!idToken) {
    return { verified: false, error: "Missing credential" };
  }

  // Google's tokeninfo endpoint verifies the JWT signature and expiry for
  // us. Good enough for a low-traffic reference app; a high-volume backend
  // should verify locally against Google's public keys instead.
  var url =
    "https://oauth2.googleapis.com/tokeninfo?id_token=" +
    encodeURIComponent(idToken);
  var res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  var claims = JSON.parse(res.getContentText());

  if (res.getResponseCode() !== 200) {
    return {
      verified: false,
      error: claims.error_description || "Token verification failed",
    };
  }

  // tokeninfo validates the token itself, but not who it was issued for —
  // that check is on us, or any token issued for any Google app would pass.
  if (claims.aud !== ALLOWED_CLIENT_ID) {
    return { verified: false, error: "Token was not issued for this app" };
  }

  return {
    verified: true,
    email: claims.email,
    emailVerified: claims.email_verified === "true",
    name: claims.name,
  };
}
