import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpApi from 'i18next-http-backend';
import LanguageDetector from "i18next-browser-languagedetector";
import { defaultLanguage, validLanguages } from "../../shared/data/languages";

export const i18nLoaded = i18n
    // load translation using html requests
    // learn more: https://github.com/i18next/i18next-http-backend
    .use(HttpApi)
    // detect user language
    // learn more: https://github.com/i18next/i18next-browser-languageDetector
    .use(LanguageDetector)
    // pass the i18n instance to react-i18next.
    .use(initReactI18next)
    // init i18next
    // for all options read: https://www.i18next.com/overview/configuration-options
    .init({
        fallbackLng: defaultLanguage,
        debug: false,//process.env.NODE_ENV !== "production",

        interpolation: {
            escapeValue: false, // not needed for react as it escapes by default
        },

        backend: {
            loadPath: process.env.PUBLIC_URL + "/assets/locales/{{lng}}.json"
        },

        detection: {
            //order: ['querystring', 'cookie', 'localStorage', 'sessionStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
        },

        load: "currentOnly",
        whitelist: validLanguages
    });

export default i18n;