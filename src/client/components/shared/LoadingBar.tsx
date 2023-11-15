import React from 'react';
import styled from 'styled-components';
import { faCheckCircle, faCog } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

interface LoadingLineBoxProps {
    fontScale: number;
}

const LoadingLineBox = styled.span<LoadingLineBoxProps>`
    border-radius: 4px;
    background-color: white;
    border: 1px solid darkgray;
    padding: 0.2em 3em;
    position: relative;
    white-space: nowrap;
    font-size: ${props => props.fontScale ? ((props.fontScale * 100) + "%") : undefined};

    span {
        position: relative;
    }
`;

const LoadingBarBackground = styled.div`
    left: 0;
    top: 0;
    bottom: 0;
    position: absolute;
    background-color: orange;
`;

interface Props {
    label: string;
    percentage100: number;
    fontScale?: number;
    className?: string;
}

export const LoadingBar: React.FunctionComponent<Props> = ({ percentage100, fontScale, label, className }) => {
    return (
        <LoadingLineBox fontScale={fontScale} className={className}>
            <LoadingBarBackground style={{ width: percentage100 + "%" }} />
            <span>
                {(percentage100 < 100)
                    ? <FontAwesomeIcon icon={faCog} spin={true} />
                    : <FontAwesomeIcon icon={faCheckCircle} />}
                &nbsp;{label}: {percentage100}%
            </span>
        </LoadingLineBox>
    );
};

export const LoadingBarBlock = styled(LoadingBar)`
    display: block;
    text-align: center;
`;