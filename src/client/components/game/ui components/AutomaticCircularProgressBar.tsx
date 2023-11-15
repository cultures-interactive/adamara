import React, { useState } from "react";
import styled from "styled-components";

interface Props {
    durationS: number;
    radius: number;
    strokeWidth: number;
    strokeColor: string;

    /**
     * NOTE(Tobias): Each radius needs a different strokeDashOffsetStart to always start with a full
     * circle. E.g. a radius of 10 will need a strokeDashOffsetStart of 300. A bigger radius will need
     * a lower value. I don't have time to figure out the relation right now, and since I only need it
     * exactly once at the moment (for the 10 radius mentioned above) I will leave it like this for now.
     */
    strokeDashOffsetStart: number;

    className?: string;
}

const Container = styled.div<Props>`
    svg {
        width: ${props => props.radius * 2 + props.strokeWidth}px;
        height: ${props => props.radius * 2 + props.strokeWidth}px;
    }

    /*
    .bg {
        fill: none;
        stroke-width: 10px;
        stroke: #1A2C34;
    }
    */

    .meter {
        fill: none;
        stroke-width: ${props => props.strokeWidth}px;
        stroke-linecap: round;
        transform: rotate(-90deg);
        transform-origin: 50% 50%;    
        stroke-dasharray: 360;
        stroke-dashoffset: 360;
        stroke: ${props => props.strokeColor};
        animation: progress ${props => props.durationS}s linear;
    }

    @keyframes progress {
        from {
            stroke-dashoffset: ${props => props.strokeDashOffsetStart};
        }
        to {
            stroke-dashoffset: 360;
        }
    }
`;

export const AutomaticCircularProgressBar: React.FunctionComponent<Props> = ({ durationS, radius, strokeDashOffsetStart, strokeWidth, strokeColor, className }) => {

    const [startTimestamp] = useState(Date.now() / 1000);
    const [remainingAnimationDuration, setRemainingAnimationDuration] = useState(calcDuration());

    function calcDuration(): number {
        return Math.max(0, durationS - ((Date.now() / 1000) - startTimestamp));
    }

    const center = radius + strokeWidth / 2;

    return (
        <Container
            className={className}
            durationS={remainingAnimationDuration}
            radius={radius}
            strokeDashOffsetStart={strokeDashOffsetStart}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
        >
            <svg>
                {/*<circle className="bg" cx={center} cy={center} r={radius} />*/}
                <circle className="meter" cx={center} cy={center} r={radius}
                    onAnimationStart={() => setRemainingAnimationDuration(calcDuration())}
                />
            </svg>
        </Container>
    );
};