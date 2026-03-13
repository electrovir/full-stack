import {css, html} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {type FrontendState} from '../../../../../data/frontend-state/frontend-state.js';
import {appFont} from '../../../../styles/font.js';
import {defineAppElement} from '../../../common/define-app-element.js';
import {AppUserSignInSettings} from './app-user-sign-in-settings.element.js';

export const AppUserSettings = defineAppElement<{
    frontendState: Readonly<FrontendState<void, true>>;
}>()({
    tagName: 'app-user-settings',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        h2 {
            ${appFont.h2}
            ${noNativeSpacing};
        }

        section {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding: 16px;
        }
    `,
    render({inputs}) {
        return html`
            <section>
                <h2>${inputs.frontendState.i18nClient.get.AppUserSettings.signInSettingsHeader}</h2>
                <${AppUserSignInSettings.assign({
                    frontendState: inputs.frontendState,
                })}></${AppUserSignInSettings}>
            </section>
        `;
    },
});
