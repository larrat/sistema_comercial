import { Outlet } from 'react-router-dom';

import { GlobalLoadingOverlay } from '../ui/GlobalLoadingOverlay';
import { GlobalToastHost } from '../ui/GlobalToastHost';
import { AppSidebar } from './AppSidebar';
import { AppTopbar } from './AppTopbar';

export function AppShell() {
  return (
    <div className="rf-shell">
      <AppSidebar />
      <div className="rf-shell__main">
        <AppTopbar />
        <div className="rf-shell__viewport">
          <Outlet />
        </div>
      </div>
      <GlobalLoadingOverlay />
      <GlobalToastHost />
    </div>
  );
}
