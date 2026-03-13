import {type BookPage} from 'element-book';
import {appLogoBookPage} from '../common/app-logo.element.book.js';
import {appThemeSwitcherBookPage} from '../common/app-theme-switcher.element.book.js';
import {appHeaderUserBookPage} from '../header/app-user-header.element.book.js';
import {appEmailSuccessBookPage} from '../verify-code/app-email-success.element.book.js';
import {elementsBookPage, stylesBookPage} from './top-level-book-pages.js';

function sortBookPages(bookPages: BookPage[]) {
    return bookPages.sort((a, b) => a.title.localeCompare(b.title));
}

const allTopLevelBookPages = sortBookPages([
    elementsBookPage,
    stylesBookPage,
]);

const allChildBookPages = sortBookPages([
    appEmailSuccessBookPage,
    appHeaderUserBookPage,
    appLogoBookPage,
    appThemeSwitcherBookPage,
]);

export const allBookPages = [
    ...allTopLevelBookPages,
    ...allChildBookPages,
];
