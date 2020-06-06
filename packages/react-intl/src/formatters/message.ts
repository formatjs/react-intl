/*
 * Copyright 2015, Yahoo Inc.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

import * as React from 'react';
import {invariant} from '@formatjs/intl-utils';
import {unapplyFormatXMLElementFn} from '../utils';

import {
  Formatters,
  IntlConfig,
  MessageDescriptor,
  CustomFormats,
} from '../types';

import IntlMessageFormat, {
  FormatXMLElementFn,
  PrimitiveType,
} from 'intl-messageformat';
import {MissingTranslationError, MessageFormatError} from '../error';

type FormatMessageValues = Record<
  string,
  | PrimitiveType
  | React.ReactNode
  | FormatXMLElementFn<React.ReactNode, React.ReactNode>
>;

function setTimeZoneInOptions(
  opts: Record<string, Intl.DateTimeFormatOptions>,
  timeZone: string
): Record<string, Intl.DateTimeFormatOptions> {
  return Object.keys(opts).reduce(
    (all: Record<string, Intl.DateTimeFormatOptions>, k) => {
      all[k] = {
        timeZone,
        ...opts[k],
      };
      return all;
    },
    {}
  );
}

function deepMergeOptions(
  opts1: Record<string, Intl.DateTimeFormatOptions>,
  opts2: Record<string, Intl.DateTimeFormatOptions>
): Record<string, Intl.DateTimeFormatOptions> {
  const keys = Object.keys({...opts1, ...opts2});
  return keys.reduce((all: Record<string, Intl.DateTimeFormatOptions>, k) => {
    all[k] = {
      ...(opts1[k] || {}),
      ...(opts2[k] || {}),
    };
    return all;
  }, {});
}

function deepMergeFormatsAndSetTimeZone(
  f1: CustomFormats,
  timeZone?: string
): CustomFormats {
  if (!timeZone) {
    return f1;
  }
  const mfFormats = IntlMessageFormat.formats;
  return {
    ...mfFormats,
    ...f1,
    date: deepMergeOptions(
      setTimeZoneInOptions(mfFormats.date, timeZone),
      setTimeZoneInOptions(f1.date || {}, timeZone)
    ),
    time: deepMergeOptions(
      setTimeZoneInOptions(mfFormats.time, timeZone),
      setTimeZoneInOptions(f1.time || {}, timeZone)
    ),
  };
}

export function patchFormatXMLElementFn(
  values: FormatMessageValues
): FormatMessageValues {
  return Object.keys(values).reduce((acc: FormatMessageValues, k) => {
    const v = values[k];
    acc[k] =
      typeof v === 'function'
        ? unapplyFormatXMLElementFn(
            // type assertation needed since TypeScript infers possible generic
            // Function type for `v`, but we know the only possible function
            // in `values` is FormatXMLElementFn
            v as FormatXMLElementFn<React.ReactNode, React.ReactNode>
          )
        : v;
    return acc;
  }, {});
}

function prepareIntlMessageFormatHtmlOutput(
  chunks: React.ReactNode,
  shouldWrap?: boolean
): React.ReactNode {
  return Array.isArray(chunks) && shouldWrap
    ? React.createElement(React.Fragment, null, ...chunks)
    : chunks;
}

export function formatMessage(
  {
    locale,
    formats,
    messages,
    defaultLocale,
    defaultFormats,
    onError,
  }: Pick<
    IntlConfig,
    | 'locale'
    | 'formats'
    | 'messages'
    | 'defaultLocale'
    | 'defaultFormats'
    | 'onError'
  >,
  state: Formatters,
  messageDescriptor?: MessageDescriptor,
  values?: FormatMessageValues
): string;
export function formatMessage(
  {
    locale,
    formats,
    messages,
    defaultLocale,
    defaultFormats,
    onError,
    timeZone,
    wrapRichTextChunksInFragment,
  }: Pick<
    IntlConfig,
    | 'locale'
    | 'formats'
    | 'messages'
    | 'defaultLocale'
    | 'defaultFormats'
    | 'onError'
    | 'timeZone'
    | 'wrapRichTextChunksInFragment'
  >,
  state: Formatters,
  messageDescriptor: MessageDescriptor = {id: ''},
  values?: FormatMessageValues
): React.ReactNode {
  const {id, defaultMessage} = messageDescriptor;

  // `id` is a required field of a Message Descriptor.
  invariant(!!id, '[React Intl] An `id` must be provided to format a message.');
  const message = messages && messages[String(id)];
  // IMPORTANT: Hot path straight lookup for performance
  if (!values && message && typeof message === 'string') {
    return message.replace(/'\{(.*?)\}'/gi, `{$1}`);
  }
  const patchedValues = values && patchFormatXMLElementFn(values);
  formats = deepMergeFormatsAndSetTimeZone(formats, timeZone);
  defaultFormats = deepMergeFormatsAndSetTimeZone(defaultFormats, timeZone);

  if (!message) {
    if (
      !defaultMessage ||
      (locale && locale.toLowerCase() !== defaultLocale.toLowerCase())
    ) {
      // This prevents warnings from littering the console in development
      // when no `messages` are passed into the <IntlProvider> for the
      // default locale.
      onError(new MissingTranslationError(messageDescriptor, locale));
    }
    if (defaultMessage) {
      try {
        const formatter = state.getMessageFormat(
          defaultMessage,
          defaultLocale,
          defaultFormats
        );

        return prepareIntlMessageFormatHtmlOutput(
          formatter.format(patchedValues),
          wrapRichTextChunksInFragment
        );
      } catch (e) {
        onError(
          new MessageFormatError(
            `Error formatting default message for: "${id}", rendering default message verbatim`,
            locale,
            messageDescriptor,
            e
          )
        );
        return defaultMessage;
      }
    }
    return id;
  }

  // We have the translated message
  try {
    const formatter = state.getMessageFormat(message, locale, formats, {
      formatters: state,
    });

    return prepareIntlMessageFormatHtmlOutput(
      formatter.format<React.ReactNode>(patchedValues),
      wrapRichTextChunksInFragment
    );
  } catch (e) {
    onError(
      new MessageFormatError(
        `Error formatting message: "${id}", using ${
          defaultMessage ? 'default message' : 'id'
        } as fallback.`,
        locale,
        messageDescriptor,
        e
      )
    );
  }

  if (defaultMessage) {
    try {
      const formatter = state.getMessageFormat(
        defaultMessage,
        defaultLocale,
        defaultFormats
      );

      return prepareIntlMessageFormatHtmlOutput(
        formatter.format(patchedValues),
        wrapRichTextChunksInFragment
      );
    } catch (e) {
      onError(
        new MessageFormatError(
          `Error formatting the default message for: "${id}", rendering message verbatim`,
          locale,
          messageDescriptor,
          e
        )
      );
    }
  }
  return message || defaultMessage || id;
}
