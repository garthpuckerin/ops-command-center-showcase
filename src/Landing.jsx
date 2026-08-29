// Marketing hero landing — shown before the app (not a sign-in gate).
// Built in the LMS Ops Command Center idiom: serif display headline, mono
// eyebrows/metadata, hairline rules, warm oklch tokens, accent-driven CTAs.
// "Launch demo" enters the app. Theming is inherited from body[data-mode]/
// [data-palette] (App sets those), and the dark-mode toggle here drives the
// same tweak so the landing themes live.
import React from 'react';
import { Icon, Eyebrow, Pill, Button } from './components.jsx';

// Feature highlights — drawn from the case-study body, sanitized and
// vendor-agnostic. Each maps to an icon from the shared icon set and reflects
// what the running demo actually shows.
const FEATURES = [
  {
    icon: 'shield',
    title: 'RBAC-scoped command center',
    body: 'Readiness lead, trainer, and learner each see a role-scoped view of the same campaign — dashboards, queues, and home screens that match what that person owns.',
  },
  {
    icon: 'pulse',
    title: 'Epic go-live readiness',
    body: 'Run the cross-functional coordination of an EHR go-live: hundreds of departments, facilities, roles, and training tracks that all have to hit ready at the same time.',
  },
  {
    icon: 'sort',
    title: 'Training matrix & exception queues',
    body: 'Completion tracking across cohorts with department and facility scorecards, plus a shared exception queue that turns scattered issues into one triage workflow.',
  },
  {
    icon: 'flag',
    title: 'Timeline & escalation reporting',
    body: 'A milestone and escalation timeline with stakeholder visibility, an import/validation pipeline, and go-live readiness reporting ready to export.',
  },
];

export const Landing = ({ onEnter, themeMode = 'light', onToggleTheme }) => {
  const isDark = themeMode === 'dark';
  return (
    <div className="landing">
      <header className="landing-top">
        <div className="landing-brand">
          <span className="brand-mark"><Icon name="logo" size={18} /></span>
          <div className="brand-text">
            <div className="brand-name">LMS Ops <em>Command Center</em></div>
            <div className="brand-sub mono">Epic go-live scenario</div>
          </div>
        </div>
        <div className="landing-top-actions">
          <Pill tone="muted" mono>Portfolio demo · mock data</Pill>
          {onToggleTheme && (
            <button
              className="iconbtn"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <Icon name={isDark ? 'check' : 'dot'} size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <Eyebrow n={1}>Operations cockpit · mock data</Eyebrow>
          <h1 className="display-lg landing-headline">
            The cockpit for complex <em>go-live readiness</em>.
          </h1>
          <p className="lead landing-lead">
            A configurable operations command center for multi-stakeholder
            implementation workflows. The live demo runs an EHR go-live —
            bringing departments, facilities, roles, training, and exceptions
            into one coordinated, role-scoped view for the people who have to
            land it together.
          </p>
          <div className="landing-cta-row">
            <Button kind="solid" iconRight="chev" onClick={onEnter}>Launch demo</Button>
            <span className="landing-cta-note mono">Cockpit, not the engine.</span>
          </div>
        </section>

        <section className="landing-features" aria-label="Product highlights">
          {FEATURES.map((f) => (
            <article key={f.title} className="card card-padded landing-feature">
              <span className="landing-feature-icon"><Icon name={f.icon} size={18} /></span>
              <h2 className="landing-feature-title">{f.title}</h2>
              <p className="landing-feature-body muted">{f.body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="landing-foot mono">
        <span>LMS Ops Command Center — operations readiness demo</span>
        <span>Sanitized · fixtures only</span>
      </footer>
    </div>
  );
};

export default Landing;
