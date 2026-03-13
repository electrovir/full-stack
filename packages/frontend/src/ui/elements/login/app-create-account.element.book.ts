/* eslint-disable sonarjs/no-hardcoded-passwords */

import {assert} from '@augment-vir/assert';
import {defineBookPage} from 'element-book';
import {html, onDomCreated} from 'element-vir';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppCreateAccount} from './app-create-account.element.js';

export const appCreateAccountBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppCreateAccount.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'simple',
            render({controls}) {
                return html`
                    <${AppCreateAccount.assign(controls)}></${AppCreateAccount}>
                `;
            },
        });
        defineExample({
            title: 'Invalid email',
            render({controls}) {
                return html`
                    <${AppCreateAccount.assign(controls)}
                        ${onDomCreated((element) => {
                            assert.instanceOf(element, AppCreateAccount);

                            element.instanceState.errors = {
                                email: 'Invalid email address.',
                            };
                        })}
                    ></${AppCreateAccount}>
                `;
            },
        });
        defineExample({
            title: 'Invalid password',
            render({controls}) {
                return html`
                    <${AppCreateAccount.assign(controls)}
                        ${onDomCreated((element) => {
                            assert.instanceOf(element, AppCreateAccount);

                            element.instanceState.errors = {
                                password: 'Password too short.',
                            };
                        })}
                    ></${AppCreateAccount}>
                `;
            },
        });
        defineExample({
            title: 'Invalid email and password',
            render({controls}) {
                return html`
                    <${AppCreateAccount.assign(controls)}
                        ${onDomCreated((element) => {
                            assert.instanceOf(element, AppCreateAccount);

                            element.instanceState.errors = {
                                password: 'Password too short.',
                                email: 'Invalid email address.',
                            };
                        })}
                    ></${AppCreateAccount}>
                `;
            },
        });
    },
});
