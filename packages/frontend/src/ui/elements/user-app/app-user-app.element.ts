import {frontendPathTree} from '@evir/common';
import {css, html} from 'element-vir';
import {EmailSuccessType} from '../../../data/email-success-type.js';
import {stateMatches} from '../../../data/frontend-state/frontend-state-checks.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {defineAppElement} from '../common/define-app-element.js';
import {AppEmailSuccess} from '../verify-code/app-email-success.element.js';
import {AppUserNotApproved} from './app-user-not-approved.element.js';
import {AppInternalAdmin} from './internal-admin/app-internal-admin.element.js';
import {AppSettingsPage} from './settings/app-settings-page.element.js';

/** All user-logged-in required pages / elements are a child of this element. */
export const AppUserApp = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
}>()({
    tagName: 'app-user-app',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
        }
    `,
    render({inputs}) {
        if (!inputs.frontendState.user.isApproved) {
            return html`
                <${AppUserNotApproved.assign({
                    frontendState: inputs.frontendState,
                })}></${AppUserNotApproved}>
            `;
        } else if (!inputs.frontendState.user.isVerified) {
            return html`
                <${AppEmailSuccess.assign({
                    emailAddress: inputs.frontendState.user.emailAddress,
                    successType: EmailSuccessType.AccountCreated,
                    frontendState: inputs.frontendState,
                    emailSentJustNow: false,
                })}></${AppEmailSuccess}>
            `;
        }

        if (
            stateMatches(inputs.frontendState, {
                paths: frontendPathTree.paths.children.app.children.settings,
            })
        ) {
            return html`
                <${AppSettingsPage.assign({
                    frontendState: inputs.frontendState,
                })}></${AppSettingsPage}>
            `;
        } else if (
            stateMatches(inputs.frontendState, {
                paths: frontendPathTree.paths.children.app.children['internal-admin'],
            })
        ) {
            return html`
                <${AppInternalAdmin.assign({
                    frontendState: inputs.frontendState,
                })}></${AppInternalAdmin}>
            `;
        } else {
            return html`
                <p>Your app here!</p>
            `;
        }
    },
});
