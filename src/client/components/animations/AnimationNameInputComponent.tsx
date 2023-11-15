import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { dataConstants } from "../../../shared/data/dataConstants";
import { useTranslation } from "react-i18next";
import { InvalidCriteriaMessage } from "../shared/InvalidCriteriaMessage";
import { Input } from "../shared/Input";
import { sharedStore } from "../../stores/SharedStore";

interface Props {
    setAnimationName: (name: string) => void;
    animationName: string;
    onNameValidityChange: (isValid: boolean) => void;
    forExistingAnimationId?: number;
}

export const AnimationNameInputComponent: React.FunctionComponent<Props> = observer((props) => {
    const { t } = useTranslation();

    const [nameElementClass, setNameElementClass] = useState("invalid");
    const [invalidNameMessage, setInvalidNameMessageKey] = useState("");

    function onAnimationNameChange(name: string) {
        props.setAnimationName(name);
        setNameElementClass(null);
        setInvalidNameMessageKey("");
        validateNameCriteria(name);
    }

    function applyInvalidMessage(messageKey: string) {
        setInvalidNameMessageKey(messageKey);
        setNameElementClass("invalid");
        props.onNameValidityChange(false);
    }

    function validateNameCriteria(name: string) {
        if (!name || name.length < dataConstants.animationAssetNameLengthMin) {
            applyInvalidMessage("editor.invalid_name_criteria_name_empty");
            return;
        }

        const alreadyExistingAnimation = sharedStore.getAnimationByName(name);
        if (alreadyExistingAnimation && !(alreadyExistingAnimation.id == props.forExistingAnimationId)) {
            applyInvalidMessage("editor.invalid_name_criteria_name_in_use");
            return;
        }
        if (!dataConstants.animationAssetValidNameRegExp.test(name)) {
            applyInvalidMessage("editor.invalid_name_criteria_name_invalid_char");
            return;
        }
        setInvalidNameMessageKey("");
        setNameElementClass("");
        props.onNameValidityChange(true);
    }

    useEffect(() => {
        validateNameCriteria(props.animationName);
    }, [props.animationName]);

    return (
        <>
            <Input
                type="text"
                className={nameElementClass}
                value={props.animationName}
                maxLength={dataConstants.animationAssetNameLengthMax}
                onChange={(e) => { onAnimationNameChange(e.target.value); }} />

            <InvalidCriteriaMessage>
                {invalidNameMessage ? t(invalidNameMessage) : ""}
            </InvalidCriteriaMessage>
        </>
    );
});
