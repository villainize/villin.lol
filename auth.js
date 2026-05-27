import {
  authUrl,
  getCurrentSession,
  isSupabaseConfigured,
  loginUser,
  profileUrl,
  registerUser,
  studioUrl
} from "./app.js";

const authRoot = document.getElementById("pageRoot");

async function init() {
  const authSession = await getCurrentSession();

  if (authSession) {
    window.location.href = studioUrl();
    return;
  }

  authRoot.innerHTML = `
    <section class="auth-shell">
      <nav class="site-nav">
        <a class="brand" href="./index.html">
          <span class="brand__orb"></span>
          <span class="brand__name">villainize.lol</span>
        </a>
        <div class="nav-actions">
          <a class="secondary-button" href="./index.html">home</a>
          <a class="button" href="${profileUrl("nova")}">demo page</a>
        </div>
      </nav>

      <div class="auth-grid">
        <section class="auth-panel">
          <p class="eyebrow">access</p>
          <h1>log in or register</h1>
          <p class="auth-subtitle">
            This version uses Supabase for authentication and public profile storage.
          </p>

          <div class="panel-tabs">
            <button class="panel-tab is-active" type="button" data-tab="login">log in</button>
            <button class="panel-tab" type="button" data-tab="register">register</button>
          </div>

          <p class="flash" id="authFlash"></p>

          <form class="stack-form" id="authForm">
            <input type="hidden" name="mode" value="login">

            <div class="field" id="usernameField" style="display: none;">
              <label for="username">Username</label>
              <input id="username" name="username" autocomplete="username" placeholder="yourname">
            </div>

            <div class="field">
              <label for="email">Email</label>
              <input id="email" name="email" type="email" autocomplete="email" placeholder="you@example.com" required>
            </div>

            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password" placeholder="********" required>
            </div>

            <p class="hint" id="authHint">Use your email and password to enter the studio.</p>

            <button class="button" type="submit" id="authSubmit">log in</button>
          </form>
        </section>

        <section class="marketing-copy">
          <p class="eyebrow">what you can customize</p>
          <h1>everything important</h1>
          <div class="feature-list">
            <div class="feature-pill">
              <strong>Avatar and backdrop</strong>
              Upload-style image URLs for pfp, full background image, and optional audio.
            </div>
            <div class="feature-pill">
              <strong>Card feel</strong>
              Tweak radius, width, opacity, border, accent colors, and effects.
            </div>
            <div class="feature-pill">
              <strong>Public usernames</strong>
              Your username becomes the public profile route and can not use reserved names.
            </div>
          </div>
        </section>
      </div>
    </section>
  `;

  const authForm = document.getElementById("authForm");
  const flash = document.getElementById("authFlash");
  const hint = document.getElementById("authHint");
  const submitButton = document.getElementById("authSubmit");
  const usernameField = document.getElementById("usernameField");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const tabButtons = document.querySelectorAll("[data-tab]");

  function setFlash(message, type = "") {
    flash.textContent = message;
    flash.className = `flash${type ? ` is-${type}` : ""}`;
  }

  function switchMode(mode) {
    authForm.mode.value = mode;
    submitButton.textContent = mode === "login" ? "log in" : "create account";
    hint.textContent = mode === "login"
      ? "Use your email and password to enter the studio."
      : "Choose a public username, then create your account with email and password.";
    usernameField.style.display = mode === "register" ? "grid" : "none";
    usernameInput.required = mode === "register";
    passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";

    tabButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === mode);
    });
  }

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchMode(button.dataset.tab));
  });

  switchMode("login");

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      setFlash("Supabase is not configured yet. Add the anon key and run the SQL setup first.", "error");
      return;
    }

    const formData = new FormData(authForm);
    const mode = formData.get("mode");

    const result = mode === "login"
      ? await loginUser({
          email: String(formData.get("email") || ""),
          password: String(formData.get("password") || "")
        })
      : await registerUser({
          username: String(formData.get("username") || ""),
          email: String(formData.get("email") || ""),
          password: String(formData.get("password") || "")
        });

    if (!result.ok) {
      setFlash(result.message, "error");
      return;
    }

    if (mode === "register" && result.needsEmailConfirm) {
      setFlash("Account created. Check your email confirmation link, then log in.", "success");
      switchMode("login");
      return;
    }

    setFlash("Success. Opening the studio...", "success");
    window.setTimeout(() => {
      window.location.href = studioUrl();
    }, 250);
  });
}

init();
