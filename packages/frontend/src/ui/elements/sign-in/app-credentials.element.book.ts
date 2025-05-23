import {check} from '@augment-vir/assert';
import {BookPageControlType, defineBookPage, definePageControl} from 'element-book';
import {css, type CSSResult, html, listen} from 'element-vir';
import {type SetOptional} from 'type-fest';
import {Shield24Icon, ViraIcon} from 'vira';
import {elementsPage} from '../design/top-level-pages.js';
import {knownAccountCreationErrors} from './app-create-account.element.js';
import {AppCredentials, AppCredentialsWrapThreshold} from './app-credentials.element.js';

type Inputs = SetOptional<
    Omit<typeof AppCredentials.InputsType, 'emailInput' | 'passwordInput'>,
    'errors' | 'infoLines' | 'isLoading'
>;

const examples: {
    title: string;
    inputs: Inputs | ((params: {controls: {'Create Account': boolean}}) => Inputs);
    styles?: CSSResult | undefined;
}[] = [
    {
        title: 'Signing In',
        inputs: {
            isCreatingAccount: false,
            submitButtonText: 'Sign In',
        },
    },
    {
        title: 'Creating Account',
        inputs: {
            isCreatingAccount: true,
            submitButtonText: 'Create Account',
        },
    },
    {
        title: 'Dynamic',
        inputs({controls}) {
            return {
                isCreatingAccount: controls['Create Account'],
                submitButtonText: controls['Create Account'] ? 'Create Account' : 'Sign in',
            };
        },
    },
    {
        title: 'Unwrapped',
        styles: css`
            ${AppCredentials} {
                max-width: 100%;
                width: ${AppCredentialsWrapThreshold + 1}px;
            }
        `,
        inputs: {
            isCreatingAccount: true,
            submitButtonText: 'Create Account',
        },
    },
    {
        title: 'Wrapped',
        styles: css`
            ${AppCredentials} {
                max-width: 100%;
                width: ${AppCredentialsWrapThreshold - 1}px;
            }
        `,
        inputs: {
            isCreatingAccount: true,
            submitButtonText: 'Create Account',
        },
    },
    {
        title: 'Email Error',
        inputs: {
            isCreatingAccount: true,
            errors: {
                email: knownAccountCreationErrors.invalidEmail,
            },
            submitButtonText: 'Create Account',
        },
    },
    {
        title: 'Password Error',
        inputs: {
            isCreatingAccount: true,
            errors: {
                password: knownAccountCreationErrors.passwordShort,
            },
            submitButtonText: 'Create Account',
        },
    },
    {
        title: 'General Error',
        inputs: {
            isCreatingAccount: true,
            errors: {
                generic: 'Server connection failed.',
            },
            submitButtonText: 'Create Account',
        },
    },
    {
        title: 'With info lines',
        inputs: {
            isCreatingAccount: true,
            infoLines: [
                'Password must be big.',
                html`
                    <div
                        style=${css`
                            display: flex;
                            gap: 8px;
                            align-items: center;
                            justify-content: center;
                        `}
                    >
                        <${ViraIcon.assign({icon: Shield24Icon})}></${ViraIcon}>
                        Template
                    </div>
                `,
            ],
            submitButtonText: 'Create Account',
        },
    },
];

export const appCredentialsBookPage = defineBookPage({
    parent: elementsPage,
    title: AppCredentials.tagName,
    controls: {
        'Create Account': definePageControl({
            controlType: BookPageControlType.Checkbox,
            initValue: false,
        }),
    },
    defineExamples({defineExample}) {
        examples.forEach((example) => {
            defineExample({
                title: example.title,
                styles: example.styles,
                state() {
                    return {
                        emailInput: '',
                        passwordInput: '',
                    };
                },
                render({state, updateState, controls}) {
                    const inputs = check.isFunction(example.inputs)
                        ? example.inputs({controls})
                        : example.inputs;

                    return html`
                        <${AppCredentials.assign({
                            infoLines: [],
                            errors: undefined,
                            isLoading: false,
                            ...state,
                            ...inputs,
                        })}
                            ${listen(AppCredentials.events.credentialsUpdate, (event) => {
                                updateState({
                                    emailInput: event.detail.emailAddress,
                                    passwordInput: event.detail.password,
                                });
                            })}
                        ></${AppCredentials}>
                    `;
                },
            });
        });
    },
});
