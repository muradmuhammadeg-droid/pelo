(function(){
  const CLIENT_ID = '1538172604832153710'; // Pelo application / bot client id
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

  function buildInviteUrl(){
    // Invite link for Pelo bot. Adjust permissions as needed. Using applications.commands + bot scope.
    const base = 'https://discord.com/api/oauth2/authorize';
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      scope: 'bot applications.commands',
      permissions: '8' // default admin-level — change to least required in production
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
    if(!res.ok) throw new Error(`${res.status} ${await res.text()}`);
    return res.json();
  }

  function canManageGuild(guild){
    try{
      const perms = typeof guild.permissions === 'string' ? BigInt(guild.permissions) : BigInt(Number(guild.permissions || 0));
      const MANAGE_GUILD = BigInt(1 << 5); // 0x20
      return guild.owner || (perms & MANAGE_GUILD) === MANAGE_GUILD;
    }catch(e){
      return !!guild.owner;
    }
  }

  async function checkBotInstalled(guildId, token){
    try{
      const path = `/guilds/${guildId}/members/${CLIENT_ID}`;
      const res = await fetch(`https://discord.com/api${path}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(res.status === 200) return true;
      if(res.status === 404) return false;
      return null;
    }catch(e){
      return null;
    }
  }

  function renderGuilds(guilds){
    guildsList.innerHTML = '';
    guilds.forEach(g => {
      const li = document.createElement('li');
      li.className = 'guild-item';

      const card = document.createElement('div');
      card.className = 'guild-card';

      // visual content
      const left = document.createElement('div');
      left.className = 'guild-left';
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
      left.appendChild(iconWrap);

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
      left.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'guild-actions';

      const openBtn = document.createElement('button');
      openBtn.className = 'btn outline';
      openBtn.textContent = 'Open Pelo settings';
      openBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const token = loadToken();
        if(!token){ alert('Not signed in'); return; }
        const installed = await checkBotInstalled(g.id, token);
        if(installed === true){
          // open internal settings view
          history.replaceState(null, '', `${REDIRECT_URI}?guild_id=${g.id}`);
          showGuildSettings(g);
        }else if(installed === false){
          const invite = buildInviteUrl();
          window.open(invite, '_blank', 'noopener');
          setTimeout(()=>{
            history.replaceState(null, '', `${REDIRECT_URI}?guild_id=${g.id}`);
            showGuildSettings(g, {preInvite:true});
          }, 800);
        }else{
          const proceed = confirm('Cannot verify whether Pelo is installed in this server. Click OK to open Pelo settings; Cancel to open the invite link to add Pelo.');
          if(proceed){ history.replaceState(null, '', `${REDIRECT_URI}?guild_id=${g.id}`); showGuildSettings(g); }
          else{ window.open(buildInviteUrl(), '_blank', 'noopener'); }
        }
      });

      const inviteBtn = document.createElement('button');
      inviteBtn.className = 'btn primary';
      inviteBtn.textContent = 'Invite Pelo';
      inviteBtn.addEventListener('click', function(e){
        e.preventDefault();
        window.open(buildInviteUrl(), '_blank', 'noopener');
      });

      actions.appendChild(openBtn);
      actions.appendChild(inviteBtn);

      card.appendChild(left);
      card.appendChild(actions);

      li.appendChild(card);
      guildsList.appendChild(li);
    });
  }

  function showGuildSettings(guild, opts){
    opts = opts || {};
    guildSettingsEl.style.display = 'block';
    guildSettingsEl.innerHTML = '';

    const titleWrap = document.createElement('div');
    titleWrap.className = 'guild-settings-header';
    const icon = document.createElement('div');
    icon.className = 'guild-settings-icon';
    if(guild.icon){
      const img = document.createElement('img');
      img.src = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`;
      img.alt = `${guild.name} icon`;
      icon.appendChild(img);
    } else {
      const fb = document.createElement('div'); fb.className='guild-fallback'; fb.textContent = guild.name.charAt(0).toUpperCase(); icon.appendChild(fb);
    }
    const h = document.createElement('div');
    h.innerHTML = `<h3>${guild.name}</h3><p class="muted small">Guild ID: ${guild.id}</p>`;
    titleWrap.appendChild(icon);
    titleWrap.appendChild(h);

    const statusP = document.createElement('p');
    statusP.className = 'muted small';
    statusP.textContent = opts.preInvite ? 'Invite opened in a new tab — once Pelo is added, return here and click Save.' : '';

    const form = document.createElement('div');
    form.className = 'guild-settings-form';

    const settingsKey = `pelo_settings_${guild.id}`;
    let settings = { prefix: '!', moderation: true };
    try{ const raw = localStorage.getItem(settingsKey); if(raw) settings = JSON.parse(raw); }catch(e){}

    form.innerHTML = `
      <label>Command prefix<br><input id="gs-prefix" type="text" value="${escapeHtml(settings.prefix)}" /></label>
      <label style="display:block;margin-top:8px">Enable moderation<br><input id="gs-moderation" type="checkbox" ${settings.moderation ? 'checked' : ''} /></label>
      <div style="margin-top:12px">
        <button id="gs-save" class="btn primary">Save settings</button>
        <button id="gs-back" class="btn outline">Back to servers</button>
        <button id="gs-invite" class="btn">Invite Pelo to this server</button>
      </div>
    `;

    guildSettingsEl.appendChild(titleWrap);
    guildSettingsEl.appendChild(statusP);
    guildSettingsEl.appendChild(form);

    document.getElementById('gs-back').addEventListener('click', function(e){
      e.preventDefault();
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

    document.getElementById('gs-invite').addEventListener('click', function(e){
      e.preventDefault();
      window.open(buildInviteUrl(), '_blank', 'noopener');
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
      const guilds = await fetchDiscordAPI('/users/@me/guilds', token);
      renderGuilds(guilds);

      signinActions.style.display = 'none';
      userArea.style.display = 'block';
      authMsg.style.display = 'none';
      const params = new URLSearchParams(window.location.search);
      const selected = params.get('guild_id');
      if(selected){
        const match = guilds.find(g => g.id === selected);
        if(match){
          showGuildSettings(match);
        } else {
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

  signinBtn.addEventListener('click', function(){
    window.location.href = buildDiscordAuthUrl();
  });

  logoutBtn.addEventListener('click', function(){
    clearToken();
    userArea.style.display = 'none';
    signinActions.style.display = '';
    authMsg.style.display = '';
    authMsg.textContent = 'Signed out.';
    history.replaceState(null, '', REDIRECT_URI);
  });

  (function init(){
    const parsed = parseHash(window.location.hash);
    if(parsed && parsed.access_token){
      saveToken(parsed.access_token);
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
