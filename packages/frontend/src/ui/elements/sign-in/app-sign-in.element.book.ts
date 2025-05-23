import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {elementsPage} from '../design/top-level-pages.js';
import {AppSignIn} from './app-sign-in.element.js';

export const appSignInBookPage = defineBookPage({
    parent: elementsPage,
    title: AppSignIn.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'basic',
            render({controls}) {
                return html`
                    <${AppSignIn.assign(controls)}></${AppSignIn}>
                `;
            },
        });
    },
});
