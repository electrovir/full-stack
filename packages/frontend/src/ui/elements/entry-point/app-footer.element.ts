import {css, defineElementNoInputs, html} from 'element-vir';
import {AppLogo, LogoTone} from './app-logo.element.js';

export const AppFooter = defineElementNoInputs({
    tagName: 'app-footer',
    styles: css`
        :host {
            display: block;
        }

        footer {
            background-color: black;
            color: white;
            padding: 16px;
            display: flex;
            justify-content: center;
        }

        footer .content > * + * {
            margin-top: 16px;
        }

        .footer-columns {
            display: flex;
            gap: 32px;
        }
        .footer-column {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }
        .footer-column a {
            color: inherit;
        }

        footer p {
            font-size: 12px;
        }

        ${AppLogo} {
            height: 80px;
        }
    `,
    render() {
        return html`
            <footer>
                <div class="content">
                    <${AppLogo.assign({
                        tone: LogoTone.mono,
                    })}></${AppLogo}>
                    <div class="footer-columns">
                        <div class="footer-column">
                            <b>Help</b>
                            <a href="#">Contact Us</a>
                        </div>
                        <div class="footer-column">
                            <b>Legal</b>
                            <a href="#">Privacy Policy</a>
                            <a href="#">Terms of Service</a>
                        </div>
                    </div>
                    <p>© electrovir 2025</p>
                </div>
            </footer>
        `;
    },
});
