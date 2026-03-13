import {colorCss} from '@electrovir/color';
import {css, html} from 'element-vir';
import {noNativeSpacing} from 'vira';
import {stateMatches} from '../../../data/frontend-state/frontend-state-checks.js';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../styles/color-theme.js';
import {appFont} from '../../styles/font.js';
import {AppLogo} from '../common/app-logo.element.js';
import {defineAppElement} from '../common/define-app-element.js';

export const AppFooter = defineAppElement<{frontendState: Readonly<FrontendState>}>()({
    tagName: 'app-footer',
    styles: css`
        :host {
            display: block;
        }

        p {
            ${appFont.smallBody}
            ${noNativeSpacing}
            text-align: center;
        }

        footer {
            ${colorCss(appColors.colors['app-footer'])}
            padding: 16px;
            display: flex;
            justify-content: center;

            & .content {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;

                & ${AppLogo} {
                    align-self: center;
                    height: 32px;
                    height: 80px;
                }
            }

            & .footer-columns {
                display: flex;
                gap: 32px;

                & .footer-column {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;

                    & a {
                        color: inherit;
                    }
                }
            }
        }
    `,
    render({inputs}) {
        const supportEmails =
            inputs.frontendState.frontendEnvClient.universalConfig.byEnv.supportEmail;

        const contactEmail = stateMatches(inputs.frontendState, {
            hasUser: true,
        })
            ? supportEmails.support
            : supportEmails.hello;

        return html`
            <footer>
                <div class="content">
                    <${AppLogo.assign({
                        useMonochrome: true,
                    })}></${AppLogo}>
                    <div class="footer-columns">
                        <div class="footer-column">
                            <a href="mailto:${contactEmail}">
                                ${inputs.frontendState.i18nClient.get.AppFooter.contactUsLink}
                            </a>
                        </div>
                    </div>
                    <p>
                        ©
                        ${inputs.frontendState.frontendEnvClient.universalConfig
                            .companyFullLegalName}
                        ${new Date().getFullYear()}
                    </p>
                </div>
            </footer>
        `;
    },
});
