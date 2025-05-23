import {EmailCodeType} from '@evir/common';
import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {elementsPage} from '../design/top-level-pages.js';
import {AppEnterResetPassword} from './app-enter-reset-password.element.js';

export const appEnterResetPasswordBookPage = defineBookPage({
    parent: elementsPage,
    title: AppEnterResetPassword.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'basic',
            render({controls}) {
                return html`
                    <${AppEnterResetPassword.assign({
                        emailCode: {
                            code: 'code',
                            codeId: 'code id',
                            codeType: EmailCodeType.PasswordReset,
                        },
                        frontendState: controls,
                    })}></${AppEnterResetPassword}>
                `;
            },
        });
    },
});
