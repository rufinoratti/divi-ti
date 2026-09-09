export function AuthLoading() {
  return (
    <main className="auth-page min-h-[100dvh] text-[#1f1f1f]" aria-busy="true" aria-label="Preparando la pantalla de acceso">
      <div className="auth-loading-layout mx-auto min-h-[100dvh] max-w-[1120px] px-5 py-5 sm:px-8 sm:py-8">
        <header className="auth-loading-topbar">
          <div className="auth-skeleton auth-skeleton-brand" />
        </header>
        <div className="auth-loading-main">
          <div className="auth-loading-context">
            <div className="auth-skeleton auth-skeleton-context-title" />
            <div className="auth-skeleton auth-skeleton-context-copy" />
          </div>
          <section className="auth-loading-screen">
            <div className="auth-skeleton auth-skeleton-title" />
            <div className="auth-skeleton auth-skeleton-description" />
            <div className="auth-skeleton auth-skeleton-field" />
            <div className="auth-skeleton auth-skeleton-field" />
            <div className="auth-skeleton auth-skeleton-button" />
          </section>
        </div>
      </div>
    </main>
  );
}
