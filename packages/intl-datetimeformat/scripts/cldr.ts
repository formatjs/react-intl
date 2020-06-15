import {extractDatesFields, getAllLocales} from './extract-dates';
import {resolve, join} from 'path';
const locales = getAllLocales();
import {outputFileSync, outputJSONSync} from 'fs-extra';
import {RawDateTimeLocaleData} from '../src/types';
const data = extractDatesFields();
const langData = locales.reduce(
  (all: Record<string, RawDateTimeLocaleData>, locale) => {
    const lang = locale.split('-')[0];
    if (!all[lang]) {
      all[lang] = {
        data: {
          [locale]: data[locale],
        },
        availableLocales: [locale],
      };
    } else {
      all[lang].data[locale] = data[locale];
      all[lang].availableLocales.push(locale);
    }

    if (locale === 'en-US-POSIX') {
      all[lang].availableLocales.push('en-US');
    }

    return all;
  },
  {}
);

const allLocaleDistDir = resolve(__dirname, '../dist/locale-data');

// Dist all locale files to dist/locale-data
Object.keys(langData).forEach(function (lang) {
  const destFile = join(allLocaleDistDir, lang + '.js');
  outputFileSync(
    destFile,
    `/* @generated */	
  // prettier-ignore
  if (Intl.DateTimeFormat && typeof Intl.DateTimeFormat.__addLocaleData === 'function') {
    Intl.DateTimeFormat.__addLocaleData(${JSON.stringify(langData[lang])})
  }`
  );
});

// Dist all json locale files to dist/locale-data
Object.keys(langData).forEach(function (lang) {
  const destFile = join(allLocaleDistDir, lang + '.json');
  outputJSONSync(destFile, langData[lang], {spaces: 2});
});

outputFileSync(
  resolve(__dirname, '../polyfill-locales.js'),
  `/* @generated */
  // prettier-ignore
  require('./polyfill')
  if (Intl.DateTimeFormat && typeof Intl.DateTimeFormat.__addLocaleData === 'function') {
    Intl.DateTimeFormat.__addLocaleData(
  ${Object.keys(langData)
    .map(lang => JSON.stringify(langData[lang]))
    .join(',\n')}
    )
  }
  `
);
