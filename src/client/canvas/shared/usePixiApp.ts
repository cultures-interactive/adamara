import { useRef, useEffect } from "react";
import { PixiApp } from "./PixiApp";

/**
 * @deprecated While the recreate() hack worked here (see the HACK comment below), this is inferiour to actually
 * always properly calling disposeApp() on unmount. As long as that isn't fixed, usePixiApp() shouldn't be used.
 * See GameContainer.tsx for how to do it with a class-based component instead.
 */
export function usePixiApp<T extends PixiApp>(recreateApp: () => void, getApp: () => T, disposeApp: () => void) {
    const appDivRef = useRef();

    useEffect(() => {
        // On component mount: Create app (and dispose any old versions; see "HACK tw" down below)
        recreateApp();
    }, []);

    useEffect(() => {
        // Whenever the gameDivRef changes, reattach game to new gameDivRef
        const game = getApp();
        game.attach(appDivRef.current);
        return () => game.detach();
    }, [appDivRef]);

    useEffect(() => {
        // On component dismount: Dispose app
        // HACK tw: Unfortunately, if this component is mounted while the PixiApp referenced here is hot reloaded,
        // disposeGame() won't properly work because it still points to the old module. This means that that the PixiApp
        // will stay around even after component dismount. My current workaround is to dispose any old PixiApp component
        // mount before creating a new app. That way, at least the PixiApp is always fresh on mount, even if there is an
        // old version idling around in the background. Luckily all of this only applies to hot reloading during development.
        return () => disposeApp();
    }, []);

    return appDivRef;
}