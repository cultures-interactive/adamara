import { configure, onReactionError } from "mobx";
import { errorStore } from "../stores/ErrorStore";

// Keep track of reported reaction errors to make sure that we only report each once, and not at the very high rate
// that they might occur. We have a limited Sentry budget, and it is not useful to show the error to the user more
// than once either. Thrown errors from reactions are *always* considered a bug.
const reportedReactionErrors = new Set<any>();

function getRepresentation(error: any) {
    const stack = (error as Error)?.stack;

    // If we have no stack, we'll just return "null" as our representation to make SURE it will only get reported once.
    // The worst that will happen is that we will lose other errors without stack, but those technically should not
    // happen anyway, so only to catch the first per session.
    if (!stack)
        return null;

    const stackLines = stack.split("\n");
    if (stackLines.length < 2)
        return stack;

    // In my experience, stacks usually look like this:
    //
    // Error: Oh no, a reaction error
    //     at Game.mapZoomRefresher (webpack-internal:///./src/client/canvas/game/Game.ts:421:11)
    //     at reactionRunner (webpack-internal:///./node_modules/mobx/dist/mobx.esm.js:2685:5)
    //     at trackDerivedFunction (webpack-internal:///./node_modules/mobx/dist/mobx.esm.js:1854:18)
    // ...
    //
    // The second line is the exact place where the error happened, so we just need that. Reaction errors usually
    // have several different stacks deeper down, and we don't need to report the exact same error multiple times.
    //
    // It is possible that some genuinely different stack trace paths are discarded this way, but those will likely
    // a) also be fixed by the same fix and if not
    // b) they will be reported later anyway once the first reported bug is fixed.
    return stackLines[1];
}

export function setupMobX() {
    configure({
        enforceActions: "always"
    });

    onReactionError(error => {
        const representation = getRepresentation(error);
        if (reportedReactionErrors.has(representation))
            return;

        reportedReactionErrors.add(representation);
        errorStore.addErrorFromErrorObject(error);
    });
}