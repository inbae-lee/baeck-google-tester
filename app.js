const signedOutEl = document.getElementById("signed-out");
const signedInEl = document.getElementById("signed-in");
const userEmailEl = document.getElementById("user-email");
const logoutButton = document.getElementById("logout-button");
const configWarningEl = document.getElementById("config-warning");

function decodeJwt(token) {
  const payload = token.split(".")[1];
  const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(json);
}

function showSignedIn(profile) {
  userEmailEl.textContent = `Signed in as ${profile.email}`;
  signedOutEl.classList.add("hidden");
  signedInEl.classList.remove("hidden");
}

function showSignedOut() {
  signedInEl.classList.add("hidden");
  signedOutEl.classList.remove("hidden");
}

function handleCredentialResponse(response) {
  const profile = decodeJwt(response.credential);
  showSignedIn(profile);
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
