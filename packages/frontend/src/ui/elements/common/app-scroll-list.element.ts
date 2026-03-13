import {check} from '@augment-vir/assert';
import {
    combineErrorMessages,
    filterMap,
    match,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {colorCss} from '@electrovir/color';
import {
    classMap,
    css,
    defineElementEvent,
    html,
    listen,
    nothing,
    resolvedAsyncValue,
    testId,
    type AsyncValue,
    type HTMLTemplateResult,
} from 'element-vir';
import {
    LoaderAnimated24Icon,
    noNativeFormStyles,
    ViraButton,
    ViraColorVariant,
    ViraError,
    ViraIcon,
    ViraInput,
    ViraSelect,
    type ViraSelectOption,
} from 'vira';
import {type FrontendState} from '../../../data/frontend-state/frontend-state.js';
import {appColors} from '../../styles/color-theme.js';
import {defineAppElement} from './define-app-element.js';

export type ScrollListOptionSubLabel = {
    subLabel: string;
    omitFromSearch?: boolean | undefined;
};

export type ScrollListOption = {
    value: string;
    label: string;
} & PartialWithUndefined<{
    omitFromSearch: boolean;
    subLabels: ReadonlyArray<Readonly<ScrollListOptionSubLabel>>;
}>;

export const AppScrollList = defineAppElement<
    {
        frontendState: Readonly<FrontendState>;
        selectedValue: undefined | string;
        options: AsyncValue<ReadonlyArray<Readonly<ScrollListOption>>>;
    } & PartialWithUndefined<{
        filterOptions: ReadonlyArray<Readonly<ViraSelectOption>>;
        filterValue: string;
        topButton: {
            text: string;
            disabled?: boolean | undefined;
        };
    }>
>()({
    tagName: 'app-scroll-list',
    testIds: [
        'optionCard',
    ],
    styles: css`
        :host {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 4px;
            max-height: 100%;
            max-width: 100%;
        }

        ${ViraInput}, ${ViraSelect} {
            width: unset;
        }

        button {
            ${noNativeFormStyles}
            cursor: pointer;
            text-align: left;
        }

        .no-results {
            ${colorCss(appColors.colors['app-body-secondary'])}
        }

        .non-list {
            display: flex;
            justify-content: center;
            text-align: center;
        }

        .option-list {
            border: 1px solid ${appColors.colors['app-divider-secondary'].foreground.value};
            display: flex;
            flex-direction: column;
            align-items: stretch;
            overflow-y: auto;
            overscroll-behavior: contain;

            & .option-card-wrapper {
                display: flex;
                flex-direction: column;
            }

            & .option-card {
                padding: 2px 8px 8px;
                align-items: stretch;
                display: flex;
                flex-direction: column;
                ${colorCss(appColors.colors['app-body-primary'])}

                & * {
                    text-overflow: ellipsis;
                    overflow: hidden;
                    white-space: nowrap;
                }

                & .sub-label {
                    padding-left: 16px;
                    ${colorCss(appColors.colors['app-body-secondary'])}
                }

                &.selected-option {
                    ${colorCss(appColors.colors['app-tab-selected'])}
                    pointer-events: none;

                    & > * {
                        ${colorCss(appColors.colors['app-tab-selected'])}
                    }
                }

                & .match {
                    background-color: ${appColors.colors['app-search-result'].background.value};
                }
            }
        }

        @media (hover: hover) and (pointer: fine) {
            .option-list .option-card:hover:not(:active) {
                background-color: ${appColors.colors['app-table-row-hover'].background.value};

                & > * {
                    background-color: ${appColors.colors['app-table-row-hover'].background.value};
                }
            }
        }
    `,
    events: {
        valueChange: defineElementEvent<string | undefined>(),
        filterValueChange: defineElementEvent<string>(),
        topButtonClick: defineElementEvent<void>(),
    },
    state() {
        return {
            currentSearch: '',
        };
    },
    render({inputs, state, updateState, dispatch, events, testIds}) {
        let currentValueExists: boolean = false as boolean;

        const optionCards: Error | Promise<unknown> | HTMLTemplateResult[] =
            inputs.options instanceof Promise || inputs.options instanceof Error
                ? inputs.options
                : filterMap(
                      inputs.options,
                      (option) => {
                          const isSelected = option.value === inputs.selectedValue;
                          if (isSelected) {
                              currentValueExists = true;
                          }

                          const isSearching: boolean = !!state.currentSearch;

                          const optionMatchesSearch: boolean =
                              !option.omitFromSearch &&
                              isSearching &&
                              match(option.label, state.currentSearch);

                          const subLabelTemplates = filterMap(
                              option.subLabels || [],
                              ({subLabel, omitFromSearch}) => {
                                  const subLabelMatchesSearch: boolean =
                                      !omitFromSearch &&
                                      isSearching &&
                                      match(subLabel, state.currentSearch);

                                  if (
                                      state.currentSearch &&
                                      !subLabelMatchesSearch &&
                                      !optionMatchesSearch
                                  ) {
                                      return undefined;
                                  }

                                  return html`
                                      <span
                                          class="sub-label ${classMap({
                                              match: subLabelMatchesSearch,
                                          })}"
                                      >
                                          ${subLabel}
                                      </span>
                                  `;
                              },
                              check.isTruthy,
                          );

                          if (isSearching && !subLabelTemplates.length && !optionMatchesSearch) {
                              return undefined;
                          }

                          const subLabelsForTitle = (option.subLabels || []).map(
                              ({subLabel}) => subLabel,
                          );
                          const fullTitle = [
                              option.label,
                              ...subLabelsForTitle,
                          ].join('\n');

                          return html`
                              <div class="option-card-wrapper" title=${fullTitle}>
                                  <button
                                      class="option-card ${classMap({
                                          'selected-option': isSelected,
                                      })}"
                                      ${listen('mousedown', () => {
                                          dispatch(new events.valueChange(option.value));
                                      })}
                                      ${testId(testIds.optionCard)}
                                  >
                                      <b
                                          class=${classMap({
                                              match: optionMatchesSearch,
                                          })}
                                      >
                                          ${option.label}
                                      </b>
                                      ${subLabelTemplates}
                                  </button>
                              </div>
                          `;
                      },
                      check.isTruthy,
                  );

        if (
            check.isArray(optionCards) &&
            inputs.selectedValue != undefined &&
            !currentValueExists
        ) {
            /** If the selected value is not found, wipe that selection. */
            dispatch(new events.valueChange(undefined));
        }

        const filterTemplate = inputs.filterOptions?.length
            ? html`
                  <${ViraSelect.assign({
                      value: inputs.filterValue,
                      options: inputs.filterOptions,
                  })}
                      ${listen(ViraSelect.events.valueChange, (event) => {
                          dispatch(new events.filterValueChange(event.detail));
                      })}
                  ></${ViraSelect}>
              `
            : nothing;

        const topButtonTemplate = inputs.topButton
            ? html`
                  <${ViraButton.assign({
                      colorVariant: ViraColorVariant.Neutral,
                      text: inputs.topButton.text,
                      isDisabled: inputs.topButton.disabled,
                  })}
                      ${listen('click', () => {
                          dispatch(new events.topButtonClick());
                      })}
                  ></${ViraButton}>
              `
            : nothing;

        const shouldShowSearch = (resolvedAsyncValue(inputs.options)?.length || 0) > 1;
        const searchTemplate = shouldShowSearch
            ? html`
                  <${ViraInput.assign({
                      value: state.currentSearch,
                      placeholder: inputs.frontendState.i18nClient.get.AppScrollList.searchLabel,
                  })}
                      ${listen(ViraInput.events.valueChange, (event) => {
                          updateState({
                              currentSearch: event.detail,
                          });
                      })}
                  ></${ViraInput}>
              `
            : nothing;

        const controlsTemplate = html`
            ${topButtonTemplate} ${filterTemplate} ${searchTemplate}
        `;

        const listTemplate =
            optionCards instanceof Promise
                ? html`
                      <div class="non-list">
                          <${ViraIcon.assign({
                              icon: LoaderAnimated24Icon,
                          })}></${ViraIcon}>
                      </div>
                  `
                : optionCards instanceof Error
                  ? html`
                        <div class="non-list">
                            <${ViraError}>
                                ${combineErrorMessages(
                                    inputs.frontendState.i18nClient.get.AppScrollList
                                        .failedToLoadOptions,
                                    optionCards,
                                )}
                            </${ViraError}>
                        </div>
                    `
                  : optionCards.length
                    ? html`
                          <section class="option-list">${optionCards}</section>
                      `
                    : html`
                          <div class="non-list no-results">
                              ${inputs.frontendState.i18nClient.get.AppScrollList.noResults}
                          </div>
                      `;

        return html`
            ${controlsTemplate} ${listTemplate}
        `;
    },
});
