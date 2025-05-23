import {appCreateAccountBookPage} from '../sign-in/app-create-account.element.book.js';
import {appCredentialsBookPage} from '../sign-in/app-credentials.element.book.js';
import {appResetPasswordBookPage} from '../sign-in/app-reset-password.element.book.js';
import {appSignInBookPage} from '../sign-in/app-sign-in.element.book.js';
import {appEmailSuccessBookPage} from '../verify-code/app-email-success.element.book.js';
import {appEnterResetPasswordBookPage} from '../verify-code/app-enter-reset-password.element.book.js';
import {elementsPage} from './top-level-pages.js';

const elementPages = [
    appCreateAccountBookPage,
    appCredentialsBookPage,
    appEmailSuccessBookPage,
    appEnterResetPasswordBookPage,
    appResetPasswordBookPage,
    appSignInBookPage,
].sort((a, b) => a.title.localeCompare(b.title));

export const allPages = [
    elementsPage,

    ...elementPages,
];
