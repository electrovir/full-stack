import {LocalStorageClient} from '@electrovir/local-storage-client';
import {defineShape, enumShape} from 'object-shape-tester';
import {UserThemeSelection} from '../../user-theme-selection.js';

export const localStorageShapes = {
    devDbCache: defineShape(''),
    themeSelection: enumShape(UserThemeSelection),
    /** The team ID that the user currently has selected. If not set, defaults to the latest team. */
    selectedTeamId: defineShape(''),
} as const;

export function createLocalStorageClient() {
    return new LocalStorageClient(localStorageShapes);
}

export type AppLocalStorageClient = ReturnType<typeof createLocalStorageClient>;
