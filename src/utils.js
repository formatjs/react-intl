
/*
HTML escaping and shallow-equals implementations are the same as React's
(on purpose.) Therefore, it has the following Copyright and Licensing:

Copyright 2013-2014, Facebook, Inc.
All rights reserved.

This source code is licensed under the BSD-style license found in the LICENSE
file in the root directory of React's source tree.
*/

import invariant from 'invariant';

const ESCAPED_CHARS = {
    '&' : '&amp;',
    '>' : '&gt;',
    '<' : '&lt;',
    '"' : '&quot;',
    '\'': '&#x27;',
};

const UNSAFE_CHARS_REGEX = /[&><"']/g;

export function escape(str) {
    return ('' + str).replace(UNSAFE_CHARS_REGEX, (match) => ESCAPED_CHARS[match]);
}

export function invariantIntlContext({intl} = {}) {
    invariant(intl,
        '[React Intl] Could not find required `intl` object. ' +
        '<IntlProvider> needs to exist in the component ancestry.'
    );
}

export function shallowEquals(objA, objB) {
    if (objA === objB) {
        return true;
    }

    if (typeof objA !== 'object' || objA === null ||
        typeof objB !== 'object' || objB === null) {
        return false;
    }

    let keysA = Object.keys(objA);
    let keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) {
        return false;
    }

    // Test for A's keys different from B.
    let bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB);
    for (let i = 0; i < keysA.length; i++) {
        if (!bHasOwnProperty(keysA[i]) || objA[keysA[i]] !== objB[keysA[i]]) {
            return false;
        }
    }

    return true;
}

export function shouldIntlComponentUpdate(
    {props, state, context = {}},
    nextProps, nextState, nextContext = {}
) {
    const {intl = {}} = context;
    const {intl: nextIntl = {}} = nextContext;

    return (
        !shallowEquals(nextProps, props) ||
        !shallowEquals(nextState, state) ||
        !shallowEquals(nextIntl, intl)
    );
}

export function prepareIntlStyleOption(props) {
    const hasStyle     = 'style' in props;
    const hasIntlStyle = 'intlStyle' in props;

    if (!hasStyle && !hasIntlStyle) {
        return props;
    } else {
        let newProps = {...props};

        if (hasIntlStyle) {
            newProps['style'] = newProps['intlStyle'];
            delete newProps['intlStyle'];
        } else if (hasStyle) {
            delete newProps['style'];
        }

        return newProps;
    }
}
