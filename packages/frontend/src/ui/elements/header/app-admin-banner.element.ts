import {colorCss} from '@electrovir/color';
import {css, html, listen, nothing, resolvedAsyncValue} from 'element-vir';
import {noNativeFormStyles, viraTheme} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {defineAppElement} from '../common/define-app-element.js';

/** For banner messages that should _not_ be user facing. */
export const AppAdminBanner = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-admin-banner',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            position: sticky;
            top: 0;
            z-index: 100000;
            width: 100%;
        }

        .banner {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 2px;
            ${colorCss(viraTheme.colors['vira-red-on-self-body'])}
        }

        button {
            ${noNativeFormStyles};
            text-decoration: underline;
            cursor: pointer;
        }
    `,
    render({inputs}) {
        const user = resolvedAsyncValue(inputs.frontendState.user);

        if (!user?.isAssumed) {
            return nothing;
        }

        return html`
            <div class="banner">
                <span>Assumed the role of ${user.humanName.trim() || user.emailAddress}.</span>
                <button
                    ${listen('click', async () => {
                        await inputs.frontendState.frontendAuthClient.assumeUser(undefined);

                        window.location.reload();
                    })}
                >
                    Click here to exit.
                </button>
            </div>
        `;
    },
});
