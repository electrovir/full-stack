import {css, defineElement, html} from 'element-vir';

export enum EmailSuccessType {
    UserCreated = 'user-created',
    PasswordReset = 'password-reset',
    NewEmailVerification = 'new-email-verification',
}

const emailSuccessStrings: Record<EmailSuccessType, string> = {
    [EmailSuccessType.UserCreated]: 'Account created! Please check your email:',
    [EmailSuccessType.PasswordReset]: 'Password reset emailed. Please check your email:',
    [EmailSuccessType.NewEmailVerification]: 'Email verification sent. Please check your email:',
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
            font-size: 1.3em;
            color: #00616b;
        }
    `,
    render({inputs}) {
        return html`
            <p class="success">
                ${emailSuccessStrings[inputs.successType]}
                <br />
                ${inputs.emailAddress}
            </p>
        `;
    },
});
