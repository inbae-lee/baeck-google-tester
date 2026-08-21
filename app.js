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

// The GIS callback hands us an ID token straight from Google, but nothing
// on this page has checked it yet. /api/verify checks it server-side (and
// logs the sign-in to a Sheet) before we trust it. Frontend and backend
// share an origin here, so this is a plain same-origin fetch — no CORS.
async function handleCredentialResponse(response) {
  verifyErrorEl.classList.add("hidden");

  try {
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const result = await res.json();

    if (!result.verified) {
      showVerifyError(result.error || "Verification failed");
      return;
    }

    showSignedIn(result);
  } catch (err) {
    showVerifyError("Could not reach the verification backend");
  }
}

function init() {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.startsWith("YOUR_")) {
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
