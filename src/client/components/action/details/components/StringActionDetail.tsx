import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { Input } from "../../../editor/Input";
import { isBlank } from "../../../../../shared/helper/generalHelpers";
import { ElementGroup, ElementLabel } from './BaseElements';

interface StringActionDetailProps {
    name: string;
    value: string;
    valueSetter: (value: string) => void;
    disabled?: boolean;
    allowBlankValue: boolean;
}

export const StringActionDetail: React.FunctionComponent<StringActionDetailProps> = observer(({ name, value, valueSetter, disabled, allowBlankValue }) => {
    const { t } = useTranslation();
    return (
        <ElementGroup>
            <ElementLabel>{name}</ElementLabel>
            <Input
                className={!allowBlankValue && isBlank(value) ? "invalid" : ""}
                type="text"
                disabled={disabled}
                value={value}
                onChange={({ target }) => valueSetter(target.value)} />
        </ElementGroup>
    );

});