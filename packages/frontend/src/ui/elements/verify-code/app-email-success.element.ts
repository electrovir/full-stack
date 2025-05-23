import {css, defineElement, html, nothing} from 'element-vir';
import {type RequireAtLeastOne} from 'type-fest';

export enum EmailSuccessType {
    UserCreated = 'user-created',
    PasswordReset = 'password-reset',
    ChangeEmail = 'change-email',
}

const emailSuccessStrings: Record<
    EmailSuccessType,
    RequireAtLeastOne<{title: string; subtitle: string}>
> = {
    [EmailSuccessType.UserCreated]: {
        title: 'Account created!',
        subtitle: 'Please verify your email to continue. You will receive a link at:',
    },
    [EmailSuccessType.PasswordReset]: {
        subtitle:
            'If your info matches a valid account, you will receive a password reset link to your email:',
    },
    [EmailSuccessType.ChangeEmail]: {
        title: 'Email change submitted!',
    },
};

export const AppEmailSuccess = defineElement<{
    emailAddress: string;
    successType: EmailSuccessType;
}>()({
    tagName: 'app-email-success',
    styles: css`
        :host {
            display: block;

            text-align: center;
        }

        .title {
            color: #00616b;
            font-size: 1.3em;
        }
    `,
    render({inputs}) {
        const messages = emailSuccessStrings[inputs.successType];

        const titleTemplate = messages.title
            ? html`
                  <p class="title">${messages.title}</p>
              `
            : nothing;

        const subtitle = messages.subtitle || 'You will receive a verification link at:';

        return html`
            ${titleTemplate}
            <p>
                ${subtitle}
                <br />
                <br />
                <b>${inputs.emailAddress}</b>
            </p>
        `;
    },
});
