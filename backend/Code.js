// Google Apps Script Web App: verifies a Google ID token server-side.
// Deploy: Deploy > New deployment > type "Web app" > Execute as: Me,
// Who has access: Anyone. Point the frontend's BACKEND_VERIFY_URL
// (config.js) at the resulting /exec URL.

var ALLOWED_CLIENT_ID =
  "394344500550-rm3l29483m54c60fpuergmldevb2vb3k.apps.googleusercontent.com";

// Apps Script Web Apps never send an Access-Control-Allow-Origin header, so
// a cross-origin fetch() to this URL is always blocked by CORS — there is
// no config that fixes that. The workaround: the frontend submits a hidden
// <form> to a hidden <iframe> (form submissions aren't subject to CORS),
// and this responds with a tiny HTML page whose script posts the result
// back to the top-level page via postMessage, which is unaffected by CORS.
// Apps Script serves this HTML inside a sandboxed iframe nested one level
// deeper than the frontend's own iframe (script.google.com's wrapper page,
// which itself embeds a googleusercontent.com sandbox frame that's where
// this script actually runs) — so we target `top`, not `parent`, to reach
// the frontend page directly instead of the intermediate wrapper.
function doPost(e) {
  var result = verifyCredential_(getCredential_(e));
  var payload = JSON.stringify(JSON.stringify(result)).replace(/<\//g, "<\\/");
  var html = "<script>top.postMessage(" + payload + ', "*");</script>';
  return HtmlService.createHtmlOutput(html);
}

function getCredential_(e) {
  if (e.parameter && e.parameter.credential) {
    return e.parameter.credential;
  }
  try {
    return JSON.parse(e.postData.contents).credential;
  } catch (err) {
    return null;
  }
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
