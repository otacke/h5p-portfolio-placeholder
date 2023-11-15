import InstanceWrapper from '@models/instance-wrapper.js';
import Util from '@services/util.js';
import API from '@mixins/api.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';
import '@styles/h5p-portfolio-placeholder.scss';

export default class PortfolioPlaceholder extends H5P.EventDispatcher {
  /**
   * @class
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    Util.addMixins(
      PortfolioPlaceholder, [API, QuestionTypeContract, XAPI]
    );

    // Sanitize parameters
    this.params = Util.extend(
      {
        placeholder: {
          arrangement: '1',
          fields: []
        }
      }, params);

    // Sanitize image height limit
    this.params.placeholder.imageHeightLimit = this.sanitizeImageHeightLimit(
      this.params.placeholder.imageHeightLimit
    );

    // Sanitize grow proportion
    this.params.placeholder.fields = this.params.placeholder.fields
      .map((field) => {
        field.width = field.width ?? 100;
        field.verticalAlignment = field.verticalAlignment ?? 'top';
        return field;
      });

    this.params = this.params.placeholder;

    this.contentId = contentId;
    this.extras = extras;

    this.previousState = extras?.previousState || {};

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    // Sanitize field parameters
    const numberOfFields = this.params.arrangement
      .split('-')
      .reduce((sum, summand) => sum + parseInt(summand), 0);

    this.params.fields = this.params.fields.slice(0, numberOfFields);
    while (this.params.fields.length < numberOfFields) {
      this.params.fields.push({});
    }

    // Build fields
    this.fields = this.buildFields({
      fields: this.params.fields,
      previousStates: this.previousState.children || [],
      arrangement: this.params.arrangement
    });

    // Some other content types might use this information
    this.isTask = this.fields.some(
      (field) => field.instanceWrapper.isTask()
    );

    // Expect parent to set activity started when parent is shown
    if (typeof this.isRoot === 'function' && this.isRoot()) {
      this.setActivityStarted();
    }
  }

  /**
   * Attach library to wrapper.
   * @param {H5P.jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-portfolio-placeholder');
    $wrapper.get(0).appendChild(this.buildDOM());

    // Make sure DOM has been rendered with content
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.trigger('resize');
      });
    });
  }

  /**
   * Build fields including DOM and H5P instances.
   * @param {object} params Parameters.
   * @param {object[]} params.fields Field parameters.
   * @param {object[]} params.previousStates Previous states.
   * @param {string} params.arrangement Layout arrangement.
   * @returns {object[]} Fields including DOM and instance.
   */
  buildFields(params = {}) {
    const fields = (params.fields || []).map((field, index) => {
      const dom = this.buildContentWrapper();

      const previousState = params?.previousStates.length > index ?
        params.previousStates[index] :
        {};

      const instanceWrapper = new InstanceWrapper(
        {
          index: index,
          field: field,
          contentId: this.contentId,
          dom: dom,
          parentInstance: this,
          previousState: previousState,
          imageHeightLimit: this.params.imageHeightLimit
        },
        {
          onXAPI: (event, index) => {
            this.trackScoring(event, index);
          }
        }
      );

      return {
        dom: dom,
        instanceWrapper: instanceWrapper,
        isDone: !instanceWrapper.isTask(),
        verticalAlignment: field.verticalAlignment,
        width: field.width
      };
    });

    return fields;
  }

  /**
   * Build DOM.
   * @returns {HTMLElement} Content DOM.
   */
  buildDOM() {
    const contents = document.createElement('div');
    contents.classList.add('h5p-portfolio-placeholder-contents');
    if (this.params.colorBackground !== 'rgba(0, 0, 0, 0)') {
      contents.style.backgroundColor = this.params.colorBackground;
    }

    let index = 0;
    const rowsToBuild = this.params.arrangement.split('-');
    rowsToBuild.forEach((rowCount) => {
      const fieldsToBuild = this.fields
        .slice(index, index + parseInt(rowCount));

      contents.appendChild(this.buildContentRow({ fields: fieldsToBuild }));

      index += parseInt(rowCount);
    });

    return contents;
  }

  /**
   * Build content row.
   * @param {object} [params] Parameters.
   * @returns {HTMLElement} Content row.
   */
  buildContentRow(params = {}) {
    params.fields = params.fields || [];

    const row = document.createElement('div');
    row.classList.add('h5p-portfolio-placeholder-content-row');

    const totalSpaceHorizontal = params.fields.reduce((space, field) => {
      return space + field.width;
    }, 0);

    params.fields.forEach((field) => {
      const wrapper = document.createElement('div');
      wrapper.classList.add('h5p-portfolio-placeholder-content');
      wrapper.classList.add(`vertical-alignment-${field.verticalAlignment}`);
      wrapper.style.width = `${ 100 * field.width / totalSpaceHorizontal }%`;
      wrapper.appendChild(field.dom);

      row.appendChild(wrapper);
    });

    return row;
  }

  /**
   * Build content wrapper.
   * @param {object} [params] Parameters.
   * @returns {HTMLElement} Content wrapper.
   */
  buildContentWrapper(params = {}) {
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('h5p-portfolio-placeholder-content-instance');
    if (params.width) {
      contentWrapper.style.width = params.width;
    }

    return contentWrapper;
  }

  /**
   * Track scoring of fields.
   * @param {Event} event Event.
   * @param {number} [index] Index.
   */
  trackScoring(event, index = -1) {
    if (!event || event.getScore() === null) {
      return; // Not relevant
    }

    if (index < 0 || index > this.fields.length - 1) {
      return; // Not valid
    }

    this.fields[index].isDone = true;
    if (this.fields.every((field) => field.isDone)) {
      this.handleAllFieldsDone();
    }
  }

  /**
   * Handle all fields done.
   */
  handleAllFieldsDone() {
    // Ensure subcontent's xAPI statement is triggered beforehand
    window.requestAnimationFrame(() => {
      this.triggerXAPIScored(this.getScore(), this.getMaxScore(), 'completed');
    });
  }

  /**
   * Sanitize image height limit. Not covering all cases ...
   * @param {string} originalLength Original CSS length.
   * @returns {string|undefined} Image height limit or undefined.
   */
  sanitizeImageHeightLimit(originalLength) {
    if (typeof originalLength !== 'string') {
      return;
    }

    // Remove space characters
    originalLength = originalLength.replace(/ /, '');

    // Assume px if no unit is attached
    if (!isNaN(Number(originalLength))) {
      originalLength = `${originalLength}px`;
    }

    return originalLength;
  }
}
