import {frontendPathTree} from '@evir/common';
import {css, html, listen} from 'element-vir';
import {noNativeSpacing, ViraButton} from 'vira';
import {stateMatches} from '../../../data/frontend-state/frontend-state-checks.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {AppPage} from '../common/app-page.element.js';
import {defineAppElement} from '../common/define-app-element.js';

export const AppMarketingPage = defineAppElement<{
    frontendState: Readonly<FrontendState>;
}>()({
    tagName: 'app-marketing-page',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        .greeting {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
            width: 400px;
            max-width: 100%;
        }

        h1,
        p {
            ${noNativeSpacing}
        }

        .go-to-app {
            margin-top: 16px;
        }
    `,
    render({inputs}) {
        return html`
            <${AppPage}>
                <div class="greeting">
                    <h1>
                        ${inputs.frontendState.frontendEnvClient.universalConfig.companyProperName}
                    </h1>
                    <p>${inputs.frontendState.i18nClient.get.AppMarketingPage.welcome}</p>

                    <${ViraButton.assign({
                        text: stateMatches(inputs.frontendState, {
                            hasUser: true,
                        })
                            ? inputs.frontendState.i18nClient.get.AppMarketingPage.goToApp
                            : inputs.frontendState.i18nClient.get.AppMarketingPage.signIn,
                    })}
                        class="go-to-app"
                        ${listen('click', () => {
                            inputs.frontendState.router.setRoute({
                                paths: frontendPathTree.paths.children.app.fullPaths,
                            });
                        })}
                    ></${ViraButton}>
                </div>
            </${AppPage}>
        `;
    },
});
