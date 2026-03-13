import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {
    createMockFrontendStateElementState,
    renderWithMockFrontendState,
} from '../../../data/frontend-state/frontend-state.mock.js';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppSignIn} from './app-sign-in.element.js';

export const appSignInBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppSignIn.tagName,
    defineExamples({defineExample}) {
        defineExample({
            title: 'basic',
            state() {
                return createMockFrontendStateElementState<void, false>();
            },
            render({state}) {
                return renderWithMockFrontendState(
                    {
                        test: 'sign in book page',
                    },
                    state,
                    ({frontendState}) => {
                        return html`
                            <${AppSignIn.assign({
                                frontendState,
                                wipeUrlAfterLogin: false,
                            })}></${AppSignIn}>
                        `;
                    },
                );
            },
        });
    },
});
