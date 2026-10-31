export function AuthLoading() {
  return (
    <main className="access-page" aria-busy="true" aria-label="Preparando la pantalla de acceso">
      <div className="access-shell">
        <div className="access-hero" aria-hidden="true">
          <div className="access-hero-inner">
            <div className="auth-skeleton auth-skeleton-brand auth-skeleton-on-brand" />
            <div className="auth-skeleton auth-skeleton-title auth-skeleton-on-brand" />
            <div className="auth-skeleton auth-skeleton-description auth-skeleton-on-brand" />
          </div>
          <div className="access-wave access-wave-bottom access-wave-placeholder" />
        </div>
        <section className="access-sheet">
          <div className="auth-skeleton auth-skeleton-title access-sheet-header-skel" />
          <div className="auth-skeleton auth-skeleton-description" />
          <div className="auth-skeleton auth-skeleton-field" />
          <div className="auth-skeleton auth-skeleton-field" />
          <div className="auth-skeleton auth-skeleton-button" />
        </section>
      </div>
    </main>
  );
}
