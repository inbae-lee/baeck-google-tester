const signedOutEl = document.getElementById("signed-out");
const signedInEl = document.getElementById("signed-in");
const userEmailEl = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const configWarningEl = document.getElementById("config-warning");
const verifyErrorEl = document.getElementById("verify-error");

function showSignedIn(profile) {
  userEmailEl.textContent = `Signed in as ${profile.email}`;
  signedOutEl.classList.add("hidden");
  signedInEl.classList.remove("hidden");
}

function showSignedOut() {
  signedInEl.classList.add("hidden");
  signedOutEl.classList.remove("hidden");
}

function showVerifyError(message) {
  verifyErrorEl.textContent = message;
  verifyErrorEl.classList.remove("hidden");
}

// Apps Script Web Apps never send CORS headers, and their HtmlService
// responses run inside a sandboxed frame that turns out to be isolated
// from the embedding page (no reliable way to message back out of it
// either — see backend/Code.js for the full story). JSONP sidesteps both
// problems: a <script src> tag isn't subject to CORS or sandboxing.
//
// Flow: POST { credential, nonce } via a hidden form (so the token itself
// never touches a URL) and wait for that hidden iframe to finish loading —
// that's confirmation the backend has processed it and cached a result.
// Then fetch the result via a JSONP <script> tag keyed by that nonce (a
// random, meaningless-on-its-own value, safe to put in a URL).
function verifyCredential(idToken) {
  return new Promise((resolve) => {
    const nonce = crypto.randomUUID();
    let settled = false;
    let pollTimeoutId;
    let script;

    const cleanup = () => {
      clearTimeout(overallTimeoutId);
      clearTimeout(pollTimeoutId);
      delete window[callbackName];
      form.remove();
      iframe.remove();
      if (script) script.remove();
    };

    const finish = (result) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    const callbackName = `__verifyCallback_${nonce.replace(/-/g, "")}`;
    window[callbackName] = (result) => {
      if (result && result.pending) {
        pollTimeoutId = setTimeout(poll, 400);
        return;
      }
      finish(result);
    };

    function poll() {
      if (script) script.remove();
      script = document.createElement("script");
      script.src = `${BACKEND_VERIFY_URL}?nonce=${encodeURIComponent(
        nonce
      )}&callback=${callbackName}`;
      script.onerror = () =>
        finish({ verified: false, error: "Could not reach verification backend" });
      document.body.appendChild(script);
    }

    const overallTimeoutId = setTimeout(
      () => finish({ verified: false, error: "Verification timed out" }),
      10000
    );

    const frameName = `verify-post-frame-${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = frameName;
    iframe.style.display = "none";
    iframe.addEventListener("load", poll, { once: true });

    const form = document.createElement("form");
    form.method = "POST";
    form.action = BACKEND_VERIFY_URL;
    form.target = frameName;
    form.style.display = "none";

    const addField = (name, value) => {
      const el = document.createElement("input");
      el.type = "hidden";
      el.name = name;
      el.value = value;
      form.appendChild(el);
    };
    addField("credential", idToken);
    addField("nonce", nonce);

    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}

// The GIS callback hands us an ID token straight from Google, but nothing
// on this page has checked it yet — that's what the backend call above is
// for. We only treat the user as signed in once the backend confirms the
// token is genuine and was issued for this app.
async function handleCredentialResponse(response) {
  verifyErrorEl.classList.add("hidden");

  const result = await verifyCredential(response.credential);

  if (!result.verified) {
    showVerifyError(result.error || "Verification failed");
    return;
  }

  showSignedIn(result);
}

function init() {
  if (
    !GOOGLE_CLIENT_ID ||
    GOOGLE_CLIENT_ID.startsWith("YOUR_") ||
    !BACKEND_VERIFY_URL ||
    BACKEND_VERIFY_URL.startsWith("YOUR_")
  ) {
    configWarningEl.classList.remove("hidden");
    return;
  }

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: true,
  });

  google.accounts.id.renderButton(document.getElementById("g_id_signin"), {
    theme: "outline",
    size: "large",
    type: "standard",
  });

  google.accounts.id.prompt();
}

logoutButton.addEventListener("click", () => {
  google.accounts.id.disableAutoSelect();
  showSignedOut();
});

window.addEventListener("load", init);
