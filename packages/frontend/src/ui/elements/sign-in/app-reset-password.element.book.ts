import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {elementsPage} from '../design/top-level-pages.js';
import {AppResetPassword} from './app-reset-password.element.js';

export const appResetPasswordBookPage = defineBookPage({
    parent: elementsPage,
    title: AppResetPassword.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'basic',
            render({controls}) {
                return html`
                    <${AppResetPassword.assign(controls)}></${AppResetPassword}>
                `;
            },
        });
    },
});
