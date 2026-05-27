import {
  applyPageTheme,
  attachProfileInteractions,
  authUrl,
  defaultProfile,
  escapeHtml,
  getCurrentSession,
  getCurrentUserEmail,
  getCurrentUserProfile,
  homeUrl,
  logoutUser,
  parseProfileForm,
  profileUrl,
  renderProfileCard,
  sendPasswordReset,
  updateCurrentUserPassword,
  updateProfile
} from "./app.js";

const studioRoot = document.getElementById("pageRoot");

async function init() {
  const studioSession = await getCurrentSession();

  if (!studioSession) {
    window.location.href = authUrl();
    return;
  }

  const sessionProfile = await getCurrentUserProfile();
  const signedInEmail = await getCurrentUserEmail();
  if (!sessionProfile) {
    studioRoot.innerHTML = `
      <section class="empty-panel">
        <p class="eyebrow">setup needed</p>
        <h1 class="studio-title">profile row not found</h1>
        <p>Run the Supabase SQL setup first so new auth accounts automatically create profile rows.</p>
        <div class="row-actions">
          <a class="button" href="${homeUrl()}">back home</a>
        </div>
      </section>
    `;
    return;
  }

  const initialProfile = { ...sessionProfile };
  const defaultDraftProfile = defaultProfile(studioSession);

  function repeatItemMarkup(type, item = {}) {
    if (type === "bubble") {
      return `
        <div class="repeat-item" data-info-bubble>
          <div class="repeat-item__header">
            <strong>Info Bubble</strong>
            <label class="pill-toggle">
              <input name="bubbleVisible" type="checkbox" ${item.visible !== false ? "checked" : ""}>
              <span>show</span>
            </label>
          </div>
          <div class="input-grid">
            <div class="field">
              <label>Bubble title</label>
              <input name="bubbleLabel" value="${escapeHtml(item.label || "")}" placeholder="status">
            </div>
            <div class="field">
              <label>Bubble text</label>
              <input name="bubbleValue" value="${escapeHtml(item.value || "")}" placeholder="online now">
            </div>
          </div>
        </div>
      `;
    }

    if (type === "social") {
      return `
        <div class="repeat-item" data-social-item>
          <div class="repeat-item__header">
            <strong>Social</strong>
            <button class="ghost-button" type="button" data-remove-item>remove</button>
          </div>
          <div class="input-grid">
            <div class="field">
              <label>Label</label>
              <input name="socialLabel" value="${escapeHtml(item.label || "")}" placeholder="discord">
            </div>
            <div class="field">
              <label>URL</label>
              <input name="socialUrl" value="${escapeHtml(item.url || "")}" placeholder="https://discord.com/">
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="repeat-item" data-button-item>
        <div class="repeat-item__header">
          <strong>Link Button</strong>
          <button class="ghost-button" type="button" data-remove-item>remove</button>
        </div>
        <div class="stack-form">
          <div class="field">
            <label>Title</label>
            <input name="buttonTitle" value="${escapeHtml(item.title || "")}" placeholder="portfolio">
          </div>
          <div class="field">
            <label>Subtitle</label>
            <input name="buttonSubtitle" value="${escapeHtml(item.subtitle || "")}" placeholder="selected work and experiments">
          </div>
          <div class="field">
            <label>URL</label>
            <input name="buttonUrl" value="${escapeHtml(item.url || "")}" placeholder="https://example.com/">
          </div>
        </div>
      </div>
    `;
  }

  studioRoot.innerHTML = `
    <section class="studio-shell">
      <nav class="site-nav">
        <a class="brand" href="${homeUrl()}">
          <span class="brand__orb"></span>
          <span class="brand__name">villainize.lol</span>
        </a>
        <div class="nav-actions">
          <a class="secondary-button" href="${profileUrl(studioSession)}">view page</a>
          <button class="danger-button" type="button" id="logoutButton">log out</button>
        </div>
      </nav>

      <header class="studio-header">
        <div>
          <p class="eyebrow">customization studio</p>
          <h1 class="studio-title">edit every part of your page</h1>
          <p class="studio-subtitle">
            Signed in as <strong>${escapeHtml(studioSession)}</strong>. Changes save to Supabase when you click save.
          </p>
        </div>
        <div class="row-actions">
          <button class="secondary-button" type="button" id="resetButton">reset to defaults</button>
          <button class="button" type="button" id="saveButton">save changes</button>
        </div>
      </header>

      <div class="editor-layout">
        <form class="control-panel" id="studioForm">
          <p class="flash" id="studioFlash"></p>

          <section class="panel-section">
            <p class="section-heading">Identity</p>
            <div class="stack-form">
              <div class="input-grid">
                <div class="field">
                  <label>Username</label>
                  <input value="${escapeHtml(studioSession)}" disabled>
                </div>
                <div class="field">
                  <label>Display name</label>
                  <input name="displayName" value="${escapeHtml(initialProfile.displayName)}">
                </div>
              </div>
              <p class="hint">Your username sets the profile handle and site title automatically.</p>
              <div class="field">
                <label>Bio</label>
                <textarea name="bio">${escapeHtml(initialProfile.bio)}</textarea>
              </div>
              <div class="input-grid">
                <div class="field">
                  <label>Status</label>
                  <input name="status" value="${escapeHtml(initialProfile.status)}">
                </div>
                <div class="field">
                  <label>Footer text</label>
                  <input name="footer" value="${escapeHtml(initialProfile.footer)}">
                </div>
              </div>
            </div>
          </section>

          <section class="panel-section">
            <div class="repeat-item__header">
              <p class="section-heading">Info bubbles</p>
              <span class="tiny">Rename, rewrite, or hide any bubble. Keep two visible if you want a cleaner look.</span>
            </div>
            <div class="repeat-list" id="bubbleList">
              ${((initialProfile.infoBubbles && initialProfile.infoBubbles.length)
                ? initialProfile.infoBubbles
                : [
                    { label: "handle", value: initialProfile.handle, visible: true },
                    { label: "focus", value: "creator mode", visible: true },
                    { label: "location", value: "internet", visible: false }
                  ]
              ).map((item) => repeatItemMarkup("bubble", item)).join("")}
            </div>
          </section>

          <section class="panel-section">
            <p class="section-heading">Overlay and media</p>
            <div class="stack-form">
              <div class="input-grid">
                <div class="field">
                  <label>Overlay tag</label>
                  <input name="overlayTag" value="${escapeHtml(initialProfile.overlayTag)}">
                </div>
                <div class="field">
                  <label>Overlay title</label>
                  <input name="overlayTitle" value="${escapeHtml(initialProfile.overlayTitle)}">
                </div>
              </div>
              <label class="pill-toggle">
                <input name="showOverlay" type="checkbox" ${initialProfile.showOverlay ? "checked" : ""}>
                <span>Show click-to-enter overlay</span>
              </label>
              <div class="media-grid">
                <div class="upload-card">
                  <div class="upload-card__top">
                    <strong>Avatar image</strong>
                    <button class="ghost-button" type="button" data-clear-image="avatar">clear</button>
                  </div>
                  <div class="upload-card__preview" id="avatarPreview"></div>
                  <div class="upload-card__actions">
                    <label class="secondary-button" for="avatarUpload">upload avatar</label>
                    <input class="file-input" id="avatarUpload" type="file" accept="image/*">
                  </div>
                  <input name="avatarImage" id="avatarImageInput" type="hidden" value="${escapeHtml(initialProfile.avatarImage)}">
                </div>

                <div class="upload-card">
                  <div class="upload-card__top">
                    <strong>Background image</strong>
                    <button class="ghost-button" type="button" data-clear-image="background">clear</button>
                  </div>
                  <div class="upload-card__preview" id="backgroundPreview"></div>
                  <div class="upload-card__actions">
                    <label class="secondary-button" for="backgroundUpload">upload background</label>
                    <input class="file-input" id="backgroundUpload" type="file" accept="image/*">
                  </div>
                  <input name="backgroundImage" id="backgroundImageInput" type="hidden" value="${escapeHtml(initialProfile.backgroundImage)}">
                </div>
              </div>
              <div class="field">
                <label>Avatar fallback text</label>
                <input name="avatarText" value="${escapeHtml(initialProfile.avatarText)}">
              </div>
              <div class="field">
                <label>Audio URL</label>
                <input name="audioUrl" value="${escapeHtml(initialProfile.audioUrl)}" placeholder="https://...mp3">
              </div>
            </div>
          </section>

          <section class="panel-section">
            <p class="section-heading">Style</p>
            <div class="stack-form">
              <div class="input-grid">
                <div class="field">
                  <label>Accent color</label>
                  <input name="accent" value="${escapeHtml(initialProfile.accent)}">
                </div>
                <div class="field">
                  <label>Accent color 2</label>
                  <input name="accent2" value="${escapeHtml(initialProfile.accent2)}">
                </div>
              </div>
              <div class="input-grid">
                <div class="field">
                  <label>Text color</label>
                  <input name="textColor" value="${escapeHtml(initialProfile.textColor)}">
                </div>
                <div class="field">
                  <label>Muted color</label>
                  <input name="mutedColor" value="${escapeHtml(initialProfile.mutedColor)}">
                </div>
              </div>
              <div class="field">
                <label>Border color</label>
                <input name="borderColor" value="${escapeHtml(initialProfile.borderColor)}">
              </div>
              <div class="input-grid">
                <div class="field">
                  <label>Background effect</label>
                  <select name="effectType">
                    ${[
                      ["none", "none"],
                      ["bubbles", "bubbles"],
                      ["sparkles", "sparkles"],
                      ["squares", "squares"],
                      ["diamonds", "diamonds"],
                      ["stars", "stars"],
                      ["hearts", "hearts"],
                      ["snow", "snow"],
                      ["lines", "lines"],
                      ["shards", "shards"],
                      ["dots", "dots"],
                      ["rings", "rings"]
                    ].map(([value, label]) => `
                      <option value="${value}" ${(initialProfile.effectType || "bubbles") === value ? "selected" : ""}>${label}</option>
                    `).join("")}
                  </select>
                </div>
                <div class="field">
                  <label>Effect opacity</label>
                  <input name="effectOpacity" type="number" min="0" max="1" step="0.01" value="${escapeHtml(String(initialProfile.effectOpacity ?? initialProfile.bubbleOpacity ?? 0.38))}">
                </div>
              </div>
              <details class="advanced-panel">
                <summary>Advanced look controls</summary>
                <div class="advanced-panel__body">
                  <div class="stack-form">
                    <div class="input-grid">
                      <div class="field">
                        <label>Card opacity</label>
                        <input name="cardOpacity" type="number" min="0.2" max="1" step="0.01" value="${escapeHtml(String(initialProfile.cardOpacity))}">
                      </div>
                      <div class="field">
                        <label>Background opacity</label>
                        <input name="backgroundOpacity" type="number" min="0" max="0.8" step="0.01" value="${escapeHtml(String(initialProfile.backgroundOpacity))}">
                      </div>
                    </div>
                    <div class="input-grid">
                      <div class="field">
                        <label>Border size</label>
                        <input name="borderSize" type="number" min="0" max="8" step="1" value="${escapeHtml(String(initialProfile.borderSize))}">
                      </div>
                      <div class="field">
                        <label>Radius</label>
                        <input name="radius" type="number" min="8" max="48" step="1" value="${escapeHtml(String(initialProfile.radius))}">
                      </div>
                    </div>
                    <div class="input-grid">
                      <div class="field">
                        <label>Card width</label>
                        <input name="cardWidth" type="number" min="420" max="760" step="10" value="${escapeHtml(String(initialProfile.cardWidth))}">
                      </div>
                      <div class="field">
                        <label>Avatar size</label>
                        <input name="avatarSize" type="number" min="72" max="180" step="2" value="${escapeHtml(String(initialProfile.avatarSize))}">
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </section>

          <section class="panel-section">
            <div class="repeat-item__header">
              <p class="section-heading">Social bubbles</p>
              <button class="secondary-button" type="button" id="addSocialButton">add social</button>
            </div>
            <div class="repeat-list" id="socialList">
              ${initialProfile.socials.map((item) => repeatItemMarkup("social", item)).join("")}
            </div>
          </section>

          <section class="panel-section">
            <div class="repeat-item__header">
              <p class="section-heading">Main links</p>
              <button class="secondary-button" type="button" id="addButtonButton">add link</button>
            </div>
            <div class="repeat-list" id="buttonList">
              ${initialProfile.buttons.map((item) => repeatItemMarkup("button", item)).join("")}
            </div>
          </section>

          <section class="panel-section">
            <p class="section-heading">Account security</p>
            <div class="stack-form">
              <div class="input-grid">
                <div class="field">
                  <label for="studioNewPassword">New password</label>
                  <input id="studioNewPassword" name="studioNewPassword" type="password" autocomplete="new-password" placeholder="new password">
                </div>
                <div class="field">
                  <label for="studioConfirmPassword">Confirm new password</label>
                  <input id="studioConfirmPassword" name="studioConfirmPassword" type="password" autocomplete="new-password" placeholder="confirm password">
                </div>
              </div>
              <p class="hint">Want a reset email instead? Send one to your signed-in email and finish the change from that link.</p>
              <div class="row-actions">
                <button class="secondary-button" type="button" id="sendResetEmailButton">email reset link</button>
                <button class="button" type="button" id="changePasswordButton">change password</button>
              </div>
            </div>
          </section>
        </form>

        <section class="preview-panel">
          <div id="previewMount"></div>
        </section>
      </div>
    </section>
  `;

  const studioForm = document.getElementById("studioForm");
  const previewMount = document.getElementById("previewMount");
  const studioFlash = document.getElementById("studioFlash");
  const bubbleList = document.getElementById("bubbleList");
  const socialList = document.getElementById("socialList");
  const buttonList = document.getElementById("buttonList");
  const avatarImageInput = document.getElementById("avatarImageInput");
  const backgroundImageInput = document.getElementById("backgroundImageInput");
  const avatarPreview = document.getElementById("avatarPreview");
  const backgroundPreview = document.getElementById("backgroundPreview");
  const newPasswordInput = document.getElementById("studioNewPassword");
  const confirmPasswordInput = document.getElementById("studioConfirmPassword");

  function populateForm(profile) {
    const bubbleSource = (profile.infoBubbles && profile.infoBubbles.length)
      ? profile.infoBubbles
      : [
          { label: "handle", value: `@${studioSession}`, visible: true },
          { label: "focus", value: "creator mode", visible: true },
          { label: "location", value: "internet", visible: false }
        ];

    studioForm.elements.displayName.value = profile.displayName || "";
    studioForm.elements.bio.value = profile.bio || "";
    studioForm.elements.status.value = profile.status || "";
    studioForm.elements.footer.value = profile.footer || "";
    studioForm.elements.overlayTag.value = profile.overlayTag || "";
    studioForm.elements.overlayTitle.value = profile.overlayTitle || "";
    studioForm.elements.showOverlay.checked = Boolean(profile.showOverlay);
    studioForm.elements.avatarText.value = profile.avatarText || "";
    studioForm.elements.audioUrl.value = profile.audioUrl || "";
    studioForm.elements.accent.value = profile.accent || "";
    studioForm.elements.accent2.value = profile.accent2 || "";
    studioForm.elements.textColor.value = profile.textColor || "";
    studioForm.elements.mutedColor.value = profile.mutedColor || "";
    studioForm.elements.borderColor.value = profile.borderColor || "";
    studioForm.elements.effectType.value = profile.effectType || "bubbles";
    studioForm.elements.effectOpacity.value = String(profile.effectOpacity ?? 0.38);
    studioForm.elements.cardOpacity.value = String(profile.cardOpacity ?? 0.62);
    studioForm.elements.backgroundOpacity.value = String(profile.backgroundOpacity ?? 0.15);
    studioForm.elements.borderSize.value = String(profile.borderSize ?? 1);
    studioForm.elements.radius.value = String(profile.radius ?? 28);
    studioForm.elements.cardWidth.value = String(profile.cardWidth ?? 590);
    studioForm.elements.avatarSize.value = String(profile.avatarSize ?? 116);
    avatarImageInput.value = profile.avatarImage || "";
    backgroundImageInput.value = profile.backgroundImage || "";

    bubbleList.innerHTML = bubbleSource.map((item) => repeatItemMarkup("bubble", item)).join("");
    socialList.innerHTML = (profile.socials || []).map((item) => repeatItemMarkup("social", item)).join("");
    buttonList.innerHTML = (profile.buttons || []).map((item) => repeatItemMarkup("button", item)).join("");

    attachRemoveHandlers(studioForm);
    renderPreview();
  }

  function setStudioFlash(message, type = "") {
    studioFlash.textContent = message;
    studioFlash.className = `flash${type ? ` is-${type}` : ""}`;
  }

  function renderPreview() {
    const profile = parseProfileForm(studioForm, studioSession);
    applyPageTheme(profile);
    previewMount.innerHTML = renderProfileCard(profile, { preview: true });
    attachProfileInteractions(previewMount, profile);
    avatarPreview.innerHTML = profile.avatarImage
      ? `<img src="${escapeHtml(profile.avatarImage)}" alt="Avatar preview">`
      : "<span>No avatar uploaded</span>";
    backgroundPreview.innerHTML = profile.backgroundImage
      ? `<img src="${escapeHtml(profile.backgroundImage)}" alt="Background preview">`
      : "<span>No background uploaded</span>";
  }

  function bindUpload(inputId, hiddenInput) {
    const input = document.getElementById(inputId);
    input.addEventListener("change", () => {
      const [file] = input.files || [];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        hiddenInput.value = String(reader.result);
        renderPreview();
      };
      reader.readAsDataURL(file);
    });
  }

  function attachRemoveHandlers(scope) {
    scope.querySelectorAll("[data-remove-item]").forEach((button) => {
      button.addEventListener("click", () => {
        button.closest(".repeat-item").remove();
        renderPreview();
      });
    });
  }

  bindUpload("avatarUpload", avatarImageInput);
  bindUpload("backgroundUpload", backgroundImageInput);
  populateForm(initialProfile);

  studioForm.addEventListener("input", renderPreview);
  studioForm.addEventListener("change", renderPreview);

  document.getElementById("addSocialButton").addEventListener("click", () => {
    socialList.insertAdjacentHTML("beforeend", repeatItemMarkup("social"));
    attachRemoveHandlers(socialList);
  });

  document.getElementById("addButtonButton").addEventListener("click", () => {
    buttonList.insertAdjacentHTML("beforeend", repeatItemMarkup("button"));
    attachRemoveHandlers(buttonList);
  });

  document.getElementById("saveButton").addEventListener("click", async () => {
    const updated = parseProfileForm(studioForm, studioSession);
    const saved = await updateProfile(studioSession, updated);

    if (!saved) {
      setStudioFlash("Could not save to Supabase. Check the SQL setup and login session.", "error");
      return;
    }

    setStudioFlash("Changes saved. Your public page is updated.", "success");
  });

  document.querySelectorAll("[data-clear-image]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.clearImage === "avatar") {
        avatarImageInput.value = "";
      } else {
        backgroundImageInput.value = "";
      }
      renderPreview();
    });
  });

  document.getElementById("resetButton").addEventListener("click", () => {
    populateForm(defaultDraftProfile);
    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    setStudioFlash("Reset preview to defaults. Click save changes to make it permanent.", "success");
  });

  document.getElementById("changePasswordButton").addEventListener("click", async () => {
    const newPassword = newPasswordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    if (!newPassword || !confirmPassword) {
      setStudioFlash("Enter your new password twice before trying to change it.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setStudioFlash("Your new password and confirmation do not match.", "error");
      return;
    }

    const result = await updateCurrentUserPassword(newPassword);
    if (!result.ok) {
      setStudioFlash(result.message || "Could not change the password right now.", "error");
      return;
    }

    newPasswordInput.value = "";
    confirmPasswordInput.value = "";
    setStudioFlash("Password changed successfully.", "success");
  });

  document.getElementById("sendResetEmailButton").addEventListener("click", async () => {
    if (!signedInEmail) {
      setStudioFlash("Could not find the signed-in email for this account.", "error");
      return;
    }

    const result = await sendPasswordReset(signedInEmail);
    if (!result.ok) {
      setStudioFlash(result.message || "Could not send the password reset email.", "error");
      return;
    }

    setStudioFlash(`Password reset email sent to ${signedInEmail}.`, "success");
  });

  document.getElementById("logoutButton").addEventListener("click", async () => {
    await logoutUser();
    window.location.href = authUrl();
  });
}

init();
