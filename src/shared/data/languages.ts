export const defaultLanguage = "en";
export const fallbackLanguages = ["en", "de"];

interface ILanguage {
    languageName: string;
}

interface ILanguageCollection {
    [key: string]: ILanguage;
}

const languageData: ILanguageCollection = {
    en: {
        languageName: "English"
    },
    de: {
        languageName: "Deutsch"
    },
    ku: {
        languageName: "Kurmancî"
    },
    ru: {
        languageName: "Русский язык"
    },
    uk: {
        languageName: "українська мова"
    },
    tr: {
        languageName: "Türkçe"
    }
};

export const validLanguages = Object.keys(languageData);

export function getValidLanguage(language: string) {
    return languageData[language] ? language : defaultLanguage;
}

export function getLanguageData(languageString: string) {
    languageString = getValidLanguage(languageString);
    return languageData[languageString];
}
