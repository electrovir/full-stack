import {html, unsafeCSS, type HTMLTemplateResult} from 'element-vir';

export enum HeaderLevel {
    H1 = 'h1',
    H2 = 'h2',
    H3 = 'h3',
    H4 = 'h4',
    H5 = 'h5',
    H6 = 'h6',
}

export const leveledHeaderClassName = unsafeCSS('leveled-header');

export function createHeaderTemplate(
    headerLevel: HeaderLevel,
    content: string | HTMLTemplateResult,
) {
    if (headerLevel === HeaderLevel.H1) {
        return html`
            <h1 class=${leveledHeaderClassName}>${content}</h1>
        `;
    } else if (headerLevel === HeaderLevel.H2) {
        return html`
            <h2 class=${leveledHeaderClassName}>${content}</h2>
        `;
    } else if (headerLevel === HeaderLevel.H3) {
        return html`
            <h3 class=${leveledHeaderClassName}>${content}</h3>
        `;
    } else if (headerLevel === HeaderLevel.H4) {
        return html`
            <h4 class=${leveledHeaderClassName}>${content}</h4>
        `;
    } else if (headerLevel === HeaderLevel.H5) {
        return html`
            <h5 class=${leveledHeaderClassName}>${content}</h5>
        `;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (headerLevel === HeaderLevel.H6) {
        return html`
            <h6 class=${leveledHeaderClassName}>${content}</h6>
        `;
    } else {
        throw new Error(`Invalid header level: ${headerLevel as string}`);
    }
}
