export default function HomePage() {
  return (
    <section className="hero">
      <p className="eyebrow">Responsible AI Writing Support</p>
      <h1>Preserve your meaning. Sound more like yourself.</h1>
      <p>
        VoicePreserve helps you refine AI-assisted or rough drafts with style personalization, semantic fidelity checks,
        and transparent edit history you can review sentence by sentence.
      </p>
      <div className="hero-actions">
        <a className="btn btn-primary" href="/auth">
          Start a project
        </a>
        <a className="btn btn-secondary" href="/dashboard">
          View dashboard
        </a>
      </div>
      <div className="feature-grid">
        <article>
          <h2>Preserve your meaning</h2>
          <p>Sentence-level semantic checks flag potential drift in claims, entities, and numeric details.</p>
        </article>
        <article>
          <h2>Sound more like yourself</h2>
          <p>Create personal voice profiles from your writing samples and apply them during rewrites.</p>
        </article>
        <article>
          <h2>Track your editing process</h2>
          <p>Generate transparency reports with timestamps, edit counts, and heavily changed sections.</p>
        </article>
      </div>
    </section>
  );
}
