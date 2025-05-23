import {assert} from '@augment-vir/assert';
import {defineBookPage} from 'element-book';
import {html, onDomCreated} from 'element-vir';
import {elementsPage} from '../design/top-level-pages.js';
import {AppCreateAccount, knownAccountCreationErrors} from './app-create-account.element.js';

export const appCreateAccountBookPage = defineBookPage({
    parent: elementsPage,
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
                                email: knownAccountCreationErrors.invalidEmail,
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
                                password: knownAccountCreationErrors.passwordShort,
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
                                password: knownAccountCreationErrors.passwordShort,
                                email: knownAccountCreationErrors.invalidEmail,
                            };
                        })}
                    ></${AppCreateAccount}>
                `;
            },
        });
    },
});
