import React, { ChangeEvent } from "react";
import styled from "styled-components";

interface Props {
    disabled?: boolean;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    width?: string;
}

interface SliderInputStyleProps {
    width: string;
}

const SliderInputStyles = styled.input<SliderInputStyleProps>`
    width: ${props => props.width ? props.width : 'unset'}
`;

export const IntInputSlider: React.FunctionComponent<Props> = ({ disabled, value, onChange, min, max, width }) => {

    const set = (e: ChangeEvent<HTMLInputElement>) => {
        const intValue = parseInt(e.target.value) || 0;

        onChange(intValue);
    };

    return (
        <SliderInputStyles disabled={disabled} type="range" min={min} max={max} value={value} onChange={set} width={width} />
    );
};