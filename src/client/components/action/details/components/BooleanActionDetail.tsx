import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { ElementGroup, ElementLabel } from './BaseElements';

interface BooleanActionDetailProps {
    name: string;
    checked: boolean;
    toggle: () => void;
}

export const BooleanActionDetail: React.FunctionComponent<BooleanActionDetailProps> = observer(({ name, checked, toggle }) => {
    const { t } = useTranslation();
    return (
        <ElementGroup>
            <ElementLabel>
                <input type="checkbox" checked={checked} onChange={toggle} />&nbsp;
                {name}
            </ElementLabel>
        </ElementGroup>
    );

});