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

// Apps Script Web Apps never send CORS headers, so fetch() to
// BACKEND_VERIFY_URL is always blocked cross-origin. Instead, submit the
// token via a hidden form to a hidden iframe (form submissions aren't
// subject to CORS) and wait for the backend's response page to post the
// result back via postMessage.
function verifyCredential(idToken) {
  return new Promise((resolve) => {
    const frameName = `verify-frame-${Date.now()}`;
    const iframe = document.createElement("iframe");
    iframe.name = frameName;
    iframe.style.display = "none";

    const form = document.createElement("form");
    form.method = "POST";
    form.action = BACKEND_VERIFY_URL;
    form.target = frameName;

    const input = document.createElement("input");
    input.type = "hidden";
    input.name = "credential";
    input.value = idToken;
    form.appendChild(input);

    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("message", onMessage);
      clearTimeout(timeoutId);
      form.remove();
      iframe.remove();
      resolve(result);
    };

    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      try {
        finish(JSON.parse(event.data));
      } catch (err) {
        finish({ verified: false, error: "Malformed response from backend" });
      }
    };

    const timeoutId = setTimeout(
      () => finish({ verified: false, error: "Verification timed out" }),
      10000
    );

    window.addEventListener("message", onMessage);
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
