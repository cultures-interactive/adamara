// Source: https://stackoverflow.com/questions/11866781/how-do-i-convert-an-integer-to-a-javascript-color/11866980
import { useThrottle } from "@react-hook/throttle";
import { DependencyList, EffectCallback, useEffect, useRef, useState } from "react";

export function numberToCSSColor(numberColor: number, hasAlpha: boolean = false) {
    numberColor >>>= 0;
    const b = numberColor & 0xFF,
        g = (numberColor & 0xFF00) >>> 8,
        r = (numberColor & 0xFF0000) >>> 16,
        a = hasAlpha ? (((numberColor & 0xFF000000) >>> 24) / 255) : 1;
    return "rgba(" + [r, g, b, a].join(",") + ")";
}

export function actionEdgeId(from: string, exitIndex: number, to: string) {
    return from + exitIndex + "--->" + to;
}

/**
 * An empty function to suppress a react warning.
 * Usage: onChange={emptyFunctionToSuppressReactWarning}
 * You could also use an empty function directly, but using this has the added
 * benefit of it being self-documenting.
 * See https://github.com/facebook/react/issues/1118#issuecomment-769803903 for
 * more information.
 */
export function emptyFunctionToSuppressReactWarning() {
}

export function usePrevious<T>(value: T) {
    // The ref object is a generic container whose current property is mutable ...
    // ... and can hold any value, similar to an instance property on a class
    const ref = useRef<T>();
    // Store current value in ref
    useEffect(() => {
        ref.current = value;
    }, [value]); // Only re-run if value changes
    // Return previous value (happens before update in useEffect above)
    return ref.current ? ref.current : 0;
}

/**
 * Force a react component to update by calling the returned function, but at maximum [fps] times per second.
 * See https://github.com/jaredLunde/react-hook/tree/master/packages/throttle for details.
 * 
 * Forced updates are bad, and this is almost always unnecessary, and almost always a hack.
 * Please consult with your team before using this, and if its use is not *completely* clear, write an explanation
 * on the call site why you had to use it.
 */
export function useForceUpdate() {
    const [_, setValue] = useState(0);
    return () => setValue(value => value + 1);
}

/**
 * Force a react component to update by calling the returned function, but at maximum [fps] times per second.
 * See https://github.com/jaredLunde/react-hook/tree/master/packages/throttle for details.
 * 
 * If you don't want throttling, use useForceUpdate() instead.
 * 
 * Forced updates are bad, and this is almost always unnecessary, and almost always a hack.
 * Please consult with your team before using this, and if its use is not *completely* clear, write an explanation
 * on the call site why you had to use it.
 */
export function useThrottledForceUpdate(fps: number, leading?: boolean) {
    const [value, setValue] = useThrottle(0, fps, leading);
    return () => setValue(value => value + 1);
}

/**
 * Like useEffect, but doesn't execute effect immediately - only when the dependencies change
 */
export function useEffectOnlyWhenDependenciesChange(effect: EffectCallback, deps: DependencyList) {
    const shouldSkip = useRef(true);

    useEffect(() => {
        if (shouldSkip.current) {
            shouldSkip.current = false;
            return undefined;
        }

        return effect();
    }, deps);
}