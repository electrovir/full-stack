import {css, html} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type FrontendState} from '../../../../../data/frontend-state/frontend-state.js';
import {contentWidthCss} from '../../../../styles/content-width.js';
import {appCssVars} from '../../../../styles/css-vars.js';
import {AppPage} from '../../../common/app-page.element.js';
import {defineAppElement} from '../../../common/define-app-element.js';
import {AppUserSettings} from './app-user-settings.element.js';

export const AppUserSettingsPage = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
}>()({
    tagName: 'app-user-settings-page',
    styles: css`
        :host {
            display: flex;
            max-width: 100%;
            box-sizing: border-box;
            padding: 0 4px;
        }

        h1 {
            ${noNativeSpacing};
        }

        ${AppPage} {
            display: flex;
            flex-direction: column;
            gap: ${appCssVars['app-page-padding'].value};
            ${contentWidthCss};
        }
    `,
    render({inputs}) {
        return html`
            <${AppPage}>
                <h1>
                    ${inputs.frontendState.i18nClient.get.AppUserSettingsPage.userSettingsHeader}
                </h1>
                <${AppUserSettings.assign({
                    frontendState: inputs.frontendState,
                })}></${AppUserSettings}>
            </${AppPage}>
        `;
    },
});
