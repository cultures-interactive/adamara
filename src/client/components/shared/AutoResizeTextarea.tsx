import React, { useEffect, useRef } from "react";
import styled from "styled-components";
import { UiConstants } from "../../data/UiConstants";

const StyledTextarea = styled.textarea`
    overflow: hidden;
    resize: none;
`;

type Props = React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;

export const AutoResizeTextarea: React.FunctionComponent<Props> = (props) => {
    const ref = useRef<HTMLTextAreaElement>();

    const refresh = () => {
        const element = ref.current;
        if (!element)
            return;

        // Ignore scrollHeight of 0. This seems to only happen when it's invisible (e.g. because
        // a SlideMenu was closed) and in that case we don't care about changing the height.
        if (element.scrollHeight === 0)
            return;

        // If we are still at the same scrollHeight than we were after the last adjustment, ignore.
        if ((element as any).scrollHeightAfterAdjusting === element.scrollHeight)
            return;

        // Method taken from: https://stackoverflow.com/questions/454202/creating-a-textarea-with-auto-resize
        // "OPTION 2 (Pure JavaScript)"

        // Set to auto first to get the right scrollHeight. If you remove this line, the text
        // field will slowly shrink every call if it's a one-liner.
        element.style.height = "auto";

        element.style.height = element.scrollHeight + "px";

        (element as any).scrollHeightAfterAdjusting = element.scrollHeight;
    };

    useEffect(() => {
        refresh();
    }, [ref.current, props.value, props.placeholder]);

    // React to resize. This is necessary if the element can be hidden, e.g. in a SlideMenu.
    useEffect(() => {
        const element = ref.current;
        if (!element)
            return undefined;

        const resizeObserver = new ResizeObserver(refresh);
        resizeObserver.observe(element);
        return () => resizeObserver.unobserve(element);
    }, [ref.current]);

    return (
        <StyledTextarea
            ref={ref as any}
            {...props}
        />
    );
};

export const AutoResizeTextareaFullWidth = styled(AutoResizeTextarea)`
    width: 100%;
    
    &.invalid {
        outline: 2px solid ${UiConstants.COLOR_VALUE_INVALID};
        border-radius: 2px;
        border-color: rgba(0, 0, 0, 0);
    }
`;