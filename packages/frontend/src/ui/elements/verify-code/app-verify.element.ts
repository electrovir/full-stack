import {applyBrand, extractErrorMessage, type SelectFrom} from '@augment-vir/common';
import {csrfOptions, EmailCodeType, frontendPathTree, type EmailCode} from '@evir/common';
import {handleAuthResponse} from 'auth-vir';
import {
    asyncProp,
    css,
    html,
    nothing,
    type AsyncProp,
    type HtmlInterpolation,
    type HTMLTemplateResult,
} from 'element-vir';
import {noNativeSpacing, ViraButton, ViraError, ViraLink} from 'vira';
import {stateMatches} from '../../../data/frontend-state/frontend-state-checks.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {loadUser} from '../../../data/frontend-state/load-user.js';
import {ChangeRouteEvent} from '../../events/change-route.event.js';
import {UserEditEvent} from '../../events/user-edit.event.js';
import {appCssVars} from '../../styles/css-vars.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppSignIn} from '../login/app-sign-in.element.js';
import {AppEnterResetPassword} from './app-enter-reset-password.element.js';

export const AppVerify = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-verify',
    styles: css`
        :host {
            display: flex;
            max-width: 100%;
            justify-content: center;
            align-items: flex-start;
        }

        .content {
            display: flex;
            max-width: 100%;
            flex-direction: column;
            gap: ${appCssVars['app-content-padding'].value};
        }

        .submitting {
            text-align: center;
            font-size: 1.2em;
        }

        p {
            ${noNativeSpacing};
        }

        .error-wrapper,
        ${ViraError} {
            font-size: 1.2em;
        }

        .success {
            text-align: center;
            font-size: 1.3em;
            color: #00616b;
        }

        ${AppEnterResetPassword} {
            padding: 0 ${appCssVars['app-content-padding'].value};
        }
    `,
    state() {
        return {
            verificationSubmission: asyncProp({
                defaultValue: undefined as
                    | undefined
                    | Readonly<
                          SelectFrom<
                              Response,
                              {
                                  ok: true;
                              }
                          >
                      >,
            }),
        };
    },
    render({inputs, state, dispatch}) {
        const contentTemplate = createVerificationContentTemplate(
            inputs.frontendState,
            state,
            dispatch,
        );

        return html`
            <div class="content">${contentTemplate}</div>
        `;
    },
});

