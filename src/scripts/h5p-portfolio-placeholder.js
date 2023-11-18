import Main from '@components/main.js';
import Util from '@services/util.js';
import API from '@mixins/api.js';
import QuestionTypeContract from '@mixins/question-type-contract.js';
import XAPI from '@mixins/xapi.js';

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

    this.params = this.sanitize(params);

    this.contentId = contentId;
    this.extras = extras;

    this.previousState = extras?.previousState || {};

    const defaultLanguage = extras?.metadata?.defaultLanguage || 'en';
    this.languageTag = Util.formatLanguageCode(defaultLanguage);

    this.main = new Main(
      {
        colorBackground: this.params.colorBackground,
        contentId: this.contentId,
        arrangement: this.params.arrangement,
        fields: this.params.fields,
        mainInstance: this,
        previousStates: this.previousState.children || [],
        imageHeightLimit: this.params.imageHeightLimit
      },
      {
        xAPI: (event, index) => {
          this.trackScoring(event, index);
        }
      }
    );

    this.dom = this.main.getDOM();

    this.instanceWrappers = this.main.getInstanceWrappers();

    // Some other content types might use this information
    this.isTask = this.instanceWrappers.some(
      (instanceWrapper) => instanceWrapper.isTask()
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
    $wrapper.get(0).appendChild(this.dom);

    // Make sure DOM has been rendered with content
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.trigger('resize');
      });
    });
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

    if (index < 0 || index > this.instanceWrappers.length - 1) {
      return; // Not valid
    }

    this.instanceWrappers[index].setDone(true);

    if (this.instanceWrappers.every(
      (instanceWrapper) => instanceWrapper.isDone())
    ) {
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
   * Sanitize parameters.
   * @param {object} params Parameters passed by the editor.
   * @returns {object} Sanitized parameters.
   */
  sanitize(params) {
    let sanitzedParams = Util.extend(
      {
        placeholder: {
          arrangement: '1',
          fields: []
        }
      }, params);

    // Sanitize image height limit
    sanitzedParams.placeholder.imageHeightLimit =
      this.sanitizeImageHeightLimit(
        sanitzedParams.placeholder.imageHeightLimit
      );

    // Sanitize grow proportion
    sanitzedParams.placeholder.fields = sanitzedParams.placeholder.fields
      .map((field) => {
        field.width = field.width ?? 100;
        field.verticalAlignment = field.verticalAlignment ?? 'top';
        return field;
      });

    sanitzedParams = sanitzedParams.placeholder;

    // Sanitize field parameters
    const numberOfFields = sanitzedParams.arrangement
      .split('-')
      .reduce((sum, summand) => sum + parseInt(summand), 0);

    // Ensure correct number of fields
    sanitzedParams.fields = sanitzedParams.fields.slice(0, numberOfFields);
    while (sanitzedParams.fields.length < numberOfFields) {
      sanitzedParams.fields.push({});
    }

    return sanitzedParams;
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
