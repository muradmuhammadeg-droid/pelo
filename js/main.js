// main.js — small interactions for invite/copy/toast
(function(){
  const inviteBtn = document.getElementById('invite-btn');
  const copyBtn = document.getElementById('copy-btn');
  const inviteInput = document.getElementById('invite-input');
  const openInvite = document.getElementById('open-invite');
  const copyInvite = document.getElementById('copy-invite');
  const inviteLink = document.getElementById('invite-link');
  const copyInvite2 = document.getElementById('copy-invite-2');
  const toast = document.getElementById('toast');

  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(()=> toast.classList.remove('show'), 2500);
  }

  function normalizeInvite(value){
    if(!value) return 'https://discord.com/invite/YOURCODE';
    value = value.trim();
    if(value.startsWith('http')) return value;
    if(value.startsWith('discord.gg/') || value.startsWith('invite/')) return 'https://' + value.replace(/^\/+/, '');
    return 'https://discord.com/invite/' + value.replace(/.*\/(.*)$/,'$1');
  }

  // Open hero invite (scroll to invite section)
  inviteBtn && inviteBtn.addEventListener('click', function(e){
    e.preventDefault();
    document.getElementById('invite').scrollIntoView({behavior:'smooth'});
  });

  // Copy default invite
  copyBtn && copyBtn.addEventListener('click', function(){
    const url = normalizeInvite(inviteInput.value);
    navigator.clipboard.writeText(url).then(()=> showToast('Invite link copied'))
    .catch(()=> showToast('Failed to copy — try selecting the link'));
  });

  // Open invite from card
  openInvite && openInvite.addEventListener('click', function(){
    const url = normalizeInvite(inviteInput.value);
    window.open(url, '_blank', 'noopener');
  });

  copyInvite && copyInvite.addEventListener('click', function(){
    const url = normalizeInvite(inviteInput.value);
    navigator.clipboard.writeText(url).then(()=> showToast('Invite link copied'))
    .catch(()=> showToast('Failed to copy'));
  });

  // Invite section copy/open
  copyInvite2 && copyInvite2.addEventListener('click', function(){
    const url = normalizeInvite(inviteLink.href);
    navigator.clipboard.writeText(url).then(()=> showToast('Invite link copied'))
    .catch(()=> showToast('Failed to copy'));
  });

})();
