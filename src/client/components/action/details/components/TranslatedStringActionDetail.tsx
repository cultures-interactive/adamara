import { observer } from "mobx-react-lite";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { Gender, gendersWithoutNeutral } from "../../../../../shared/definitions/other/Gender";
import { TranslatedString } from "../../../../../shared/game/TranslatedString";
import { gameStore } from "../../../../stores/GameStore";
import { AutoResizeTextareaFullWidth } from "../../../shared/AutoResizeTextarea";
import { ElementGroup, ElementLabel } from "./BaseElements";

const SimpleInputContainer = styled.div`
    /*margin-top: 4px;*/
`;

/*
const IndentedInputContainer = styled(SimpleInputContainer)`
    margin-top: 4px;
    border-left: 2px solid grey;
    margin-left: 0.5em;
    padding-left: 0.5em;
`;
*/

const CommentArea = styled.div`
    textarea {
        border-style: dotted;
    }
    opacity: 50%;
`;

interface CheckboxedAreaProps {
    label: string;
    hasContent: boolean;
}

export const CheckboxedArea: React.FunctionComponent<CheckboxedAreaProps> = observer(({ label, hasContent, children }) => {
    const { t } = useTranslation();

    const [show, setShow] = useState(hasContent);

    useEffect(() => {
        if (hasContent && !show) {
            setShow(true);
        }
    }, [hasContent]);

    return (
        <>
            <div>
                <label>
                    {<span><input type="checkbox" disabled={hasContent} checked={show} onChange={() => setShow(!show)} /> </span>}
                    {label}
                </label>
            </div>
            {show && children}
        </>
    );
});

interface GenderedTranslationProps {
    gender: Gender;
    translatedString: TranslatedString;
}

export const GenderedTranslation: React.FunctionComponent<GenderedTranslationProps> = observer(({ gender, translatedString }) => {
    const { t } = useTranslation();
    const { languageKey } = gameStore;

    const value = translatedString.getForGender(languageKey, gender, false);

    return (
        <CheckboxedArea
            label={t("editor.translation" + gender)}
            hasContent={!!value}
        >
            <AutoResizeTextareaFullWidth
                value={value}
                onChange={({ target }) => translatedString.setForGender(languageKey, gender, target.value)}
            />
        </CheckboxedArea>
    );
});

export enum DisplayMode {
    Simple,
    //CommentOnly,
    CommentAndGenders
}

interface TranslatedStringActionDetailProps {
    name: string;
    translatedString: TranslatedString;
    displayMode: DisplayMode;
    allowBlankValue: boolean;
}

export const TranslatedStringActionDetail: React.FunctionComponent<TranslatedStringActionDetailProps> = observer(({ name, translatedString, displayMode, allowBlankValue }) => {
    const { t } = useTranslation();
    const { languageKey } = gameStore;

    const showComment = displayMode !== DisplayMode.Simple;
    const showGenderedVersions = displayMode === DisplayMode.CommentAndGenders;

    //const InputContainer = (displayMode === DisplayMode.Simple) ? SimpleInputContainer : IndentedInputContainer;
    const InputContainer = SimpleInputContainer;

    return (
        <ElementGroup>
            {name && <ElementLabel>{name}</ElementLabel>}
            <InputContainer>
                <AutoResizeTextareaFullWidth
                    className={translatedString.get(languageKey, false).length == 0 && !allowBlankValue ? "invalid" : ""}
                    value={translatedString.get(languageKey, false)}
                    placeholder={translatedString.get(languageKey, true)}
                    onChange={({ target }) => translatedString.set(languageKey, target.value)}
                />
                {showGenderedVersions && gendersWithoutNeutral.map(gender =>
                    <GenderedTranslation key={gender} gender={gender} translatedString={translatedString} />
                )}
                {showComment && (
                    <CommentArea>
                        <CheckboxedArea
                            label={t("editor.translation_comment")}
                            hasContent={!!translatedString.comment}
                        >
                            <AutoResizeTextareaFullWidth
                                value={translatedString.comment}
                                onChange={({ target }) => translatedString.setComment(target.value)}
                            />
                        </CheckboxedArea>
                    </CommentArea>
                )}
            </InputContainer>
        </ElementGroup>
    );
});

