/* "What is Cyber Security": a Show More button reveals the Red/Blue Team
   cards and the Core Fields grid, with a Show Less button to collapse it
   again. Each team card is independently clickable (and keyboard-operable)
   to reveal its own detail paragraph, with no effect on the other card. */

export function initCyberSecurity() {
  const showMoreBtn = document.getElementById('cybersecShowMoreBtn');
  const showLessBtn = document.getElementById('cybersecShowLessBtn');
  const details = document.getElementById('cybersecDetails');
  if (!showMoreBtn || !details) return;

  function expand() {
    details.hidden = false;
    showMoreBtn.hidden = true;
    showMoreBtn.setAttribute('aria-expanded', 'true');
    if (showLessBtn) {
      showLessBtn.hidden = false;
      showLessBtn.setAttribute('aria-expanded', 'true');
    }
  }

  function collapse() {
    details.hidden = true;
    showMoreBtn.hidden = false;
    showMoreBtn.setAttribute('aria-expanded', 'false');
    if (showLessBtn) {
      showLessBtn.hidden = true;
      showLessBtn.setAttribute('aria-expanded', 'false');
    }
    showMoreBtn.focus();
  }

  showMoreBtn.addEventListener('click', expand);
  if (showLessBtn) showLessBtn.addEventListener('click', collapse);

  const teams = Array.from(document.querySelectorAll('.cybersec-team'));
  teams.forEach((team) => {
    const detailId = team.getAttribute('aria-controls');
    const detail = detailId ? document.getElementById(detailId) : null;
    if (!detail) return;

    function toggle() {
      const expanded = team.getAttribute('aria-expanded') === 'true';
      team.setAttribute('aria-expanded', String(!expanded));
      detail.hidden = expanded;
    }

    team.addEventListener('click', toggle);
    team.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      toggle();
    });
  });
}
