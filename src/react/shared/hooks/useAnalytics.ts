import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuthStore } from '../../app/useAuthStore';
import { useFilialStore } from '../../app/useFilialStore';
import {
  trackEvent,
  type AnalyticsEventInput,
  type AnalyticsMetadata,
  type AnalyticsResult
} from '../lib/analytics';

type UseAnalyticsOptions = {
  module: string;
};

type TrackModuleEventOptions = {
  metadata?: Record<string, AnalyticsMetadata>;
  result?: AnalyticsResult | string | null;
  route?: string;
};

export function useAnalytics({ module }: UseAnalyticsOptions) {
  const location = useLocation();
  const session = useAuthStore((state) => state.session);
  const filialId = useFilialStore((state) => state.filialId);
  const userId =
    session?.user && typeof session.user === 'object' && 'id' in session.user
      ? String(session.user.id ?? '')
      : '';

  const trackModuleEvent = useCallback(
    (eventName: string, options: TrackModuleEventOptions = {}) => {
      const payload: AnalyticsEventInput = {
        event_name: eventName,
        module,
        user_id: userId || null,
        tenant_id: filialId ?? null,
        route: options.route ?? location.pathname,
        metadata: options.metadata,
        result: options.result ?? null
      };
      trackEvent(payload);
    },
    [filialId, location.pathname, module, userId]
  );

  return { trackEvent: trackModuleEvent };
}
