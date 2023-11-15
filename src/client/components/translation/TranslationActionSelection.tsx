import React from 'react';
import styled from 'styled-components';
import { TranslationAction, translationActions, TranslationStringData } from '../../helper/translationHelpers';
import { Gender } from '../../../shared/definitions/other/Gender';
import { BiCheck, BiX } from 'react-icons/bi';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';

const Element = styled.span`
    input[type="radio"] {
        opacity: 0;
        position: fixed;
        width: 0;
    }

    &.discard {
        label {
            border-color: red;
            color: red;
        }

        input[type="radio"]:checked + label {
            color: white;
            background-color: red;
        }
    }

    &.notset {
        label {
            border-color: #AAA;
        }

        input[type="radio"]:checked + label {
            background-color: lightgrey;
        }
    }

    &.commit {
        label {
            border-color: #4c4;
            color: #4c4;
        }

        input[type="radio"]:checked + label {
            color: white;
            background-color: #4c4;
        }
    }


    label {
        display: inline-block;
        background-color: white;
        margin: 1px;
        padding: 6px 4px 4px 6px;
        border: 2px solid #444;
        border-radius: 8px;
        width: 2em;
        height: 2em;
        overflow: hidden;
    }

    label:hover {
        /*
        background-color: #dfd;
        */
    }

    input[type="radio"]:focus + label {
        border-color: black;
        /*border: 2px dashed #444;*/
    }

    input[type="radio"]:checked + label {
        /*
        background-color: #bfb;
        border-color: #4c4;
        */
    }
`;

const LabelIcon = {
    [TranslationAction.Discard]: <BiX />,
    [TranslationAction.NotSet]: <div />,
    [TranslationAction.Commit]: <BiCheck />
};

interface ActionSelectionProps {
    translation: TranslationStringData;
    gender: Gender;
}

export const TranslationActionSelection: React.FunctionComponent<ActionSelectionProps> = observer(({ translation, gender }) => {
    const { translatedStringModelId, translationsByGender } = translation;
    const translationDataForGender = translationsByGender.get(gender);
    const { action } = translationDataForGender;

    const groupName = translatedStringModelId + gender + "action";

    return (
        <>
            {
                translationActions.map(translationAction => (
                    <Element className={translationAction.toLowerCase()} key={translationAction}>
                        <input
                            type="radio"
                            id={groupName + translationAction}
                            name={groupName}
                            value={translationAction}
                            checked={action === translationAction}
                            onChange={() => {
                                runInAction(() => {
                                    translationDataForGender.action = translationAction;
                                });
                            }}
                        />
                        <label htmlFor={groupName + translationAction}>{LabelIcon[translationAction]}</label>
                    </Element>
                ))
            }
        </>
    );
});
