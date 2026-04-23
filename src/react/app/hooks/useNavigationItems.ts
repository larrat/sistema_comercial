import { useMemo } from 'react';

import { useCurrentUserRole } from './useCurrentUserRole';
import { NAVIGATION_ITEMS, type NavigationItem } from '../navigation/config';

export type NavigationGroup = {
  label: NavigationItem['group'];
  items: NavigationItem[];
};

export function useNavigationItems() {
  const role = useCurrentUserRole();

  return useMemo(
    () =>
      NAVIGATION_ITEMS.filter((item) => !item.roles?.length || item.roles.includes(role)).reduce(
        (groups, item) => {
          const currentGroup = groups.find((group) => group.label === item.group);
          if (currentGroup) {
            currentGroup.items.push(item);
            return groups;
          }
          groups.push({ label: item.group, items: [item] });
          return groups;
        },
        [] as NavigationGroup[]
      ),
    [role]
  );
}
