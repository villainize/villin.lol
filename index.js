import {
  applyPageTheme,
  attachProfileInteractions,
  authUrl,
  getCurrentSession,
  getDemoProfile,
  getProfile,
  homeUrl,
  normalizeUsername,
  profileUrl,
  renderProfileCard,
  studioUrl
} from "./app.js";

const pageRoot = document.getElementById("pageRoot");
const params = new URLSearchParams(window.location.search);

function normalizeVisibleUrl() {
  if (!window.location.pathname.endsWith("/index.html")) {
    return;
  }

  const cleanPath = window.location.pathname.replace(/\/index\.html$/, "/");
  const cleanUrl = `${cleanPath}${window.location.search}${window.location.hash}`;
  window.history.replaceState({}, "", cleanUrl);
}

async function renderLanding(currentSession) {
  pageRoot.innerHTML = `
    <section class="landing-shell">
      <nav class="site-nav">
        <a class="brand" href="${homeUrl()}">
          <span class="brand__orb"></span>
          <span class="brand__name">villainize.lol</span>
        </a>
        <div class="nav-actions">
          <a class="secondary-button" href="${currentSession ? studioUrl() : authUrl()}">
            ${currentSession ? "open studio" : "log in"}
          </a>
          <a class="button" href="${profileUrl("villen")}">view demo</a>
        </div>
      </nav>

      <div class="landing-grid">
        <section class="marketing-copy">
          <p class="eyebrow">build your own version</p>
          <h1>make your profile page feel alive</h1>
          <p>
            Register a username, open the studio, and customize the whole page:
            avatar, background, colors, text, links, animated effects, music, and layout.
          </p>

          <div class="feature-list">
            <div class="feature-pill">
              <strong>Full page control</strong>
              Tune colors, borders, card width, avatar size, opacity, and entry overlay text.
            </div>
            <div class="feature-pill">
              <strong>Socials and stacked buttons</strong>
              Add your own links exactly how you want them shown on the public page.
            </div>
            <div class="feature-pill">
              <strong>Supabase-backed profiles</strong>
              Log in with Supabase and save your profile to the database instead of local storage.
            </div>
          </div>

          <div class="row-actions">
            <a class="button" href="${authUrl()}">create account</a>
            <a class="secondary-button" href="${currentSession ? studioUrl() : profileUrl("villen")}">
              ${currentSession ? "edit your page" : "explore demo profile"}
            </a>
          </div>
        </section>

        <div class="preview-panel" id="landingPreview"></div>
      </div>
    </section>
  `;

  const preview = document.getElementById("landingPreview");
  const demoProfile = getDemoProfile();
  applyPageTheme(demoProfile);
  preview.innerHTML = renderProfileCard(demoProfile, { preview: true });
  attachProfileInteractions(preview, demoProfile);
}

async function renderPublicProfile(username, currentSession) {
  const profile = await getProfile(username);

  if (!profile) {
    pageRoot.innerHTML = `
      <section class="empty-panel">
        <p class="eyebrow">profile missing</p>
        <h1 class="studio-title">that page does not exist yet</h1>
        <p>Try creating an account first, then customize your own page in the studio.</p>
        <div class="row-actions">
          <a class="button" href="${authUrl()}">register</a>
          <a class="secondary-button" href="${homeUrl()}">back home</a>
        </div>
      </section>
    `;
    return;
  }

  applyPageTheme(profile);

  pageRoot.innerHTML = `
    <section class="profile-shell">
      <nav class="site-nav shell">
        <a class="brand" href="${homeUrl()}">
          <span class="brand__orb"></span>
          <span class="brand__name">villainize.lol</span>
        </a>
        <div class="nav-actions">
          ${currentSession === username ? `<a class="secondary-button" href="${studioUrl()}">edit page</a>` : ""}
          <a class="button" href="${authUrl()}">create your own</a>
        </div>
      </nav>
      <div id="profileMount"></div>
    </section>
  `;

  const mount = document.getElementById("profileMount");
  mount.innerHTML = renderProfileCard(profile);
  attachProfileInteractions(mount, profile);
}

async function init() {
  normalizeVisibleUrl();

  const currentSession = await getCurrentSession();
  const requestedUser = normalizeUsername(params.get("user") || "");

  if (requestedUser) {
    await renderPublicProfile(requestedUser, currentSession);
  } else {
    await renderLanding(currentSession);
  }
}

init();