function createVerificationContentTemplate(
    frontendState: Readonly<FrontendState>,
    state: {
        verificationSubmission: AsyncProp<
            | undefined
            | Readonly<
                  SelectFrom<
                      Response,
                      {
                          ok: true;
                      }
                  >
              >,
            void
        >;
    },
    dispatch: (event: Event) => void,
): HtmlInterpolation {
    const code: string | undefined = frontendState.currentRoute.search?.code?.[0];
    const codeId: EmailCode['id'] | undefined = applyBrand<EmailCode['id']>(
        frontendState.currentRoute.search?.id?.[0],
    );
    const codeType: EmailCodeType | undefined = frontendState.currentRoute.search?.type?.[0];

    if (state.verificationSubmission.isWaiting()) {
        return html`
            <p class="submitting">${frontendState.i18nClient.get.AppVerify.verifying}</p>
        `;
    } else if (
        !code ||
        !codeId ||
        state.verificationSubmission.settledValue instanceof Error ||
        (state.verificationSubmission.settledValue &&
            !state.verificationSubmission.settledValue.ok) ||
        !codeType
    ) {
        if (!codeType) {
            const errorText =
                frontendState.i18nClient.get.AppVerify.invalidLink || 'Invalid verification link.';
            return html`
                <${ViraError}>${errorText}</${ViraError}>
            `;
        }

        const errorMessage =
            state.verificationSubmission.settledValue instanceof Error
                ? extractErrorMessage(state.verificationSubmission.settledValue)
                : '';

        return codeFailureTemplates[codeType]({
            errorMessage,
            frontendState,
        });
    } else if (
        state.verificationSubmission.settledValue &&
        state.verificationSubmission.settledValue.ok
    ) {
        if (codeType === EmailCodeType.AccountVerification) {
            return html`
                <p class="success">${frontendState.i18nClient.get.AppVerify.emailVerified}</p>
                ${stateMatches(frontendState, {
                    hasUser: false,
                })
                    ? html`
                          <${AppSignIn.assign({
                              frontendState,
                              wipeUrlAfterLogin: true,
                          })}></${AppSignIn}>
                      `
                    : nothing}
            `;
        } else if (
            codeType === EmailCodeType.PasswordReset ||
            codeType === EmailCodeType.UserInvitation
        ) {
            return html`
                <${AppEnterResetPassword.assign({
                    emailCode: {
                        code,
                        codeId,
                        codeType,
                    },
                    frontendState,
                })}></${AppEnterResetPassword}>
            `;
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (codeType === EmailCodeType.ChangedEmailVerification) {
            return html`
                <p class="success">${frontendState.i18nClient.get.AppVerify.newEmailVerified}</p>
            `;
        } else {
            return html`
                <${ViraError}>
                    <p>${frontendState.i18nClient.get.AppVerify.unknownSuccess}</p>
                </${ViraError}>
            `;
        }
    } else {
        state.verificationSubmission.setValue(
            sendVerifyRequest(frontendState, {
                code,
                codeId,
                codeType,
                dispatch,
            }),
        );
        return html`
            <p class="submitting">${frontendState.i18nClient.get.AppVerify.verifying}</p>
        `;
    }
}

async function sendVerifyRequest(
    frontendState: Readonly<FrontendState>,
    {
        codeId,
        code,
        codeType,
        dispatch,
    }: {
        codeId: EmailCode['id'];
        code: string;
        codeType: EmailCodeType;
        dispatch: (event: Event) => void;
    },
) {
    /**
     * Await the user here so that any cookies or CSRF tokens set by the below `'/verify'` endpoint
     * call don't get wiped from the initial failed `'/user'` fetch.
     */
    await frontendState.user;

    const result = await frontendState.apiClient.endpoints['/verify'].fetch({
        requestData: {
            id: codeId,
            code,
            codeType,
        },
    });

    if (!result.ok) {
        throw new Error(result.data);
    }

    if (
        codeType === EmailCodeType.AccountVerification ||
        codeType === EmailCodeType.ChangedEmailVerification
    ) {
        try {
            if (codeType === EmailCodeType.AccountVerification) {
                await handleAuthResponse(result.response, csrfOptions);
            }
            const user = await loadUser(frontendState.apiClient);

            if (user) {
                dispatch(new UserEditEvent(user));
                dispatch(
                    new ChangeRouteEvent({
                        scrollToTop: true,
                        paths: frontendPathTree.paths.fullPaths,
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

const codeFailureTemplates: Record<
    EmailCodeType,
    (params: {errorMessage: string; frontendState: Readonly<FrontendState>}) => HTMLTemplateResult
> = {
    [EmailCodeType.UserInvitation]({frontendState}) {
        return html`
            <${ViraError}>${frontendState.i18nClient.get.AppVerify.invalidInvitation}</${ViraError}>
        `;
    },
    [EmailCodeType.AccountVerification]({frontendState}) {
        if (
            stateMatches(frontendState, {
                hasUser: true,
            }) &&
            frontendState.user.isVerified
        ) {
            return html`
                <${ViraError}>
                    ${frontendState.i18nClient.get.AppVerify.accountAlreadyVerifiedErrorMessage}
                </${ViraError}>
            `;
        }

        return html`
            <${ViraError}>
                <span>${frontendState.i18nClient.get.AppVerify.accountVerificationError}</span>
            </${ViraError}>
            <p class="error-wrapper">
                ${frontendState.i18nClient.get.AppVerify.accountVerificationSignIn}
                <br />
                ${frontendState.i18nClient.get.AppVerify.accountVerificationResend}
            </p>
            <${ViraLink.assign({
                route: {
                    route: {
                        paths: [],
                    },
                    router: frontendState.router,
                    scrollToTop: true,
                },
            })}>
                <${ViraButton.assign({
                    text: frontendState.i18nClient.get.AppSignIn.signInButton,
                })}></${ViraButton}>
            </${ViraLink}>
        `;
    },
    [EmailCodeType.ChangedEmailVerification]({errorMessage, frontendState}) {
        return html`
            <${ViraError}>
                <span>
                    ${frontendState.i18nClient.get.AppVerify.changedEmailVerificationError({
                        errorMessage:
                            errorMessage.trim() ||
                            frontendState.i18nClient.get.AppVerify.passwordResetError,
                    })}
                </span>
            </${ViraError}>
        `;
    },
    [EmailCodeType.PasswordReset]({frontendState}) {
        return html`
            <${ViraError}>
                <span>${frontendState.i18nClient.get.AppVerify.passwordResetError}</span>
            </${ViraError}>
        `;
    },
};
