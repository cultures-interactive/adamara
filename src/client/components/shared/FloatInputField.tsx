import React, { ChangeEvent, CSSProperties, MouseEventHandler, useEffect, useState } from 'react';
import styled from 'styled-components';

interface Props {
    disabled?: boolean;
    style?: CSSProperties;
    onlyPositive?: boolean;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    onMouseEnter?: MouseEventHandler<HTMLInputElement>;
    onMouseLeave?: MouseEventHandler<HTMLInputElement>;
}

const NumberInputStyles = styled.input`
    width: 4em;
`;

export const FloatInputField: React.FunctionComponent<Props> = ({
    disabled,
    style,
    onlyPositive,
    value,
    min,
    max,
    step,
    onChange,
    onMouseEnter,
    onMouseLeave
}) => {
    const [override, setOverride] = useState<string>(null);
    const [valueSuffix, setValueSuffix] = useState("");

    useEffect(() => {
        if (value !== 0) {
            setOverride(null);
        }
        setValueSuffix("");
    }, [value]);

    const set = (e: ChangeEvent<HTMLInputElement>) => {
        let stringValue = e.target.value;
        if (stringValue.startsWith("-") && onlyPositive) {
            stringValue = "";
        }

        if (stringValue.endsWith(".")) {
            setValueSuffix(".");
        } else {
            setValueSuffix("");
        }

        if ((stringValue === "") || (stringValue === "-")) {
            setOverride(stringValue);
        } else {
            setOverride(null);
        }

        let floatValue = parseFloat(stringValue) || 0;
        if (onlyPositive) {
            floatValue = Math.max(0, floatValue);
        }
        onChange(floatValue);
    };

    const displayValue = (override !== null)
        ? override + valueSuffix
        : ((typeof value === "number") ? value.toString() : "") + valueSuffix;

    if (onlyPositive && !min) {
        min = 0;
    }

    return (
        <NumberInputStyles
            disabled={disabled}
            style={style}
            type="number"
            value={displayValue}
            step={step || 0.1}
            min={min}
            max={max}
            onChange={set}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        />
    );
};