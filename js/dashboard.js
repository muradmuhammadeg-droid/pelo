// js/dashboard.js
// Simple client-side Discord OAuth2 flow using implicit token (response_type=token).
// NOTE: implicit flow exposes access tokens in the browser and is not recommended for production.
// Replace CLIENT_ID and ensure the redirect URI is registered in your Discord application settings.
(function(){
  const CLIENT_ID = '1538172604832153710';
  const SCOPES = ['identify','guilds'];
  const REDIRECT_URI = window.location.origin + window.location.pathname; // must match registered redirect

  const signinBtn = document.getElementById('signin-btn');
  const authMsg = document.getElementById('auth-msg');
  const signinActions = document.getElementById('signin-actions');
  const userArea = document.getElementById('user-area');
  const userName = document.getElementById('user-name');
  const userId = document.getElementById('user-id');
  const userAvatar = document.getElementById('user-avatar');
  const guildsList = document.getElementById('guilds-list');
  const logoutBtn = document.getElementById('logout-btn');

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

  async function loadUser(token){
    try{
      authMsg.textContent = 'Signed in — loading profile...';
      const user = await fetchDiscordAPI('/users/@me', token);
      userName.textContent = `${user.username}#${user.discriminator}`;
      userId.textContent = `ID: ${user.id}`;
      userAvatar.src = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : '';
      // fetch guilds
      const guilds = await fetchDiscordAPI('/users/@me/guilds', token);
      guildsList.innerHTML = '';
      guilds.forEach(g => {
        const li = document.createElement('li');
        li.textContent = `${g.name} (${g.id})`;
        guildsList.appendChild(li);
      });

      signinActions.style.display = 'none';
      userArea.style.display = 'block';
      authMsg.style.display = 'none';
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
      history.replaceState(null, '', REDIRECT_URI);
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
