import {
  authUrl,
  getCurrentSession,
  homeUrl,
  isSupabaseConfigured,
  loginUser,
  profileUrl,
  registerUser,
  sendPasswordReset,
  studioUrl,
  supabase,
  updateCurrentUserPassword
} from "./app.js";

const authRoot = document.getElementById("pageRoot");

function setFlash(element, message, type = "") {
  element.textContent = message;
  element.className = `flash${type ? ` is-${type}` : ""}`;
}

function renderRecoveryMode() {
  authRoot.innerHTML = `
    <section class="auth-shell">
      <nav class="site-nav">
        <a class="brand" href="${homeUrl()}">
          <span class="brand__orb"></span>
          <span class="brand__name">villainize.lol</span>
        </a>
        <div class="nav-actions">
          <a class="secondary-button" href="${authUrl()}">back to login</a>
        </div>
      </nav>

      <div class="auth-grid">
        <section class="auth-panel">
          <p class="eyebrow">password recovery</p>
          <h1>set a new password</h1>
          <p class="auth-subtitle">
            Opened from your email reset link. Choose a new password below.
          </p>

          <p class="flash" id="recoveryFlash"></p>

          <form class="stack-form" id="recoveryForm">
            <div class="field">
              <label for="newPassword">New password</label>
              <input id="newPassword" name="newPassword" type="password" autocomplete="new-password" placeholder="new password" required>
            </div>

            <div class="field">
              <label for="confirmPassword">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" placeholder="confirm password" required>
            </div>

            <p class="hint">Use at least 6 characters.</p>

            <button class="button" type="submit">update password</button>
          </form>
        </section>

        <section class="marketing-copy">
          <p class="eyebrow">next step</p>
          <h1>back into your page</h1>
          <div class="feature-list">
            <div class="feature-pill">
              <strong>After updating</strong>
              You will go back to the login page and can sign in with the new password.
            </div>
            <div class="feature-pill">
              <strong>If the link expires</strong>
              Go back and request another password reset email.
            </div>
          </div>
        </section>
      </div>
    </section>
  `;

  const recoveryForm = document.getElementById("recoveryForm");
  const recoveryFlash = document.getElementById("recoveryFlash");

  recoveryForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(recoveryForm);
    const newPassword = String(formData.get("newPassword") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");

    if (newPassword !== confirmPassword) {
      setFlash(recoveryFlash, "Your new password and confirmation do not match.", "error");
      return;
    }

    const result = await updateCurrentUserPassword(newPassword);
    if (!result.ok) {
      setFlash(recoveryFlash, result.message || "Could not update the password from this recovery link.", "error");
      return;
    }

    setFlash(recoveryFlash, "Password updated. Sending you back to log in.", "success");
    window.setTimeout(() => {
      window.location.href = authUrl();
    }, 700);
  });

  if (supabase) {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setFlash(recoveryFlash, "Recovery link accepted. You can set a new password now.", "success");
      }
    });
  }
}

function renderAccessMode() {
  authRoot.innerHTML = `
    <section class="auth-shell">
      <nav class="site-nav">
        <a class="brand" href="${homeUrl()}">
          <span class="brand__orb"></span>
          <span class="brand__name">villainize.lol</span>
        </a>
        <div class="nav-actions">
          <a class="secondary-button" href="${homeUrl()}">home</a>
          <a class="button" href="${profileUrl("villen")}">demo page</a>
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
            <button class="ghost-button auth-inline-link" type="button" id="forgotPasswordButton">forgot password?</button>

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
  const forgotPasswordButton = document.getElementById("forgotPasswordButton");
  const tabButtons = document.querySelectorAll("[data-tab]");

  function switchMode(mode) {
    authForm.mode.value = mode;
    submitButton.textContent = mode === "login" ? "log in" : "create account";
    hint.textContent = mode === "login"
      ? "Use your email and password to enter the studio."
      : "Choose a public username, then create your account with email and password.";
    usernameField.style.display = mode === "register" ? "grid" : "none";
    forgotPasswordButton.style.display = mode === "login" ? "inline-flex" : "none";
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

  forgotPasswordButton.addEventListener("click", async () => {
    if (!isSupabaseConfigured) {
      setFlash(flash, "Supabase is not configured yet. Add the anon key and run the SQL setup first.", "error");
      return;
    }

    const email = document.getElementById("email").value.trim();
    const result = await sendPasswordReset(email);

    if (!result.ok) {
      setFlash(flash, result.message, "error");
      return;
    }

    setFlash(flash, "Password reset email sent. Open that email and follow the link to set a new password.", "success");
  });

  authForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!isSupabaseConfigured) {
      setFlash(flash, "Supabase is not configured yet. Add the anon key and run the SQL setup first.", "error");
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
      setFlash(flash, result.message, "error");
      return;
    }

    if (mode === "register" && result.needsEmailConfirm) {
      setFlash(flash, "Account created. Check your email confirmation link, then log in.", "success");
      switchMode("login");
      return;
    }

    setFlash(flash, "Success. Opening the studio...", "success");
    window.setTimeout(() => {
      window.location.href = studioUrl();
    }, 250);
  });
}

async function init() {
  const url = new URL(window.location.href);
  const recoveryMode = url.searchParams.get("mode") === "recovery";
  const authSession = await getCurrentSession();

  if (authSession && !recoveryMode) {
    window.location.href = studioUrl();
    return;
  }

  if (recoveryMode) {
    renderRecoveryMode();
    return;
  }

  renderAccessMode();
}

init();
