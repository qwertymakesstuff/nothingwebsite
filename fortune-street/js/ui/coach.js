// The tutorial coach: a floating card with the current step, and a highlight ring on the part
// of the screen the step is about. It only displays; app.js decides which step is current.
import { esc } from './fmt.js';

export function createCoach(root, { onNext, onSkip, onKeepPlaying, onRealGame }) {
  let minimized = false;
  let shownKey = null;

  root.addEventListener('click', e => {
    const b = e.target.closest('[data-coach]');
    if (!b) return;
    const what = b.dataset.coach;
    if (what === 'next') onNext();
    if (what === 'skip') onSkip();
    if (what === 'keep') onKeepPlaying();
    if (what === 'real') onRealGame();
    if (what === 'min') { minimized = !minimized; root.classList.toggle('min', minimized); }
  });

  function clearHighlight() {
    document.querySelectorAll('.coach-target').forEach(el => el.classList.remove('coach-target'));
  }

  // step: one entry of tutorial.STEPS; waiting: true while the game itself is busy (AI, animation)
  function show(step, index, total, { waiting = false } = {}) {
    const key = `${index}`;
    if (key !== shownKey) {
      shownKey = key;
      minimized = false;
      root.classList.remove('min');
      root.innerHTML = `
        <div class="coach-head">
          <span class="coach-count">Tutorial · ${index + 1} / ${total}</span>
          <button type="button" class="coach-min" data-coach="min" aria-label="Minimize the tutorial">–</button>
        </div>
        <h3>${esc(step.title)}</h3>
        <div class="coach-body">${step.body}</div>
        <div class="coach-foot">
          ${step.finale
            ? '<button type="button" class="btn primary" data-coach="keep">Keep playing this match</button><button type="button" class="btn" data-coach="real">Set up a real game</button>'
            : `${step.next ? '<button type="button" class="btn primary" data-coach="next">Next</button>' : '<span class="coach-wait"></span>'}
               <button type="button" class="btn ghost small" data-coach="skip">Skip tutorial</button>`}
        </div>
        <div class="coach-progress"><i style="width:${Math.round(((index + 1) / total) * 100)}%"></i></div>`;
      root.hidden = false;
      document.body.classList.add('coaching');
      const target = step.target && document.querySelector(step.target);
      if (target && !isInView(target)) target.scrollIntoView({ block: matchMedia('(max-width: 900px)').matches ? 'start' : 'center', behavior: 'smooth' });
    }
    const wait = root.querySelector('.coach-wait');
    if (wait) wait.textContent = waiting ? 'Wait for it…' : 'Do the highlighted step';
    clearHighlight();
    const targets = step.target ? [...document.querySelectorAll(step.target)] : [];
    targets.forEach(el => el.classList.add('coach-target'));
    // sit on the opposite side from what we point at, so the card never covers it
    const r = targets[0]?.getBoundingClientRect();
    root.classList.toggle('left', !!r && r.width < innerWidth * 0.6 && r.left + r.width / 2 > innerWidth / 2);
  }

  function hide() {
    shownKey = null;
    root.hidden = true;
    root.innerHTML = '';
    document.body.classList.remove('coaching');
    clearHighlight();
  }

  return { show, hide };
}

function isInView(el) {
  const r = el.getBoundingClientRect();
  return r.top >= 60 && r.bottom <= innerHeight && r.height > 0;
}
