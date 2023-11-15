import { observer } from "mobx-react-lite";
import React from "react";
import { useTranslation } from "react-i18next";
import { MapElementReferenceModel } from "../../../../shared/action/MapElementReferenceModel";
import { InteractionTriggerIconType } from "../../../../shared/game/InteractionTriggerIconType";
import { InteractionTriggerSelectionDetail } from "./components/InteractionElementSelectionDetail";
import { Dropdown } from "../../editor/Dropdown";
import { ElementGroup, ElementLabel } from "./components/BaseElements";

interface InteractionTriggerActionDetailsProps {
    interactionTrigger: MapElementReferenceModel;
    setInteractionTrigger: (interactionTrigger: MapElementReferenceModel) => void;
    iconType: InteractionTriggerIconType;
    setIconType: (iconType: string) => void;
}

export const InteractionTriggerActionDetails: React.FunctionComponent<InteractionTriggerActionDetailsProps> = observer(({ interactionTrigger, setInteractionTrigger, iconType, setIconType }) => {
    const { t } = useTranslation();

    return (
        <div>
            <div>
                <InteractionTriggerSelectionDetail name={null}
                    selectedInteractionTrigger={interactionTrigger}
                    interactionTriggerSetter={setInteractionTrigger} />
            </div>
            <ElementGroup>
                <ElementLabel>{t("action_editor.interaction_type")}</ElementLabel>
                <Dropdown value={iconType} onChange={({ target }) => setIconType(target.value)}>
                    {Object.values(InteractionTriggerIconType).map(type => <option key={type} value={type}>{t("action_editor.interaction_type_" + type)}</option>)}
                </Dropdown>
            </ElementGroup>
        </div>
    );
});