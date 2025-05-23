import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {type SetOptional} from 'type-fest';
import {elementsPage} from '../design/top-level-pages.js';
import {AppEmailSuccess, EmailSuccessType} from './app-email-success.element.js';

const examples: {
    title: string;
    inputs: SetOptional<typeof AppEmailSuccess.InputsType, 'emailAddress'>;
}[] = [
    {
        title: 'user created',
        inputs: {
            successType: EmailSuccessType.UserCreated,
        },
    },
    {
        title: 'password reset',
        inputs: {
            successType: EmailSuccessType.PasswordReset,
        },
    },
    {
        title: 'email change',
        inputs: {
            successType: EmailSuccessType.ChangeEmail,
        },
    },
    {
        title: 'specific email',
        inputs: {
            successType: EmailSuccessType.UserCreated,
            emailAddress: 'your-name@example.com',
        },
    },
];

export const appEmailSuccessBookPage = defineBookPage({
    parent: elementsPage,
    descriptionParagraphs: [
        'Email address will be populated based on the current user account or the account information they provided.',
    ],
    title: AppEmailSuccess.tagName,
    defineExamples({defineExample}) {
        examples.forEach((example) => {
            defineExample({
                title: example.title,
                render() {
                    return html`
                        <${AppEmailSuccess.assign({
                            emailAddress: 'user@example.com',
                            ...example.inputs,
                        })}></${AppEmailSuccess}>
                    `;
                },
            });
        });
    },
});
