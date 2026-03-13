import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppResetPassword, ResetPasswordType} from './app-reset-password.element.js';

export const appResetPasswordBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppResetPassword.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'forgot',
            render({controls}) {
                return html`
                    <${AppResetPassword.assign({
                        frontendState: controls.frontendState,
                        resetType: ResetPasswordType.ForgotPassword,
                    })}></${AppResetPassword}>
                `;
            },
        });
        defineExample({
            title: 'reset',
            render({controls}) {
                return html`
                    <${AppResetPassword.assign({
                        frontendState: controls.frontendState,
                        resetType: ResetPasswordType.ResetPassword,
                    })}></${AppResetPassword}>
                `;
            },
        });
    },
});
