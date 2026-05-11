import { Outlet } from 'react-router-dom';

/**
 * Mobile-first shell with responsive max width (Story 4.7 — room for optional `lg` master–detail).
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-page">
      <div className="mx-auto flex min-w-0 w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6 md:py-8 lg:max-w-6xl lg:px-8">
        <Outlet />
      </div>
    </div>
  );
}
