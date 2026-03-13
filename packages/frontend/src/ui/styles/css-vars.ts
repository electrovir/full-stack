import {defineCssVars} from 'lit-css-vars';

export const appCssVars = defineCssVars({
    'app-content-padding': '32px',
    'app-small-page-header-margin': '10dvh',

    'app-page-padding': '48px',
    'app-page-padding-mini': '18px',

    /** For wrapper elements with a small border radius. */
    'app-small-wrapper-border-radius': '8px',
    /** For wrapper elements with a large border radius. */
    'app-large-wrapper-border-radius': '16px',

    'app-wrapper-border-width': '1px',

    'app-button-border-radius': '8px',
} satisfies Record<`app-${string}`, any>);
