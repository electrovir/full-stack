import {type SelectFrom} from '@augment-vir/common';
import {type UserResponse} from '@evir/common';
import {mockUserResponse} from '@evir/common/src/data/user-response.mock.js';
import {defineBookPage} from 'element-book';
import {html} from 'element-vir';
import {
    createMockFrontendStateElementState,
    renderWithMockFrontendState,
} from '../../../data/frontend-state/frontend-state.mock.js';
import {elementsBookPage} from '../design/top-level-book-pages.js';
import {AppUserHeader} from './app-user-header.element.js';

const examples: {
    title: string;
    user: SelectFrom<
        UserResponse,
        {
            isInternalAdmin: true;
        }
    >;
}[] = [
    {
        title: 'admin',
        user: {
            isInternalAdmin: true,
        },
    },
    {
        title: 'non-admin',
        user: {},
    },
];

export const appHeaderUserBookPage = defineBookPage({
    parent: elementsBookPage,
    title: AppUserHeader.tagName,
    defineExamples({defineExample}) {
        examples.forEach((example) => {
            defineExample({
                title: example.title,
                state() {
                    return createMockFrontendStateElementState<void, true>();
                },
                render({state}) {
                    return renderWithMockFrontendState(
                        {
                            test: 'app user header book page',
                            mockUser: {
                                ...mockUserResponse,
                                ...example.user,
                            },
                        },
                        state,
                        ({frontendState}) => {
                            return html`
                                <${AppUserHeader.assign({
                                    frontendState,
                                })}></${AppUserHeader}>
                            `;
                        },
                    );
                },
            });
        });
    },
});
