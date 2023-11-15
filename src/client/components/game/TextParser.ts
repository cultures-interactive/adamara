import { ActionModel } from "../../../shared/action/ActionModel";
import { TFunction } from "i18next";
import { findVariableValue } from "./DialogueParser";
import { formatTreeParameter } from "../../../shared/helper/actionTreeHelper";
import { gameStore } from "../../stores/GameStore";
import { sharedStore } from "../../stores/SharedStore";
import { getTreeParent } from "../../../shared/action/ActionTreeModel";

export enum TextPartType {
    Regular, Highlight, Italic, ItalicHighlight, Error,
}

export class TextParser {

    public textParts: { type: TextPartType; content: string; }[] = [];
    public parsedChars: string[] = [];

    public parseString(fullString: string, treeScopeContext: ActionModel, t: TFunction) {
        // Step 1: Identify special characters with a regex
        const indices: { char: string; index: number; }[] = [];
        const regex = /\*|\_|\$|\%|\§/gi;
        let regexResult: RegExpExecArray;
        while ((regexResult = regex.exec(fullString))) {
            indices.push({ char: fullString[regexResult.index], index: regexResult.index });
        }

        if (indices.length === 0) {
            this.textParts.push({ type: TextPartType.Regular, content: fullString }); // Return original string if it does not contain any special characters
            return;
        }

        // Step 2: Divide string into parts
        this.textParts.push({ type: TextPartType.Regular, content: fullString.substring(0, indices[0].index) }); // Start with part 0, that goes until first special character

        let highlightThisPart = false;
        let italicThisPart = false;
        for (let i = 0; i < indices.length; i++) {
            const nextIndex = i < indices.length - 1 ? indices[i + 1].index : 1000000;

            this.parsedChars.push(indices[i].char);

            let type = TextPartType.Regular;
            // At '_' character: Toggle italic highlighting of text
            if (indices[i].char === '_') italicThisPart = !italicThisPart;

            // At '*' character: Toggle bold highlighting of text
            if (indices[i].char === '*') highlightThisPart = !highlightThisPart;

            if (italicThisPart)
                type = TextPartType.Italic;
            if (highlightThisPart)
                type = TextPartType.Highlight;
            if (italicThisPart && highlightThisPart)
                type = TextPartType.ItalicHighlight;

            // At '$' character: Replace variable name in this part with that variable's value
            const replaceThisPartWithVariableValue = indices[i].char === '$' && (this.parsedChars.filter(i => i === "$").length % 2 == 1); // Only react to first '$' character

            // At '%' character: Replace template paramter in this part with that parameter's value
            const replaceThisPartWithParameterValue = indices[i].char === '%' && (this.parsedChars.filter(i => i === "%").length % 2 == 1);

            // At '§' character: Replace character reference name in this part with that characters's name
            const replaceThisPartWithCharacterName = indices[i].char === '§' && (this.parsedChars.filter(i => i === "§").length % 2 == 1);

            const dialoguePart = fullString.substring(indices[i].index + 1, nextIndex);

            // Find variable value
            if (replaceThisPartWithVariableValue) {
                const variableValue = findVariableValue(dialoguePart, gameStore.gameEngine.rootActionTree, treeScopeContext);
                if (variableValue) {
                    const content = variableValue;
                    this.textParts.push({ type, content });
                } else { // Variable value was not found!
                    const content = `[${t("editor.error_dialogue_variable_not_found", { name: dialoguePart })}]`;
                    this.textParts.push({ type: TextPartType.Error, content });
                }
            } else if (replaceThisPartWithParameterValue) {
                const parameterValue = gameStore.gameEngine.resolvePotentialTreeParameter(formatTreeParameter(dialoguePart), treeScopeContext);
                if (parameterValue) {
                    // Traverse up the tree hierarchy for variables/parameters/highlights used in the parameter's value
                    this.parseString(parameterValue, getTreeParent(treeScopeContext), t);
                } else {
                    const content = `[${t("editor.error_dialogue_tree_parameter_not_found", { name: dialoguePart })}]`;
                    this.textParts.push({ type: TextPartType.Error, content });
                }
            } else if (replaceThisPartWithCharacterName) {
                const characterName = sharedStore.getCharacterByReferenceId(dialoguePart)?.localizedName;
                if (dialoguePart === "player") {
                    this.textParts.push({ type, content: gameStore.playerName });
                } else if (characterName) {
                    const content = characterName.get(gameStore.languageKey);
                    this.textParts.push({ type, content });
                } else {
                    const content = `[${t("editor.error_character_not_found", { name: dialoguePart })}]`;
                    this.textParts.push({ type: TextPartType.Error, content });
                }
            } else {
                const content = dialoguePart;
                this.textParts.push({ type, content });
            }
        }
    }

    public toString() {
        return this.textParts?.map(part => part.content).join('');
    }

}