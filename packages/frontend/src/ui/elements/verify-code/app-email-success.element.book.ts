import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {EmailSuccessType} from '../../../data/email-success-type.js';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppEmailSuccess} from './app-email-success.element.js';

const examples: {
    title: string;
    inputs: Readonly<Omit<typeof AppEmailSuccess.InputsType, 'frontendState'>>;
}[] = [
    {
        title: 'account created',
        inputs: {
            emailAddress: 'fake@example.com',
            successType: EmailSuccessType.AccountCreated,
            emailSentJustNow: true,
        },
    },
    {
        title: 'forgot password',
        inputs: {
            emailAddress: 'fake@example.com',
            successType: EmailSuccessType.ForgotPassword,
            emailSentJustNow: true,
        },
    },
    {
        title: 'password reset',
        inputs: {
            emailAddress: 'fake@example.com',
            successType: EmailSuccessType.PasswordReset,
            emailSentJustNow: true,
        },
    },
];

export const appEmailSuccessBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppEmailSuccess.tagName,
    defineExamples({defineExample}) {
        examples.forEach((example) => {
            defineExample({
                title: example.title,
                render({controls}) {
                    return html`
                        <${AppEmailSuccess.assign({
                            ...controls,
                            ...example.inputs,
                        })}></${AppEmailSuccess}>
                    `;
                },
            });
        });
    },
});
