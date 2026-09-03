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
    title: 'Two live operations, one engine',
    body: 'An Epic go-live and an annual compliance cycle run side by side: go-live readiness and a launch gate for one; a deadline countdown, per-assignee completion, and stuck-learner detection for the other.',
  },
  {
    icon: 'catalog',
    title: 'The campaign is the unit of configuration',
    body: 'Templates set terminology, scoring, gate criteria, and home layout; teams own the criteria — six on the go-live, one on the compliance cycle. Create a campaign and it arrives already shaped.',
  },
  {
    icon: 'flag',
    title: 'Governed by design',
    body: 'Deterministic, explainable readiness scoring; a messy-import → reconcile → resolve pipeline; approve-before-write-back; suggestion-only AI that cites its records; provisioning that queues, never silently creates.',
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
            <div className="brand-name">Ops <em>Command Center</em></div>
            <div className="brand-sub mono">Campaign-configurable operations</div>
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
              <Icon name={isDark ? 'sun' : 'moon'} size={16} />
            </button>
          )}
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <Eyebrow n={1}>Operations cockpit · mock data</Eyebrow>
          <h1 className="display-lg landing-headline">
            One engine. <em>Every campaign its own shape.</em>
          </h1>
          <p className="lead landing-lead">
            An LMS-shaped, campaign-configurable operations command center for
            multi-stakeholder implementations. The live demo runs two operations
            from the same engine — an Epic go-live and an annual compliance
            cycle — each with its own terminology, launch gate, owning teams,
            and home, all role-scoped for the people who have to land it together.
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
        <span>Ops Command Center — campaign operations demo</span>
        <span>Sanitized · fixtures only</span>
      </footer>
    </div>
  );
};

export default Landing;
