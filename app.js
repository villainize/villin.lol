import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { BRAND_NAME, SUPABASE_ANON_KEY, SUPABASE_URL } from "./app-config.js";

export const RESERVED_USERNAMES = new Set([
  "yugioh",
  "gs",
  "bf",
  "bf_stories",
  "d.o.t.t",
  "v",
  "login",
  "register",
  "studio",
  "auth"
]);

const DEMO_PROFILE = {
  siteTitle: "villen profile",
  displayName: "Evil Villain",
  bio: "Dark aesthetic, sharp links, and a profile page built to feel dangerous. One place for identity, socials, drops, and whatever chaos comes next.",
  status: "plotting something",
  footer: `customized in ${BRAND_NAME} studio`,
  avatarText: "EV",
  infoBubbles: [
    { label: "handle", value: "@villen", visible: true },
    { label: "focus", value: "villain arc", visible: true },
    { label: "location", value: "hidden lair", visible: false }
  ]
};

export const isSupabaseConfigured =
  Boolean(SUPABASE_URL) &&
  Boolean(SUPABASE_ANON_KEY) &&
  SUPABASE_ANON_KEY !== "PASTE_YOUR_SUPABASE_ANON_KEY_HERE";

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

const isLocalHost = ["127.0.0.1", "localhost"].includes(window.location.hostname);

