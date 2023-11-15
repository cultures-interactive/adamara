import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { ActionModel, ActionScope } from '../../../shared/action/ActionModel';
import { ActionTreeModel } from '../../../shared/action/ActionTreeModel';
import { gameStore } from '../../stores/GameStore';
import { itemStore } from '../../stores/ItemStore';
import { TextPartType, TextParser } from "./TextParser";

interface DialogueParserProperties {
    dialogueString: string;
    initialTreeScopeContext: ActionModel;
}

const ErrorSpan = styled.span`
    font-weight: bold;
    color: red;
`;

export const findVariableValue = (dialoguePart: string, rootActionTree: ActionTreeModel, treeScopeContext: ActionModel): string => {
    const { languageKey } = gameStore;
    // We do not know the scope/type, so we try things in order
    // 1. Local variable
    let variableValue = gameStore.gameEngine.gameState.getVariable(dialoguePart, ActionScope.Tree, rootActionTree, treeScopeContext);
    if (!variableValue) {
        // 2. Global Variable
        variableValue = gameStore.gameEngine.gameState.getVariable(dialoguePart, ActionScope.Global, rootActionTree, treeScopeContext);
    }
    if (!variableValue && gameStore.gameEngine.gameState.playerInventory.has(dialoguePart)) {
        // 3. Item - TODO should this be here at all?
        variableValue = itemStore.getItem(dialoguePart).name.get(languageKey);
    }
    return variableValue;
};

export const DialogueParser: React.FunctionComponent<DialogueParserProperties> = observer(({ dialogueString, initialTreeScopeContext }) => {
    const { t } = useTranslation();

    const parser = new TextParser();
    parser.parseString(dialogueString, initialTreeScopeContext, t);
    return <>
        {
            parser.textParts?.map((part, index) => {
                // Reassemble parts by mapping them to JSX elements
                switch (part.type) {
                    case TextPartType.Highlight:
                        return <strong key={index}>{part.content}</strong>;
                    case TextPartType.Italic:
                        return <i key={index}>{part.content}</i>;
                    case TextPartType.ItalicHighlight:
                        return <strong key={index}><i>{part.content}</i></strong>;
                    case TextPartType.Error:
                        return <ErrorSpan key={index}>{part.content}</ErrorSpan>;
                    default: // DialoguePartType.Regular:
                        return <span key={index}>{part.content}</span>;
                }
            })
        }
    </>;
});