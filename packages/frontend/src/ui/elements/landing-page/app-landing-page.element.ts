import {frontendPathTree, type FrontendRouter} from '@evir/common';
import {css, defineElement, html} from 'element-vir';
import {noNativeSpacing, ViraButton, ViraLink} from 'vira';
import {contentWidth} from '../../styles/styles.js';
import {AppLogo, LogoTone} from '../entry-point/app-logo.element.js';

export const AppLandingPage = defineElement<{router: FrontendRouter}>()({
    tagName: 'app-landing-page',
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            max-width: 100%;
            position: relative;
            container-type: inline-size;
            box-sizing: border-box;
        }

        section + section {
            margin-top: 100px;
        }

        section {
            display: flex;
            justify-content: center;
        }
        p {
            ${noNativeSpacing};
            font-size: 24px;
        }

        h1 {
            font-size: 60px;
            ${noNativeSpacing};
        }

        .content {
            max-width: 100%;
            box-sizing: border-box;
            overflow: hidden;
            width: ${contentWidth}px;
        }

        .column-text {
            width: 550px;
            max-width: 100%;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .top-content {
            display: flex;
            align-items: flex-start;
            justify-content: center;
            flex-wrap: wrap;
            column-gap: 60px;
            row-gap: 16px;
        }

        h1 {
            font-size: 32px;
        }

        p,
        h1 {
            ${noNativeSpacing};
        }

        .main-cta {
            width: 100%;
            margin-top: 8px;
            font-size: 24px;
        }

        ${AppLogo} {
            height: 300px;
        }

        @container (max-width: ${contentWidth - 400}px) {
            h1 {
                font-size: 32px;
            }

            p {
                font-size: 20px;
            }

            header {
                margin-bottom: 32px;
            }

            section + section {
                margin-top: 16px;
            }

            .top-content {
                margin-bottom: 16px;
                align-items: center;
                flex-direction: column;
            }

            .content {
                padding: 0 8px;
            }
        }
    `,
    render({inputs}) {
        return html`
            <section>
                <div class="content top-content column-text">
                    <h1>App</h1>
                    <p>This app does stuff!</p>
                    <${ViraLink.assign({
                        route: {
                            router: inputs.router,
                            route: {
                                paths: frontendPathTree.paths.children.app.fullPaths,
                            },
                        },
                    })}>
                        <${ViraButton.assign({
                            text: 'Get started',
                        })}
                            class="main-cta"
                        ></${ViraButton}>
                    </${ViraLink}>
                </div>
                <${AppLogo.assign({
                    tone: LogoTone.color,
                })}></${AppLogo}>
            </section>
        `;
    },
});
