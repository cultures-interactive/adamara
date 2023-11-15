import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { PlayAnimationActionModel } from "../../../../shared/action/ActionModel";
import { AnimationElementSelectionDetail } from './components/AnimationElementSelectionDetail';

interface PlayAnimationDetailsProps {
    action: PlayAnimationActionModel;
}

export const PlayAnimationActionDetails: React.FunctionComponent<PlayAnimationDetailsProps> = observer(({ action }) => {
    const { t } = useTranslation();

    return (
        <div>
            <AnimationElementSelectionDetail name={t("action_editor.property_animation_element")}
                selectedAnimationElement={action.animationElement}
                animationElementSetter={action.setAnimationElement.bind(action)} />
        </div>
    );
});