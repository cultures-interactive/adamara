import React, { useState } from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { Input } from "../../../editor/Input";
import { MathE } from "../../../../../shared/helper/MathExtension";
import { ACTION_TREE_PARAMETER_ESCAPE_CHAR, ACTION_TREE_VARIABLE_ESCAPE_CHAR, isValidActionNumberValue } from "../../../../../shared/helper/actionTreeHelper";
import { ElementGroup, ElementLabel } from './BaseElements';


interface NumberActionDetailProps {
    name: string;
    value: string;
    valueSetter: (value: string) => void;
    disabled?: boolean;
    allowBlankValue?: boolean;
    validateNumber?: (value: number) => void;
}

export const NumberActionDetail: React.FunctionComponent<NumberActionDetailProps> = observer(({ name, value, valueSetter, disabled, allowBlankValue, validateNumber }) => {
    const { t } = useTranslation();

    function setValue(value: string) {
        if (MathE.containsNumber(value)
            || value.startsWith("-")
            || value.startsWith(ACTION_TREE_PARAMETER_ESCAPE_CHAR)
            || value.startsWith(ACTION_TREE_VARIABLE_ESCAPE_CHAR)) {
            valueSetter(value);
        }
    }

    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <Input
                type="text"
                disabled={disabled}
                value={value}
                className={(allowBlankValue && (value === "")) || (isValidActionNumberValue(value) && (!validateNumber || validateNumber(+value))) ? "" : "invalid"}
                onChange={event => setValue(event.target.value)} />
        </ElementGroup>
    );

});