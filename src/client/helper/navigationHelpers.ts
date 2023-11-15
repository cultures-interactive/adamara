import { History, Location } from 'history';
import { sharedStore } from '../stores/SharedStore';

/**
 * Navigates to a route while preserving the search query.
 */
export function navigateTo(history: History, route: string) {
    sharedStore.setPreviousHistoryLocationPathname(history.location.pathname);
    history.replace(getFullRoute(route, history.location));
}

export function getFullRoute(route: string, location: Location) {
    if (location.search) {
        const query = new URLSearchParams(location.search);
        query.delete("map");
        const newSearchString = query.toString();
        if (newSearchString.length > 0) {
            return route + "?" + newSearchString;
        }
    }

    return route;
}