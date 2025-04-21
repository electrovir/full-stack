import {extractErrorMessage} from '@augment-vir/common';
import {EmailCodeType} from '@evir/common';
import {
    asyncProp,
    type AsyncProp,
    css,
    defineElement,
    html,
    type HTMLTemplateResult,
    listen,
    renderIf,
} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type PendingFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appCssVars} from '../../styles/css-vars.js';
import {errorCss} from '../../styles/styles.js';
import {AppPasswordReset} from './app-password-reset.element.js';
import {AppSignIn} from './app-sign-in.element.js';

export const AppVerification = defineElement<
    Readonly<Pick<PendingFrontendState, 'api' | 'currentRoute' | 'config' | 'debug'>>
>()({
    tagName: 'app-verification',
    styles: css`
        :host {
            display: flex;
            max-width: 100%;
            justify-content: center;
            align-items: flex-start;
            padding-top: ${appCssVars['app-content-padding'].value};
        }

        .content {
            display: flex;
            max-width: 100%;
            flex-direction: column;
            gap: ${appCssVars['app-content-padding'].value};
            width: 700px;
        }

        .submitting {
            text-align: center;
            font-size: 1.2em;
        }

        p {
            ${noNativeSpacing};
        }

        .error {
            ${errorCss};
        }

        .error-wrapper {
            font-size: 1.2em;
        }

        .success {
            text-align: center;
            font-size: 1.3em;
            color: #00616b;
        }
    `,
    state() {
        return {
            verificationSubmission: asyncProp({
                defaultValue: undefined as undefined | Readonly<Pick<Response, 'ok'>>,
            }),
            passwordReset: false,
        };
    },
    render({inputs, state, updateState}) {
        const contentTemplate = createVerificationContentTemplate(inputs, state, updateState);

        return html`
            <div class="content">${contentTemplate}</div>
        `;
    },
});
const codeFailureTemplates: Record<EmailCodeType, (errorMessage: string) => HTMLTemplateResult> = {
    [EmailCodeType.AccountVerification]() {
        return html`
            <p class="error-wrapper">
                <span class="error">Failed to verify your email.</span>
                <br />
                <br />
                If you already verified your email, sign in to access your account.
                <br />
                If you need a new verification email, sign in to generate a new code.
            </p>
        `;
    },
    [EmailCodeType.ChangedEmailVerification](errorMessage) {
        return html`
            <p class="error-wrapper">
                <span class="error">
                    Failed to verify your new email: ${errorMessage.trim() || 'Invalid code.'}
                </span>
            </p>
        `;
    },
    [EmailCodeType.PasswordReset]() {
        return html`
            <p class="error-wrapper">
                <span class="error">Invalid code.</span>
            </p>
        `;
    },
};

function createVerificationContentTemplate(
    inputs: Readonly<Pick<PendingFrontendState, 'api' | 'currentRoute' | 'config' | 'debug'>>,
    state: {
        verificationSubmission: AsyncProp<undefined | Readonly<Pick<Response, 'ok'>>, void>;
        passwordReset: boolean;
    },
    updateState: (newState: Partial<{passwordReset: boolean}>) => void,
) {
    const code: string | undefined = inputs.currentRoute.search?.code[0];
    const codeId: string | undefined = inputs.currentRoute.search?.id[0];
    const codeType: EmailCodeType | undefined = inputs.currentRoute.search?.type[0];

    if (!inputs.api.settledValue || state.verificationSubmission.isWaiting()) {
        return html`
            <p class="submitting">Verifying...</p>
        `;
    } else if (
        !code ||
        !codeId ||
        inputs.api.settledValue instanceof Error ||
        state.verificationSubmission.settledValue instanceof Error ||
        (state.verificationSubmission.settledValue &&
            !state.verificationSubmission.settledValue.ok) ||
        !codeType
    ) {
        if (!codeType) {
            return html`
                <p class="error-wrapper"><span>Invalid verification link.</span></p>
            `;
        }

        const errorMessage =
            inputs.api.settledValue instanceof Error
                ? extractErrorMessage(inputs.api.settledValue)
                : state.verificationSubmission.settledValue instanceof Error
                  ? extractErrorMessage(state.verificationSubmission.settledValue)
                  : '';

        return codeFailureTemplates[codeType](errorMessage);
    } else if (
        state.verificationSubmission.settledValue &&
        state.verificationSubmission.settledValue.ok
    ) {
        if (codeType === EmailCodeType.AccountVerification) {
            return html`
                ${renderIf(
                    !state.passwordReset,
                    html`
                        <p class="success">
                            Email successfully verified. Please sign in to access your account:
                        </p>
                    `,
                )}
                <${AppSignIn.assign({
                    showButtons: {signInOnly: true},
                    api: inputs.api.settledValue,
                    config: inputs.config,
                    debug: inputs.debug,
                })}
                    ${listen(AppSignIn.events.passwordResetEmailSend, () => {
                        updateState({passwordReset: true});
                    })}
                ></${AppSignIn}>
            `;
        } else if (codeType === EmailCodeType.PasswordReset) {
            return html`
                <${AppPasswordReset.assign({
                    api: inputs.api.settledValue,
                    config: inputs.config,
                    debug: inputs.debug,
                    codeId,
                    code,
                    codeType,
                })}></${AppPasswordReset}>
            `;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (codeType === EmailCodeType.ChangedEmailVerification) {
            return html`
                <p class="success">New email address successfully verified!</p>
            `;
        } else {
            return html`
                <p class="error">'Unknown success template.</p>
            `;
        }
    } else {
        state.verificationSubmission.setValue(
            inputs.api.settledValue.endpoints['/verify']
                .fetch({
                    requestData: {
                        id: codeId,
                        code,
                        codeType,
                    },
                })
                .then((result) => {
                    if (!result.ok) {
                        throw new Error(result.data);
                    }
                    return {
                        ok: result.ok,
                    };
                }),
        );
        return html`
            <p class="submitting">Verifying...</p>
        `;
    }
}
