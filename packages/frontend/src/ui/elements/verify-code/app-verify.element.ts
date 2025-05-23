import {extractErrorMessage} from '@augment-vir/common';
import {EmailCodeType, frontendPathTree, type BackendApi} from '@evir/common';
import {handleAuthResponse} from 'auth-vir';
import {
    asyncProp,
    css,
    defineElement,
    html,
    type AsyncProp,
    type HTMLTemplateResult,
} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type PendingFrontendState} from '../../../data/frontend-state/frontend-state.js';
import {loadUser} from '../../../data/frontend-state/load-user.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {appCssVars} from '../../styles/css-vars.js';
import {AppError} from '../common/app-error.element.js';
import {AppSignIn} from '../sign-in/app-sign-in.element.js';
import {AppEnterResetPassword} from './app-enter-reset-password.element.js';

export const AppVerify = defineElement<
    Readonly<
        Pick<PendingFrontendState, 'api' | 'currentRoute' | 'config' | 'debug' | 'user' | 'router'>
    >
>()({
    tagName: 'app-verify',
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
        };
    },
    render({inputs, state, dispatch}) {
        const contentTemplate = createVerificationContentTemplate(inputs, state, dispatch);

        return html`
            <div class="content">${contentTemplate}</div>
        `;
    },
});
const codeFailureTemplates: Record<EmailCodeType, (errorMessage: string) => HTMLTemplateResult> = {
    [EmailCodeType.AccountVerification]() {
        return html`
            <p class="error-wrapper">
                <${AppError}><span>Failed to verify your email.</span></${AppError}>
                <br />
                <br />
                If you already verified your account, sign in to access your account.
                <br />
                If you need a new verification email, sign in again to generate a new code.
            </p>
        `;
    },
    [EmailCodeType.ChangedEmailVerification](errorMessage) {
        return html`
            <p class="error-wrapper">
                <${AppError}>
                    <span>
                        Failed to verify your new email: ${errorMessage.trim() || 'Invalid code.'}
                    </span>
                </${AppError}>
            </p>
        `;
    },
    [EmailCodeType.PasswordReset]() {
        return html`
            <p class="error-wrapper">
                <${AppError}><span>Invalid code.</span></${AppError}>
            </p>
        `;
    },
};

function createVerificationContentTemplate(
    inputs: Readonly<
        Pick<PendingFrontendState, 'api' | 'currentRoute' | 'config' | 'debug' | 'user' | 'router'>
    >,
    state: {
        verificationSubmission: AsyncProp<undefined | Readonly<Pick<Response, 'ok'>>, void>;
    },
    dispatch: (event: Event) => void,
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
                <p class="success">Email verified!</p>
                <${AppSignIn.assign({
                    api: inputs.api.settledValue,
                    config: inputs.config,
                    router: inputs.router,
                })}></${AppSignIn}>
            `;
        } else if (codeType === EmailCodeType.PasswordReset) {
            return html`
                <${AppEnterResetPassword.assign({
                    emailCode: {
                        code,
                        codeId,
                        codeType,
                    },
                    frontendState: {
                        api: inputs.api.settledValue,
                        config: inputs.config,
                        router: inputs.router,
                    },
                })}></${AppEnterResetPassword}>
            `;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (codeType === EmailCodeType.ChangedEmailVerification) {
            return html`
                <p class="success">New email address successfully verified!</p>
            `;
        } else {
            return html`
                <${AppError}><p>'Unknown success template.</p></${AppError}>
            `;
        }
    } else {
        state.verificationSubmission.setValue(
            sendVerifyRequest({
                api: inputs.api.settledValue,
                code,
                codeId,
                codeType,
                dispatch,
                inputs,
            }),
        );
        return html`
            <p class="submitting">Verifying...</p>
        `;
    }
}

async function sendVerifyRequest({
    inputs,
    api,
    codeId,
    code,
    codeType,
    dispatch,
}: {
    inputs: Readonly<Pick<PendingFrontendState, 'user'>>;
    api: BackendApi;
    codeId: string;
    code: string;
    codeType: EmailCodeType;
    dispatch: (event: Event) => void;
}) {
    /**
     * Await the user here so that any cookies or CSRF tokens set by the below `'/verify'` endpoint
     * call don't get wiped from the initial failed `'/user'` fetch.
     */
    await inputs.user.value;

    const result = await api.endpoints['/verify'].fetch({
        requestData: {
            id: codeId,
            code,
            codeType,
        },
    });

    if (!result.ok) {
        throw new Error(result.data);
    }

    if (codeType === EmailCodeType.AccountVerification) {
        try {
            handleAuthResponse(result.response);
            const user = await loadUser(api);

            if (user) {
                dispatch(new UserEditEvent(user));
                dispatch(
                    new ChangeRouteEvent({
                        scrollToTop: true,
                        paths: frontendPathTree.paths.children.app.fullPaths,
                    }),
                );
            }
        } catch {
            /**
             * Ignore failing to load auth, if the signup cookie wasn't set it will fail
             * (intentionally).
             */
        }
    }

    return {
        ok: result.ok,
    };
}
