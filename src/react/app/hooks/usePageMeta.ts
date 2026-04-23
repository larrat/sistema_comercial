import { useMemo } from 'react';

import { useCurrentUserRole } from './useCurrentUserRole';
import { PAGE_META } from '../navigation/pageMeta';
import type { AppRouteId } from '../router/routes';

export function usePageMeta(routeId: AppRouteId) {
  const role = useCurrentUserRole();

  return useMemo(() => {
    const meta = PAGE_META[routeId] || PAGE_META.app;
    return {
      ...meta,
      actions: (meta.actions || []).filter((action) => !action.roles?.length || action.roles.includes(role))
    };
  }, [role, routeId]);
}
