import React, { useEffect, useState } from 'react';
import styled from "styled-components";

const OuterContainer = styled.div`
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
`;

interface Props {
    width: number;
    height: number;
    className?: string;
}

const CanvasContainer = styled.div<Props>`
    display: block;
    position: relative;
    width: ${props => props.width}px;
    height: ${props => props.height}px;
    transform-origin: top left;
    overflow: hidden;
`;

/**
 * Container that makes sure that its contents are completely visible. Keeps the width x height aspect ratio.
 */
export const AutoScaleContainer: React.FunctionComponent<Props> = ({ width, height, className, children }) => {
    const [containerElement, setContainerElement] = useState<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerElement)
            return undefined;

        const onResize = () => {
            /*
            const browserWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const browserHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
            */

            const { parentElement } = containerElement;
            const availableWidth = parentElement.clientWidth;
            const availableHeight = parentElement.clientHeight;

            const scale = Math.min(
                availableWidth / width,
                availableHeight / height
            );

            /*
            // Don't scale up
            if (scale > 1)
                scale = 1;
            */

            containerElement.setAttribute("style", "transform: scale(" + scale + ")");
        };

        onResize();
        window.addEventListener("resize", onResize);

        return () => window.removeEventListener("resize", onResize);
    }, [containerElement, width, height]);

    return (
        <OuterContainer className={className}>
            <CanvasContainer
                width={width}
                height={height}
                ref={setContainerElement}
            >
                {children}
            </CanvasContainer>
        </OuterContainer>
    );
};