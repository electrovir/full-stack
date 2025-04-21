import {frontendPathTree} from '@evir/common';
import {type PendingFrontendState} from '@evir/frontend/src/data/frontend-state/frontend-state.js';
import {css, defineElement, html, listen, nothing, renderIf} from 'element-vir';
import {parseEmailAddress} from 'parse-email-address';
import {noNativeSpacing, ViraButton, ViraButtonStyle, ViraLink} from 'vira';
import {LogOutEvent} from '../../events/log-out.event.js';
import {contentWidthCss} from '../../styles/styles.js';
import {AppLogo, LogoTone} from './app-logo.element.js';

enum UserButtonState {
    SignIn = 'sign-in',
    GoToApp = 'go-to-app',
    LogOut = 'log-out',
    SigningIn = 'signing-in',
}

const userButtonStateText: Record<UserButtonState, string> = {
    [UserButtonState.GoToApp]: 'Go to App',
    [UserButtonState.LogOut]: 'Log out',
    [UserButtonState.SignIn]: 'Sign in',
    [UserButtonState.SigningIn]: '',
};

export const AppHeader = defineElement<
    Readonly<Pick<PendingFrontendState, 'user' | 'currentRoute' | 'router'>>
>()({
    tagName: 'app-header',
    styles: css`
        :host {
            display: block;
        }

        nav {
            ${contentWidthCss}
            overflow: hidden;
            position: relative;
            display: flex;
            justify-content: flex-end;
            align-items: center;
            padding: 12px;
            gap: 16px;
        }

        header {
            display: flex;
            justify-content: center;
            background-color: rgba(255, 255, 255, 0.4);
        }

        p {
            ${noNativeSpacing};
        }

        nav > * {
            flex-shrink: 0;
            white-space: nowrap;
        }

        ${AppLogo} {
            height: 80px;
        }
    `,
    render({inputs, dispatch}) {
        const user =
            inputs.user.settledValue && !(inputs.user.settledValue instanceof Error)
                ? inputs.user.settledValue
                : undefined;

        const userButtonState = user
            ? inputs.currentRoute.paths[0] === frontendPathTree.paths.children.app.path
                ? UserButtonState.LogOut
                : UserButtonState.GoToApp
            : inputs.currentRoute.paths[0] === frontendPathTree.paths.children.app.path
              ? UserButtonState.SigningIn
              : UserButtonState.SignIn;

        const userButtonText = userButtonStateText[userButtonState];

        const userButtonPaths =
            userButtonText && userButtonState !== UserButtonState.LogOut
                ? frontendPathTree.paths.children.app.fullPaths
                : undefined;

        const userButtonTemplate = userButtonText
            ? html`
                  <${ViraButton.assign({
                      text: userButtonText,
                      buttonStyle:
                          userButtonState === UserButtonState.LogOut
                              ? ViraButtonStyle.Outline
                              : ViraButtonStyle.Default,
                  })}
                      ${listen('click', () => {
                          if (userButtonPaths) {
                              /** Let the link handle the routing. */
                              return;
                          } else if (userButtonState === UserButtonState.LogOut) {
                              dispatch(new LogOutEvent());
                              window.scrollTo({
                                  behavior: 'smooth',
                                  left: 0,
                                  top: 0,
                              });
                          }
                      })}
                  ></${ViraButton}>
              `
            : undefined;

        const userButtonLinkTemplate =
            userButtonTemplate && userButtonPaths
                ? html`
                      <${ViraLink.assign({
                          route: {
                              router: inputs.router,
                              route: {
                                  paths: userButtonPaths,
                              },
                              scrollToTop: true,
                          },
                      })}>
                          ${userButtonTemplate}
                      </${ViraLink}>
                  `
                : userButtonTemplate;

        const firstName = (user && parseEmailAddress(user.emailAddress)?.user) || undefined;

        return html`
            <header>
                <${ViraLink.assign({
                    route: {
                        route: {
                            paths: [],
                        },
                        router: inputs.router,
                        scrollToTop: true,
                    },
                    aria: {
                        label: 'logo link to home page',
                    },
                })}>
                    <${AppLogo.assign({
                        tone: LogoTone.color,
                    })}></${AppLogo}>
                </${ViraLink}>
                <nav>
                    ${renderIf(
                        !!firstName,
                        html`
                            <p>Welcome ${firstName}</p>
                        `,
                    )}
                    ${userButtonLinkTemplate || nothing}
                </nav>
            </header>
        `;
    },
});
