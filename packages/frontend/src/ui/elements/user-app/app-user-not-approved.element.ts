import {css, html} from 'element-vir';
import {LoaderAnimated24Icon, noNativeSpacing, ViraIcon} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appFont} from '../../styles/font.js';
import {AppPage} from '../common/app-page.element.js';
import {defineAppElement} from '../common/define-app-element.js';

export const AppUserNotApproved = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-user-not-approved',
    styles: css`
        .contents {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 24px;
            ${appFont.largeBody}
        }

        p {
            ${noNativeSpacing}
        }
    `,
    render({inputs}) {
        return html`
            <${AppPage}>
                <div class="contents">
                    <p class="message">
                        ${inputs.frontendState.i18nClient.get.AppUserNotApproved
                            .pendingApprovalMessage}
                    </p>
                    <${ViraIcon.assign({
                        icon: LoaderAnimated24Icon,
                    })}></${ViraIcon}>
                </div>
            </${AppPage}>
        `;
    },
});
