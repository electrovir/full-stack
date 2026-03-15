import {check} from '@augment-vir/assert';
import {BookPageControlType, defineBookPage, definePageControl} from 'element-book';
import {css, type CSSResult, html, listen} from 'element-vir';
import {type SetOptional} from 'type-fest';
import {Shield24Icon, ViraIcon} from 'vira';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppCredentials} from './app-credentials.element.js';

type Inputs = SetOptional<
    Omit<typeof AppCredentials.InputsType, 'emailInput' | 'passwordInput' | 'frontendState'>,
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
        title: 'Email Error',
        inputs: {
            isCreatingAccount: true,
            errors: {
                email: 'Invalid email address.',
            },
            submitButtonText: 'Create Account',
        },
    },
    {
        title: 'Password Error',
        inputs: {
            isCreatingAccount: true,
            errors: {
                password: 'Password too short.',
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
                        <${ViraIcon.assign({
                            icon: Shield24Icon,
                        })}></${ViraIcon}>
                        Template
                    </div>
                `,
            ],
            submitButtonText: 'Create Account',
        },
    },
];

export const AppCredentialsBookPage = defineBookPage({
    parent: elementsBookPage,
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
                        ? example.inputs({
                              controls,
                          })
                        : example.inputs;

                    return html`
                        <${AppCredentials.assign({
                            ...controls,
                            ...state,
                            ...inputs,
                            infoLines: [],
                            errors: undefined,
                            isLoading: false,
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
