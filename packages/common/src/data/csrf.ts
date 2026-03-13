import {resolveCsrfHeaderName, type CsrfHeaderNameOption} from 'auth-vir';

export const csrfOptions: CsrfHeaderNameOption = {
    csrfHeaderPrefix: 'vir',
};

export const csrfHeaderName = resolveCsrfHeaderName(csrfOptions);
