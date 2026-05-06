import { Outlet } from 'react-router-dom';

/**
 * Single-column mobile-first shell. Multi-column / master–detail at `lg+` is Story 4.7.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-page">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 md:py-8 lg:max-w-4xl">
        <Outlet />
      </div>
    </div>
  );
}
