import Util from './h5p-group-of-three-util';
import '../styles/h5p-group-of-three.scss';

export default class GroupOfThree extends H5P.EventDispatcher {
  /**
   * @constructor
   * @param {object} params Parameters passed by the editor.
   * @param {number} contentId Content's id.
   * @param {object} [extras] Saved state, metadata, etc.
   */
  constructor(params, contentId, extras = {}) {
    super();

    // Sanitize parameters
    this.params = Util.extend({
      arrangement: '1',
      fields: []
    }, params);

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
      previousStates: this.previousState.children || []
    });

    // Some other content types might use this information
    this.isTask = this.fields.some(
      field => this.isInstanceTask(field.instance)
    );

    // Expect parent to set activity started when parent is shown
    if (typeof this.isRoot === 'function' && this.isRoot()) {
      this.setActivityStarted();
    }
  }

  /**
   * Attach library to wrapper.
   * @param {jQuery} $wrapper Content's container.
   */
  attach($wrapper) {
    $wrapper.get(0).classList.add('h5p-group-of-three');
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
   * @return {object[]} Fields including DOM and instance.
   */
  buildFields(params = {}) {
    const fields = (params.fields || []).map((field, index) => {
      const dom = this.buildContentWrapper();

      const previousState = params?.previousStates.length > index ?
        params.previousStates[index] :
        {};

      // Customize parameters
      if (field?.content?.params) {
        field.content.params = this.customizeParameters(
          field?.content?.libraryInfo?.machineName,
          field.content.params
        );
      }

      const instance = (!field.content) ?
        null :
        H5P.newRunnable(
          field.content,
          this.contentId,
          H5P.jQuery(dom),
          false,
          { previousState: previousState }
        );

      // Customize DOM
      this.customizeDOM({ dom: dom, instance: instance });

      // Remove fullscreen buttons
      this.removeFullscreenButtons({ dom: dom, instance: instance });

      // Resize instance to fit inside parent and vice versa
      if (instance) {
        this.bubbleDown(this, 'resize', [instance]);
        this.bubbleUp(instance, 'resize', this);

        if (this.isInstanceTask(instance)) {
          instance.on('xAPI', event => {
            this.trackScoring(event, index);
          });
        }
      }

      return {
        dom: dom,
        instance: instance,
        isDone: !instance || !this.isInstanceTask(instance)
      };
    });

    return fields;
  }

  /**
   * Build DOM.
   * @return {HTMLElement} Content DOM.
   */
  buildDOM() {
    const contents = document.createElement('div');
    contents.classList.add('h5p-group-of-three-contents');

    let index = 0;
    const rowsToBuild = this.params.arrangement.split('-');
    rowsToBuild.forEach(rowCount => {
      const fieldsToBuild = this.fields.slice(index, index + parseInt(rowCount));
      contents.appendChild(this.buildContentRow({ fields: fieldsToBuild }));
      index += parseInt(rowCount);
    });

    return contents;
  }

  /**
   * Build content row.
   * @return {HTMLElement} Content row.
   */
  buildContentRow(params = {}) {
    const row = document.createElement('div');
    row.classList.add('h5p-group-of-three-content-row');

    (params.fields || []).forEach(field => {
      row.appendChild(field.dom);
    });

    return row;
  }

  /**
   * Build content wrapper.
   * @return {HTMLElement} Content wrapper.
   */
  buildContentWrapper() {
    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('h5p-group-of-three-content');

    return contentWrapper;
  }

  /**
   * Customize H5P content parameters.
   * @param {string} machineName Content type's machine name.
   * @param {object} params H5P content parameters.
   * @return {object} Customized H5P content parameters.
   */
  customizeParameters(machineName, params = {}) {
    if (machineName === 'H5P.Video') {
      // Prevent video from growing endlessly since height is unlimited
      params.visuals.fit = false;
    }

    return params;
  }

  /**
   * Remove fullscreen buttons from content.
   * @param {object} field Field.
   * @param {HTMLElement} field.dom H5P content wrapper.
   * @param {H5PContent} field.instance H5P content.
   */
  customizeDOM(field = {}) {
    const machineName = field.instance?.libraryInfo.machineName;

    // Add subcontent DOM customization if required
    if (machineName === 'H5P.Image') {
      const image = field.dom?.querySelector('.h5p-image > img');
      if (image) {
        image.style.height = 'auto';
      }
    }
    else if (machineName === 'H5P.Audio') {
      // Fix to H5P.Audio pending since January 2021 (https://github.com/h5p/h5p-audio/pull/48/files)
      const audio = field.dom.querySelector('.h5p-audio');
      audio.style.height = (
        !!window.chrome &&
        field.content?.params?.playerMode === 'full'
      ) ?
        '54px' : // Chromium based browsers like Chrome, Edge or Opera need explicit default height
        '100%';
    }
  }

  /**
   * Remove fullscreen buttons from content.
   * @param {object} field Field.
   * @param {H5PContent} field.instance H5P content.
   */
  removeFullscreenButtons(field = {}) {
    const machineName = field.instance?.libraryInfo?.machineName;

    if (machineName === 'H5P.CoursePresentation') {
      if (field.instance?.$fullScreenButton) {
        field.instance.$fullScreenButton.remove();
      }
    }
    else if (machineName === 'H5P.InteractiveVideo') {
      field.instance?.on('controls', function () {
        if (field.instance?.controls?.$fullscreen) {
          field.instance.controls.$fullscreen.remove();
        }
      });
    }
  }

  /**
   * Make it easy to bubble events from parent to children
   * @param {object} origin Origin of the event.
   * @param {string} eventName Name of the event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets = []) {
    origin.on(eventName, function (event) {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach(target => {
        target.trigger(eventName, event);
      });
    });
  }

  /**
   * Make it easy to bubble events from child to parent.
   * @param {object} origin Origin of event.
   * @param {string} eventName Name of event.
   * @param {object} target Target to trigger event on.
   */
  bubbleUp(origin, eventName, target) {
    origin.on(eventName, (event) => {

      // Prevent target from sending event back down
      target.bubblingUpwards = true;

      // Trigger event
      target.trigger(eventName, event);

      // Reset
      target.bubblingUpwards = false;
    });
  }

  /**
   * Track scoring of fields.
   */
  trackScoring(event, index = -1) {
    if (!event || event.getScore() === null) {
      return; // Not relevant
    }

    if (index < 0 || index > this.fields.length - 1) {
      return; // Not valid
    }

    this.fields[index].isDone = true;
    if (this.fields.every(field => field.isDone)) {
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
   * Determine whether an H5P instance is a task.
   * @return {boolean} True, if instance is a task.
   */
  isInstanceTask(instance = {}) {
    if (instance.isTask) {
      return instance.isTask; // Content will determine if it's task on its own
    }

    // Check for maxScore as indicator for being a task
    const hasGetMaxScore = (typeof instance.getMaxScore === 'function');
    if (hasGetMaxScore) {
      return true;
    }

    // Check for (temporary) exceptions
    const exceptions = [
      'H5P.Blanks', // Exception required for original V1.12.11 and before, can be removed when later is out or changes merged in
      'H5P.MemoryGame', // Doesn't implement getMaxScore yet
      'H5P.SpeakTheWordsSet' // Doesn't implement getMaxScore yet
    ];

    return exceptions.includes(instance?.libraryInfo?.machineName);
  }

  /**
   * Check if result has been submitted or input has been given.
   * @return {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.fields.some(field => {
      return (
        typeof field?.instance?.getAnswerGiven === 'function' &&
        field.instance.getAnswerGiven()
      );
    });
  }

  /**
   * Get score.
   * @return {number} Score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    return this.fields.reduce((sum, field) => {
      return sum + (typeof field.instance.getScore === 'function' ?
        field.instance.getScore() :
        0);
    }, 0);
  }

  /**
   * Get maximum possible score.
   * @return {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    return this.fields.reduce((sum, field) => {
      return sum + (typeof field.instance.getMaxScore === 'function' ?
        field.instance.getMaxScore() :
        0);
    }, 0);
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    this.fields.forEach(field => {
      if (typeof field?.instance?.showSolutions === 'function') {
        field.instance.showSolutions();
      }
    });

    this.trigger('resize');
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.fields.forEach(field => {
      if (typeof field?.instance?.resetTask === 'function') {
        field.instance.resetTask();
      }

      field.isDone = !field.instance || !this.isInstanceTask(field.instance);
    });

    this.trigger('resize');
  }

  /**
   * Get xAPI data.
   * @return {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    var xAPIEvent = this.createXAPIEvent('answered');

    xAPIEvent.setScoredResult(this.getScore(),
      this.getMaxScore(),
      this,
      true,
      this.getScore() === this.getMaxScore()
    );

    return {
      statement: xAPIEvent.data.statement,
      children: this.getXAPIDataFromChildren(
        this.fields.map(field => field.instance)
      )
    };
  }

  /**
   * Get xAPI data from sub content types
   * @param {H5P.ContentType[]} H5P instances.
   * @return {object[]} XAPI data objects used to build report.
   */
  getXAPIDataFromChildren(children) {
    return children
      .map(child => {
        if (typeof child.getXAPIData === 'function') {
          return child.getXAPIData();
        }
      })
      .filter(data => !!data);
  }

  /**
   * Create an xAPI event.
   * @param {string} verb Short id of the verb we want to trigger.
   * @return {H5P.XAPIEvent} Event template.
   */
  createXAPIEvent(verb) {
    const xAPIEvent = this.createXAPIEventTemplate(verb);
    Util.extend(
      xAPIEvent.getVerifiedStatementValue(['object', 'definition']),
      this.getxAPIDefinition());

    return xAPIEvent;
  }

  /**
   * Get the xAPI definition for the xAPI object.
   * @return {object} XAPI definition.
   */
  getxAPIDefinition() {
    const definition = {};

    definition.name = {};
    definition.name[this.languageTag] = this.getTitle();
    // Fallback for h5p-php-reporting, expects en-US
    definition.name['en-US'] = definition.name[this.languageTag];
    definition.description = {};
    definition.description[this.languageTag] = Util.stripHTML(
      this.getDescription()
    );
    // Fallback for h5p-php-reporting, expects en-US
    definition.description['en-US'] = definition.description[this.languageTag];
    definition.type = 'http://adlnet.gov/expapi/activities/cmi.interaction';
    definition.interactionType = 'compound';

    return definition;
  }

  /**
   * Get task title.
   * @return {string} Title.
   */
  getTitle() {
    // H5P Core function: createTitle
    return H5P.createTitle(
      this.extras?.metadata?.title || GroupOfThree.DEFAULT_DESCRIPTION
    );
  }

  /**
   * Get description.
   * @return {string} Description.
   */
  getDescription() {
    return GroupOfThree.DEFAULT_DESCRIPTION;
  }

  /**
   * Get current state.
   * @return {object} Current state.
   */
  getCurrentState() {
    return {
      children: this.fields.map(field => {
        return (typeof field?.instance.getCurrentState === 'function') ?
          field.instance.getCurrentState() :
          {};
      })
    };
  }
}

/** @constant {string} */
GroupOfThree.DEFAULT_DESCRIPTION = 'Group of Three';
