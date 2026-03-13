import {defineBookPage} from 'element-book';
import {css, html} from 'element-vir';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppLogo} from './app-logo.element.js';

export const appLogoBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppLogo.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'color',
            render() {
                return html`
                    <${AppLogo}></${AppLogo}>
                `;
            },
        });
        defineExample({
            title: 'monochrome',
            styles: css`
                :host {
                    background-color: #333;
                }
            `,
            render() {
                return html`
                    <${AppLogo.assign({
                        useMonochrome: true,
                    })}></${AppLogo}>
                `;
            },
        });
    },
});
