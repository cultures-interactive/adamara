import React, { useEffect, useState } from 'react';
import styled from "styled-components";

const OuterContainer = styled.div`
    overflow: hidden;
`;

interface SizeProps {
    width: number;
    height: number;
}

const InnerContainer = styled.div<SizeProps>`
    display: block;
    position: relative;
    width: ${props => props.width}px;
    height: ${props => props.height}px;
    transform-origin: top left;
    overflow: hidden;
`;

interface Props {
    width: number;
    height: number;
    staticBorderX: number;
    staticBorderY: number;
    percentageBorderX: number;
    percentageBorderY: number;
}

/**
 * Container that makes sure that its contents are completely visible. Keeps the width x height aspect ratio.
 */
export const PopupAutoScaleContainer: React.FunctionComponent<Props> = ({
    width, height, staticBorderX, staticBorderY, percentageBorderX, percentageBorderY, children
}) => {
    const [containerElement, setContainerElement] = useState<HTMLDivElement>(null);
    const [outerContainerElement, setOuterContainerElement] = useState<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerElement || !outerContainerElement)
            return undefined;

        const onResize = () => {
            const browserWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
            const browserHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

            const availableWidth = (browserWidth - staticBorderX) * (1 - percentageBorderX);
            const availableHeight = (browserHeight - staticBorderY) * (1 - percentageBorderY);

            const scale = Math.min(
                availableWidth / width,
                availableHeight / height
            );

            containerElement.setAttribute("style", "transform: scale(" + scale + ")");
            outerContainerElement.setAttribute("style", `width: ${width * scale}px; height: ${height * scale}px;`);
        };

        onResize();
        window.addEventListener("resize", onResize);

        return () => window.removeEventListener("resize", onResize);
    }, [containerElement, outerContainerElement, width, height, staticBorderX, staticBorderY, percentageBorderX, percentageBorderY]);

    return (
        <OuterContainer ref={setOuterContainerElement}>
            <InnerContainer
                width={width}
                height={height}
                ref={setContainerElement}
            >
                {children}
            </InnerContainer>
        </OuterContainer>
    );
};