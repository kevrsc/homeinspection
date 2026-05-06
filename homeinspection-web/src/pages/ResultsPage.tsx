import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

export function ResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const json = (location.state as { json?: unknown } | null)?.json;

  useEffect(() => {
    if (json === undefined) {
      navigate('/', { replace: true });
    }
  }, [json, navigate]);

  if (json === undefined) {
    return null;
  }

  return (
    <main className="space-y-6">
      <p>
        <Link
          to="/"
          className="text-base font-medium text-link underline-offset-2 hover:underline"
        >
          ← Upload another
        </Link>
      </p>
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-fg">
          Raw API response
        </h1>
        <p className="text-sm leading-relaxed text-fg-muted">
          Story 4.5 replaces this with observation UI.
        </p>
      </header>
      <pre>{JSON.stringify(json, null, 2)}</pre>
    </main>
  );
}
