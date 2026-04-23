import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { emitToast } from '../../../app/legacy/events';
import { getWave1RouteByLegacyPage } from '../../../app/router/wave1Navigation';
import { DashboardPilotPage } from '../components/DashboardPilotPage';
import { useDashboardData } from '../hooks/useDashboardData';

export function DashboardRoutePage() {
  useDashboardData();
  const navigate = useNavigate();

  const handleNavigatePage = useCallback(
    (page: string) => {
      const route = getWave1RouteByLegacyPage(page);
      if (route) {
        navigate(route);
        return;
      }

      emitToast(
        `A navegação para "${page}" ainda depende do shell legado e não foi conectada nesta onda.`,
        'warning'
      );
    },
    [navigate]
  );

  return <DashboardPilotPage onNavigatePage={handleNavigatePage} />;
}
