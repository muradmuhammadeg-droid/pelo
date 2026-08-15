// js/dashboard.js
// Simple client-side Discord OAuth2 flow using implicit token (response_type=token).
// NOTE: implicit flow exposes access tokens in the browser and is not recommended for production.
// Replace CLIENT_ID and ensure the redirect URI is registered in your Discord application settings.
(function(){
  const CLIENT_ID = '1538172604832153710';
  const SCOPES = ['identify','guilds'];
  const REDIRECT_URI = 'https://muradmuhammadeg-droid.github.io/pelo/dashboard.html'; // must match registered redirect

  const signinBtn = document.getElementById('signin-btn');
  const authMsg = document.getElementById('auth-msg');
  const signinActions = document.getElementById('signin-actions');
  const userArea = document.getElementById('user-area');
  const userName = document.getElementById('user-name');
  const userId = document.getElementById('user-id');
  const userAvatar = document.getElementById('user-avatar');
  const guildsList = document.getElementById('guilds-list');
  const logoutBtn = document.getElementById('logout-btn');
  const guildSettingsEl = document.getElementById('guild-settings');

  function buildDiscordAuthUrl(){
    const base = 'https://discord.com/api/oauth2/authorize';
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'token',
      scope: SCOPES.join(' '),
      prompt: 'consent'
    });
    return `${base}?${params.toString()}`;
  }

  function parseHash(hash){
    if(!hash) return null;
    const cleaned = hash.replace(/^#/, '');
    const params = new URLSearchParams(cleaned);
    const access_token = params.get('access_token');
    const token_type = params.get('token_type');
    const expires_in = params.get('expires_in');
    return access_token ? {access_token, token_type, expires_in} : null;
  }

  function saveToken(token){
    localStorage.setItem('pelo_token', token);
  }
  function loadToken(){
    return localStorage.getItem('pelo_token');
  }
  function clearToken(){
    localStorage.removeItem('pelo_token');
  }

  async function fetchDiscordAPI(path, token){
    const res = await fetch(`https://discord.com/api${path}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if(!res.ok) throw new Error(await res.text());
    return res.json();
  }

  function canManageGuild(guild){
    // guild.permissions may be a string; coerce to BigInt for safety
    try{
      const perms = typeof guild.permissions === 'string' ? BigInt(guild.permissions) : BigInt(Number(guild.permissions || 0));
      const MANAGE_GUILD = BigInt(1 << 5); // 0x20
      return guild.owner || (perms & MANAGE_GUILD) === MANAGE_GUILD;
    }catch(e){
      return !!guild.owner;
    }
  }

  function renderGuilds(guilds){
    guildsList.innerHTML = '';
    guilds.forEach(g => {
      const li = document.createElement('li');
      li.className = 'guild-item';

      // clickable wrapper to open Pelo settings for this guild (internal dashboard view)
      const link = document.createElement('a');
      link.href = `dashboard.html?guild_id=${g.id}`;
      link.className = 'guild-link';
      link.setAttribute('data-guild-id', g.id);
      link.rel = 'noopener noreferrer';

      // icon
      const iconWrap = document.createElement('div');
      iconWrap.className = 'guild-icon';
      if (g.icon) {
        const img = document.createElement('img');
        img.src = `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`;
        img.alt = `${g.name} icon`;
        iconWrap.appendChild(img);
      } else {
        const fallback = document.createElement('div');
        fallback.className = 'guild-fallback';
        fallback.textContent = g.name.charAt(0).toUpperCase();
        iconWrap.appendChild(fallback);
      }

      // info
      const info = document.createElement('div');
      info.className = 'guild-info';
      const name = document.createElement('div');
      name.className = 'guild-name';
      name.textContent = g.name;
      info.appendChild(name);

      if (g.owner) {
        const ownerBadge = document.createElement('span');
        ownerBadge.className = 'owner-badge';
        ownerBadge.textContent = 'Owner';
        info.appendChild(ownerBadge);
      } else if (canManageGuild(g)) {
        const mgrBadge = document.createElement('span');
        mgrBadge.className = 'owner-badge';
        mgrBadge.textContent = 'Manage';
        info.appendChild(mgrBadge);
      }

      link.appendChild(iconWrap);
      link.appendChild(info);
      li.appendChild(link);
      guildsList.appendChild(li);

    });
  }

  function showGuildSettings(guild){
    guildSettingsEl.style.display = 'block';
    guildSettingsEl.innerHTML = '';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'guild-settings-header';
    const icon = document.createElement('div');
    icon.className = 'guild-settings-icon';
    if(g.icon){
      const img = document.createElement('img');
      img.src = `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128`;
      img.alt = `${g.name} icon`;
      icon.appendChild(img);
    } else {
      const fb = document.createElement('div'); fb.className='guild-fallback'; fb.textContent = g.name.charAt(0).toUpperCase(); icon.appendChild(fb);
    }
    const h = document.createElement('div');
    h.innerHTML = `<h3>${g.name}</h3><p class="muted small">Guild ID: ${g.id}</p>`;
    titleWrap.appendChild(icon);
    titleWrap.appendChild(h);

    const form = document.createElement('div');
    form.className = 'guild-settings-form';

    // load existing settings from localStorage (demo-only)
    const settingsKey = `pelo_settings_${g.id}`;
    let settings = { prefix: '!', moderation: true };
    try{ const raw = localStorage.getItem(settingsKey); if(raw) settings = JSON.parse(raw); }catch(e){}

    form.innerHTML = `
      <label>Command prefix<br><input id="gs-prefix" type="text" value="${escapeHtml(settings.prefix)}" /></label>
      <label style="display:block;margin-top:8px">Enable moderation<br><input id="gs-moderation" type="checkbox" ${settings.moderation ? 'checked' : ''} /></label>
      <div style="margin-top:12px">
        <button id="gs-save" class="btn primary">Save settings</button>
        <button id="gs-back" class="btn outline">Back to servers</button>
      </div>
    `;

    guildSettingsEl.appendChild(titleWrap);
    guildSettingsEl.appendChild(form);

    document.getElementById('gs-back').addEventListener('click', function(e){
      e.preventDefault();
      // remove guild_id from URL and hide settings
      history.replaceState(null, '', REDIRECT_URI);
      guildSettingsEl.style.display = 'none';
    });

    document.getElementById('gs-save').addEventListener('click', function(){
      const prefix = document.getElementById('gs-prefix').value || '!';
      const moderation = document.getElementById('gs-moderation').checked;
      const payload = { prefix, moderation };
      localStorage.setItem(settingsKey, JSON.stringify(payload));
      alert('Settings saved (demo only).');
    });
  }

  function escapeHtml(unsafe){
    return unsafe.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]; });
  }

  async function loadUser(token){
    try{
      authMsg.textContent = 'Signed in — loading profile...';
      const user = await fetchDiscordAPI('/users/@me', token);
      userName.textContent = `${user.username}#${user.discriminator}`;
      userId.textContent = `ID: ${user.id}`;
      userAvatar.src = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : '';
      // fetch guilds
      const guilds = await fetchDiscordAPI('/users/@me/guilds', token);
      renderGuilds(guilds);

      signinActions.style.display = 'none';
      userArea.style.display = 'block';
      authMsg.style.display = 'none';

      // if URL has guild_id param, show settings for that guild
      const params = new URLSearchParams(window.location.search);
      const selected = params.get('guild_id');
      if(selected){
        const match = guilds.find(g => g.id === selected);
        if(match){
          showGuildSettings(match);
        } else {
          // guild not found (maybe user left it) — show message
          guildSettingsEl.style.display = 'block';
          guildSettingsEl.innerHTML = `<p class="muted">Cannot manage this server (not found in your guild list).</p><button id="gs-back2" class="btn outline">Back to servers</button>`;
          document.getElementById('gs-back2').addEventListener('click', ()=>{ history.replaceState(null,'',REDIRECT_URI); guildSettingsEl.style.display='none'; });
        }
      }

    }catch(err){
      console.error('Discord API error', err);
      authMsg.textContent = 'Failed to load profile. Token may be invalid.';
      signinActions.style.display = '';
      userArea.style.display = 'none';
      clearToken();
    }
  }

  // Handle sign-in button
  signinBtn.addEventListener('click', function(){
    window.location.href = buildDiscordAuthUrl();
  });

  logoutBtn.addEventListener('click', function(){
    clearToken();
    userArea.style.display = 'none';
    signinActions.style.display = '';
    authMsg.style.display = '';
    authMsg.textContent = 'Signed out.';
    // remove token from URL if present
    history.replaceState(null, '', REDIRECT_URI);
  });

  // On load: check URL hash (OAuth implicit), then localStorage
  (function init(){
    const parsed = parseHash(window.location.hash);
    if(parsed && parsed.access_token){
      saveToken(parsed.access_token);
      // clear hash from URL for cleanliness
      history.replaceState(null, '', REDIRECT_URI + window.location.search);
    }
    const token = loadToken();
    if(token){
      authMsg.textContent = 'Signed in';
      signinActions.style.display = 'none';
      loadUser(token);
    }else{
      authMsg.textContent = 'You are not signed in';
      signinActions.style.display = '';
      userArea.style.display = 'none';
    }
  })();

})();
