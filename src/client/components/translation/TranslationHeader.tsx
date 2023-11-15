import React from 'react';
import { observer } from "mobx-react-lite";
import { useTranslation } from 'react-i18next';
import { editorStore } from '../../stores/EditorStore';
import { Heading1Base } from '../shared/Heading';

interface Props {
    titleKey: string;
}

export const TranslationHeader: React.FunctionComponent<Props> = observer(({ titleKey }) => {
    const { t } = useTranslation();

    const { sessionModule } = editorStore;

    const title = t(titleKey);

    if (sessionModule) {
        return <Heading1Base>{t("translation.title_for_module", { title, workshop: sessionModule.workshopName, module: sessionModule.moduleName })}</Heading1Base>;
    } else {
        return <Heading1Base>{t("translation.title_for_core_game", { title })}</Heading1Base>;
    }
});