export function normalizeUsername(value) {
  return value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

export function validUsername(value) {
  return /^[a-z0-9._-]{3,32}$/.test(value);
}

export function defaultProfile(username = "demo") {
  return {
    username,
    siteTitle: `${username} profile`,
    overlayTag: "personal page",
    overlayTitle: "click to enter",
    handle: `@${username}`,
    displayName: username,
    bio: "Build your own dramatic profile page with full control over visuals, links, avatar, colors, and animated effects.",
    status: "online now",
    footer: `made with ${BRAND_NAME}`,
    avatarText: username.slice(0, 2).toUpperCase(),
    avatarImage: "",
    backgroundImage: "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1400&q=80",
    audioUrl: "",
    accent: "#7ae7ff",
    accent2: "#ff7ad9",
    textColor: "#f6f8ff",
    mutedColor: "rgba(246, 248, 255, 0.72)",
    borderColor: "rgba(255, 255, 255, 0.12)",
    cardOpacity: 0.62,
    backgroundOpacity: 0.15,
    effectOpacity: 0.38,
    borderSize: 1,
    radius: 28,
    cardWidth: 590,
    avatarSize: 116,
    effectType: "bubbles",
    showOverlay: true,
    infoBubbles: [
      { label: "handle", value: `@${username}`, visible: true },
      { label: "focus", value: "creator mode", visible: true },
      { label: "location", value: "internet", visible: true }
    ],
    socials: [
      { label: "discord", url: "https://discord.com/" },
      { label: "github", url: "https://github.com/" },
      { label: "x", url: "https://x.com/" }
    ],
    buttons: [
      { title: "main link", subtitle: "showcase your important destination", url: "#" },
      { title: "contact", subtitle: "email, bookings, and messages", url: "#" },
      { title: "latest project", subtitle: "music, art, stream, or portfolio", url: "#" }
    ]
  };
}

export function getDemoProfile() {
  return normalizeProfile("villen", DEMO_PROFILE);
}

export function normalizeProfile(username, profile = {}) {
  const defaults = defaultProfile(username);
  const merged = {
    ...defaults,
    ...profile,
    username,
    handle: `@${username}`,
    siteTitle: `${username} profile`
  };

  if (!Array.isArray(profile.infoBubbles) || profile.infoBubbles.length === 0) {
    merged.infoBubbles = [
      { label: "handle", value: `@${username}`, visible: true },
      { label: "focus", value: profile.focus || defaults.infoBubbles[1].value, visible: true },
      { label: "location", value: profile.location || defaults.infoBubbles[2].value, visible: false }
    ];
  } else {
    merged.infoBubbles = profile.infoBubbles.map((item, index) => ({
      label: item?.label || defaults.infoBubbles[index]?.label || "info",
      value: item?.value || "",
      visible: item?.visible !== false
    }));
  }

  if (!merged.footer || merged.footer.includes("pulse.bio")) {
    merged.footer = defaults.footer;
  }

  if (typeof merged.effectOpacity !== "number" || Number.isNaN(merged.effectOpacity)) {
    merged.effectOpacity = profile.bubbleOpacity ?? defaults.effectOpacity;
  }

  return merged;
}

function profileFromRow(row) {
  return normalizeProfile(row.username, {
    siteTitle: row.site_title,
    displayName: row.display_name,
    bio: row.bio,
    status: row.status,
    footer: row.footer,
    overlayTag: row.overlay_tag,
    overlayTitle: row.overlay_title,
    showOverlay: row.show_overlay,
    avatarText: row.avatar_text,
    avatarImage: row.avatar_image,
    backgroundImage: row.background_image,
    audioUrl: row.audio_url,
    accent: row.accent,
    accent2: row.accent_2,
    textColor: row.text_color,
    mutedColor: row.muted_color,
    borderColor: row.border_color,
    cardOpacity: Number(row.card_opacity),
    backgroundOpacity: Number(row.background_opacity),
    effectOpacity: Number(row.effect_opacity),
    borderSize: Number(row.border_size),
    radius: Number(row.radius),
    cardWidth: Number(row.card_width),
    avatarSize: Number(row.avatar_size),
    effectType: row.effect_type,
    infoBubbles: row.info_bubbles,
    socials: row.socials,
    buttons: row.buttons
  });
}

function profileToRow(profile) {
  return {
    site_title: `${profile.username} profile`,
    display_name: profile.displayName,
    bio: profile.bio,
    status: profile.status,
    footer: profile.footer,
    overlay_tag: profile.overlayTag,
    overlay_title: profile.overlayTitle,
    show_overlay: profile.showOverlay,
    avatar_text: profile.avatarText,
    avatar_image: profile.avatarImage,
    background_image: profile.backgroundImage,
    audio_url: profile.audioUrl,
    accent: profile.accent,
    accent_2: profile.accent2,
    text_color: profile.textColor,
    muted_color: profile.mutedColor,
    border_color: profile.borderColor,
    card_opacity: profile.cardOpacity,
    background_opacity: profile.backgroundOpacity,
    effect_opacity: profile.effectOpacity,
    border_size: profile.borderSize,
    radius: profile.radius,
    card_width: profile.cardWidth,
    avatar_size: profile.avatarSize,
    effect_type: profile.effectType,
    info_bubbles: profile.infoBubbles,
    socials: profile.socials,
    buttons: profile.buttons
  };
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function profileUrl(username) {
  return isLocalHost
    ? `./index.html?user=${encodeURIComponent(username)}`
    : `/${encodeURIComponent(username)}`;
}

export function homeUrl() {
  return isLocalHost ? "./index.html" : "/";
}

export function studioUrl() {
  return "./studio.html";
}

export function authUrl() {
  return "./auth.html";
}

export function authRecoveryUrl() {
  return new URL("./auth.html?mode=recovery", window.location.href).toString();
}

export function applyPageTheme(profile) {
  document.title = `${profile.username} profile`;
  document.documentElement.style.setProperty("--accent", profile.accent);
  document.documentElement.style.setProperty("--accent-2", profile.accent2);
  document.documentElement.style.setProperty("--app-bg-opacity", String(profile.backgroundOpacity || 0.14));

  if (profile.backgroundImage) {
    document.documentElement.style.setProperty("--app-bg-image", `url("${profile.backgroundImage}")`);
  } else {
    document.documentElement.style.setProperty("--app-bg-image", "none");
  }
}

function sessionUsername(session) {
  return normalizeUsername(session?.user?.user_metadata?.username || "");
}

export async function getCurrentSession() {
  if (!supabase) {
    return "";
  }

  const { data } = await supabase.auth.getSession();
  return sessionUsername(data.session);
}

async function getCurrentAuthSession() {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getSession();
  return data.session || null;
}

export async function getCurrentUserEmail() {
  const session = await getCurrentAuthSession();
  return session?.user?.email || "";
}

export async function logoutUser() {
  if (!supabase) {
    return;
  }
  await supabase.auth.signOut();
}

export async function registerUser({ username, email, password }) {
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  const normalized = normalizeUsername(username);
  if (!validUsername(normalized)) {
    return { ok: false, message: "Username must be 3-32 characters and use lowercase letters, numbers, dots, hyphens, or underscores." };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, message: "That username is reserved and can not be used." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("username")
    .eq("username", normalized)
    .maybeSingle();

  if (existing) {
    return { ok: false, message: "That username is already taken." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username: normalized }
    }
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    username: normalized,
    needsEmailConfirm: !data.session
  };
}

export async function loginUser({ email, password }) {
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return {
    ok: true,
    username: sessionUsername(data.session)
  };
}

export async function sendPasswordReset(email) {
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) {
    return { ok: false, message: "Enter your email first so we know where to send the reset link." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: authRecoveryUrl()
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function updateCurrentUserPassword(password) {
  if (!supabase) {
    return { ok: false, message: "Supabase is not configured yet." };
  }

  if (String(password || "").length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true };
}

export async function getProfile(username) {
  if (!supabase) {
    return username === "villen" ? getDemoProfile() : null;
  }

  const normalized = normalizeUsername(username);
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", normalized)
    .maybeSingle();

  if (error || !data) {
    return normalized === "villen" ? getDemoProfile() : null;
  }

  return profileFromRow(data);
}

export async function getCurrentUserProfile() {
  const session = await getCurrentAuthSession();
  if (!session) {
    return null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (data) {
    return profileFromRow(data);
  }

  const username = sessionUsername(session);
  if (!username) {
    return null;
  }

  const fallbackProfile = defaultProfile(username);
  const insertPayload = {
    user_id: session.user.id,
    username,
    ...profileToRow(fallbackProfile)
  };

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(insertPayload)
    .select("*")
    .single();

  if (insertError || !inserted) {
    return null;
  }

  return profileFromRow(inserted);
}

export async function updateProfile(username, updates) {
  const session = await getCurrentAuthSession();
  if (!session) {
    return null;
  }

  const normalized = normalizeUsername(username);
  const nextProfile = normalizeProfile(normalized, updates);
  const payload = profileToRow(nextProfile);

  const { data, error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("user_id", session.user.id)
    .select("*")
    .single();

  if (error || !data) {
    return null;
  }

  return profileFromRow(data);
}

export function renderAvatar(profile) {
  if (profile.avatarImage) {
    return `<img src="${escapeHtml(profile.avatarImage)}" alt="${escapeHtml(profile.displayName)} avatar">`;
  }
  return escapeHtml(profile.avatarText || profile.displayName.slice(0, 2).toUpperCase());
}

const effectCounts = {
  none: 0,
  bubbles: 14,
  sparkles: 28,
  squares: 16,
  diamonds: 16,
  stars: 22,
  hearts: 18,
  snow: 24,
  lines: 14,
  shards: 16,
  dots: 26,
  rings: 18
};

function createEffectMarkup(profile) {
  const effectType = profile.effectType || "none";
  const count = effectCounts[effectType] || 0;

  if (effectType === "none" || count <= 0) {
    return "";
  }

  let html = "";
  for (let index = 0; index < count; index += 1) {
    const size = 12 + (index % 5) * 10 + Math.round(Math.random() * 8);
    const left = (index * 13) % 100;
    const duration = 10 + (index % 7) * 2;
    const delay = (index % 6) * -1.6;
    html += `
      <span
        class="scene-effect scene-effect--${effectType}"
        style="left:${left}%;width:${size}px;height:${size}px;--effect-size:${size}px;animation-duration:${duration}s;animation-delay:${delay}s"
      ></span>
    `;
  }
  return html;
}

export function renderProfileCard(profile, options = {}) {
  const showOverlay = options.preview ? false : Boolean(profile.showOverlay);
  const infoBubbles = (profile.infoBubbles || [])
    .filter((item) => item && item.visible && (item.label || item.value))
    .map(
      (item) => `
        <div class="meta-box meta-box--bubble">
          <span class="meta-box__label">${escapeHtml(item.label || "")}</span>
          <span class="meta-box__value">${escapeHtml(item.value || "")}</span>
        </div>
      `
    )
    .join("");
  const socials = profile.socials
    .filter((item) => item.label && item.url)
    .map(
      (item) => `
        <a class="social-chip" href="${escapeHtml(item.url)}" target="_blank" rel="noreferrer">
          ${escapeHtml(item.label)}
        </a>
      `
    )
    .join("");

  const buttons = profile.buttons
    .filter((item) => item.title && item.url)
    .map(
      (item) => `
        <a class="link-block" href="${escapeHtml(item.url)}" target="${item.url.startsWith("http") ? "_blank" : "_self"}" rel="noreferrer">
          <span>${escapeHtml(item.title)}</span>
          <span>${escapeHtml(item.subtitle || "")}</span>
        </a>
      `
    )
    .join("");

  return `
    <section
      class="profile-card"
      style="
        --profile-accent:${escapeHtml(profile.accent)};
        --profile-accent-2:${escapeHtml(profile.accent2)};
        --profile-text:${escapeHtml(profile.textColor)};
        --profile-muted:${escapeHtml(profile.mutedColor)};
        --profile-border-color:${escapeHtml(profile.borderColor)};
        --profile-card-opacity:${escapeHtml(String(profile.cardOpacity))};
        --profile-bg-layer-opacity:${escapeHtml(String(profile.backgroundOpacity))};
        --profile-effect-opacity:${escapeHtml(String(profile.effectOpacity ?? profile.bubbleOpacity ?? 0.38))};
        --profile-border-size:${escapeHtml(String(profile.borderSize))}px;
        --profile-radius:${escapeHtml(String(profile.radius))}px;
        --profile-card-width:${escapeHtml(String(profile.cardWidth))}px;
        --profile-avatar-size:${escapeHtml(String(profile.avatarSize))}px;
        --profile-bg-image:url('${escapeHtml(profile.backgroundImage)}');
      "
    >
      <div class="profile-bg"></div>
      <div class="effect-layer">${createEffectMarkup(profile)}</div>
      ${showOverlay ? `
        <div class="entry-overlay" data-entry-overlay>
          <div class="entry-overlay__inner">
            <p class="eyebrow">${escapeHtml(profile.overlayTag)}</p>
            <h2 class="entry-overlay__title">${escapeHtml(profile.overlayTitle)}</h2>
            <p class="tiny">sound on recommended</p>
          </div>
        </div>
      ` : ""}
      <div class="profile-content">
        <div class="profile-topline">
          <span class="status-chip">
            <span class="status-chip__dot"></span>
            <span>${escapeHtml(profile.status)}</span>
          </span>
          <button class="icon-button" type="button" data-audio-toggle>
            ${profile.audioUrl ? "sound off" : "no audio"}
          </button>
        </div>

        <div class="profile-center">
          <div class="avatar-ring">
            <div class="profile-avatar">${renderAvatar(profile)}</div>
          </div>

          <div>
            <p class="profile-handle">${escapeHtml(profile.handle)}</p>
            <h1 class="profile-name">${escapeHtml(profile.displayName)}</h1>
            <p class="profile-bio">${escapeHtml(profile.bio)}</p>
          </div>
        </div>

        ${infoBubbles ? `<div class="meta-grid">${infoBubbles}</div>` : ""}

        <div class="social-grid">${socials}</div>
        <div class="links-grid">${buttons}</div>

        <div class="profile-footer">
          <span class="footer-pill">${escapeHtml(profile.footer)}</span>
        </div>
      </div>
      <audio data-profile-audio loop preload="none" src="${escapeHtml(profile.audioUrl || "")}"></audio>
    </section>
  `;
}

export function attachProfileInteractions(scope, profile) {
  const overlay = scope.querySelector("[data-entry-overlay]");
  const toggle = scope.querySelector("[data-audio-toggle]");
  const audio = scope.querySelector("[data-profile-audio]");

  const setToggleText = (text) => {
    if (toggle) {
      toggle.textContent = text;
    }
  };

  const playAudio = async () => {
    if (!profile.audioUrl || !audio) {
      return;
    }

    try {
      await audio.play();
      setToggleText("sound on");
    } catch {
      setToggleText("sound off");
    }
  };

  if (overlay) {
    overlay.addEventListener("click", () => {
      overlay.classList.add("is-hidden");
      playAudio();
    });
  }

  if (toggle) {
    if (!profile.audioUrl || !audio) {
      toggle.disabled = true;
      return;
    }

    toggle.addEventListener("click", async () => {
      if (audio.paused) {
        await playAudio();
      } else {
        audio.pause();
        setToggleText("sound off");
      }
    });
  }
}

export function parseProfileForm(form, username = "") {
  const formData = new FormData(form);
  const profile = {
    overlayTag: String(formData.get("overlayTag") || "").trim(),
    overlayTitle: String(formData.get("overlayTitle") || "").trim(),
    displayName: String(formData.get("displayName") || "").trim(),
    bio: String(formData.get("bio") || "").trim(),
    status: String(formData.get("status") || "").trim(),
    footer: String(formData.get("footer") || "").trim(),
    avatarText: String(formData.get("avatarText") || "").trim(),
    avatarImage: String(formData.get("avatarImage") || "").trim(),
    backgroundImage: String(formData.get("backgroundImage") || "").trim(),
    audioUrl: String(formData.get("audioUrl") || "").trim(),
    effectType: String(formData.get("effectType") || "").trim(),
    accent: String(formData.get("accent") || "").trim(),
    accent2: String(formData.get("accent2") || "").trim(),
    textColor: String(formData.get("textColor") || "").trim(),
    mutedColor: String(formData.get("mutedColor") || "").trim(),
    borderColor: String(formData.get("borderColor") || "").trim(),
    cardOpacity: Number(formData.get("cardOpacity")),
    backgroundOpacity: Number(formData.get("backgroundOpacity")),
    effectOpacity: Number(formData.get("effectOpacity")),
    borderSize: Number(formData.get("borderSize")),
    radius: Number(formData.get("radius")),
    cardWidth: Number(formData.get("cardWidth")),
    avatarSize: Number(formData.get("avatarSize")),
    showOverlay: formData.get("showOverlay") === "on"
  };

  profile.username = username;
  profile.handle = `@${username}`;
  profile.siteTitle = `${username || "profile"} profile`;

  profile.socials = Array.from(form.querySelectorAll("[data-social-item]")).map((item) => ({
    label: item.querySelector("[name='socialLabel']").value.trim(),
    url: item.querySelector("[name='socialUrl']").value.trim()
  })).filter((item) => item.label || item.url);

  profile.buttons = Array.from(form.querySelectorAll("[data-button-item]")).map((item) => ({
    title: item.querySelector("[name='buttonTitle']").value.trim(),
    subtitle: item.querySelector("[name='buttonSubtitle']").value.trim(),
    url: item.querySelector("[name='buttonUrl']").value.trim()
  })).filter((item) => item.title || item.url);

  profile.infoBubbles = Array.from(form.querySelectorAll("[data-info-bubble]")).map((item) => ({
    label: item.querySelector("[name='bubbleLabel']").value.trim(),
    value: item.querySelector("[name='bubbleValue']").value.trim(),
    visible: item.querySelector("[name='bubbleVisible']").checked
  }));

  return normalizeProfile(username, profile);
}
