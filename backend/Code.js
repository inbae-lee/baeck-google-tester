// Google Apps Script Web App: verifies a Google ID token server-side.
// Deploy: Deploy > New deployment > type "Web app" > Execute as: Me,
// Who has access: Anyone. Point the frontend's BACKEND_VERIFY_URL
// (config.js) at the resulting /exec URL.

var ALLOWED_CLIENT_ID =
  "394344500550-rm3l29483m54c60fpuergmldevb2vb3k.apps.googleusercontent.com";

var CACHE_TTL_SECONDS = 60;

// Apps Script Web Apps have no way to send CORS headers, and HtmlService
// responses (tried first) turned out to run inside a sandboxed frame whose
// `top` is isolated from the page that embeds it — there's no reliable way
// to hand a result back through either of those channels. JSONP sidesteps
// both: a <script src> tag isn't subject to CORS or sandboxing at all.
//
// Flow: the frontend POSTs { credential, nonce } here (a hidden form, so
// the token never touches a URL), doPost verifies it and caches the result
// under that nonce, then the frontend loads
// BACKEND_VERIFY_URL?nonce=...&callback=... as a <script> tag — doGet
// looks up the cached result and calls back into the frontend with it.
function doPost(e) {
  var nonce = e.parameter && e.parameter.nonce;
  var result = verifyCredential_(e.parameter && e.parameter.credential);
  if (nonce) {
    CacheService.getScriptCache().put(nonce, JSON.stringify(result), CACHE_TTL_SECONDS);
  }
  return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
}

function doGet(e) {
  var nonce = e.parameter && e.parameter.nonce;
  var callback = (e.parameter && e.parameter.callback) || "verifyCallback";
  var cached = nonce && CacheService.getScriptCache().get(nonce);
  var result = cached
    ? JSON.parse(cached)
    : { verified: false, pending: true };

  if (cached) {
    CacheService.getScriptCache().remove(nonce); // one-time read
  }

  var body = callback + "(" + JSON.stringify(result) + ");";
  return ContentService.createTextOutput(body).setMimeType(
    ContentService.MimeType.JAVASCRIPT
  );
}

function verifyCredential_(idToken) {
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
