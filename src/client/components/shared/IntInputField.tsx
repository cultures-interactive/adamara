import React, { ChangeEvent, useEffect, useState } from 'react';
import styled, { CSSProperties } from 'styled-components';

interface Props {
    disabled?: boolean;
    style?: CSSProperties;
    onlyPositive?: boolean;
    value: number;
    onChange: (value: number) => void;
}

const NumberInputStyles = styled.input`
    width: 4em;  
`;

export const IntInputField: React.FunctionComponent<Props> = ({
    disabled,
    style,
    onlyPositive,
    value,
    onChange
}) => {
    const [override, setOverride] = useState<string>(null);

    useEffect(() => {
        if (value !== 0) {
            setOverride(null);
        }
    }, [value, onlyPositive]);

    const set = (e: ChangeEvent<HTMLInputElement>) => {
        let stringValue = e.target.value;

        if (stringValue.startsWith("-") && onlyPositive) {
            stringValue = "";
        }

        if ((stringValue === "") || (stringValue === "-")) {
            setOverride(stringValue);
        } else {
            setOverride(null);
        }

        let intValue = parseInt(stringValue) || 0;
        if (onlyPositive) {
            intValue = Math.max(0, intValue);
        }
        onChange(intValue);
    };

    const displayValue = (override !== null)
        ? override
        : Number.isInteger(value) ? value.toString() : "";

    const min = onlyPositive ? 0 : undefined;

    return (
        <NumberInputStyles disabled={disabled} style={style} type="number" min={min} value={displayValue} onChange={set} />
    );
};