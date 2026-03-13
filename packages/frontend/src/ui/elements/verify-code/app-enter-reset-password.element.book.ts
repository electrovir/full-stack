import {applyBrand} from '@augment-vir/common';
import {type EmailCode, EmailCodeType} from '@evir/common';
import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppEnterResetPassword} from './app-enter-reset-password.element.js';

export const appEnterResetPasswordBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppEnterResetPassword.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'basic',
            render({controls}) {
                return html`
                    <${AppEnterResetPassword.assign({
                        ...controls,
                        emailCode: {
                            code: 'code',
                            codeId: applyBrand<EmailCode['id']>('code id'),
                            codeType: EmailCodeType.PasswordReset,
                        },
                    })}></${AppEnterResetPassword}>
                `;
            },
        });
    },
});
