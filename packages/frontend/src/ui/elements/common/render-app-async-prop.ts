import {combineErrorMessages, type PartialWithUndefined} from '@augment-vir/common';
import {type AsyncProp, html, type HtmlInterpolation, renderAsync} from 'element-vir';
import {ViraError} from 'vira';
import {AppLoader} from './app-loader.element.js';

export function renderAppAsyncProp<T>(
    asyncProp: AsyncProp<T, any>,
    {
        onSuccess,
        customLoadingTemplate,
        errorMessage,
    }: {
        onSuccess: (value: T) => HtmlInterpolation;
        errorMessage: string;
    } & PartialWithUndefined<{
        customLoadingTemplate: HtmlInterpolation;
    }>,
): HtmlInterpolation {
    return renderAsync(
        asyncProp,
        customLoadingTemplate ??
            html`
                <${AppLoader}></${AppLoader}>
            `,
        onSuccess,
        (value) => {
            return html`
                <${ViraError}>${combineErrorMessages(errorMessage, value)}</${ViraError}>
            `;
        },
    );
}
