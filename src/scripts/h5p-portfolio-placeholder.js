import Util from '@services/util.js';
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
      PortfolioPlaceholder, [QuestionTypeContract, XAPI]
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
      (field) => this.isInstanceTask(field.instance)
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

      // Customize parameters
      if (field?.content?.params) {
        const machineName = (typeof field?.content?.library === 'string') ?
          field.content.library.split(' ')[0] :
          '';

        field.content.params = this.customizeParameters(
          machineName,
          field.content.params
        );
      }

      // Fix video view, common issue
      const machineName = field.content?.library?.split(' ')[0];
      if (machineName === 'H5P.Video') {
        field.content.params.visuals.fit = (
          field.content?.params?.sources?.length > 0 &&
          ['video/mp4', 'video/webm', 'video/ogg']
            .includes(field.content.params.sources[0].mime)
        );
      }

      const instance = (!field.content?.library || field.isHidden) ?
        null :
        H5P.newRunnable(
          field.content,
          this.contentId,
          H5P.jQuery(dom),
          false,
          { previousState: previousState }
        );

      if (
        machineName === 'H5P.Image' &&
        this.params.imageHeightLimit &&
        instance.$img
      ) {
        const image = instance.$img.get(0);
        image.style.maxHeight = this.params.imageHeightLimit;

        // Screenshot module cannot handle object-fit. Workaround by deriving max-width, too
        instance.on('loaded', () => {
          const imageRatio = image.naturalWidth / image.naturalHeight;
          const maxWidth = `calc(${this.params.imageHeightLimit} * ${imageRatio})`;
          image.parentNode.style.maxWidth = maxWidth;
        });
      }

      // Customize DOM
      this.customizeDOM({ dom: dom, instance: instance });

      // Remove fullscreen buttons
      this.removeFullscreenButtons({ dom: dom, instance: instance });

      // Resize instance to fit inside parent and vice versa
      if (instance) {
        this.bubbleDown(this, 'resize', [instance]);
        this.bubbleUp(instance, 'resize', this);

        if (this.isInstanceTask(instance)) {
          instance.on('xAPI', (event) => {
            this.trackScoring(event, index);
          });
        }
      }

      return {
        dom: dom,
        instance: instance,
        isDone: !instance || !this.isInstanceTask(instance),
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
   * Customize H5P content parameters.
   * @param {string} machineName Content type's machine name.
   * @param {object} params H5P content parameters.
   * @returns {object} Customized H5P content parameters.
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
   * @param {H5P.ContentType} field.instance H5P content.
   */
  customizeDOM(field = {}) {
    if (!field.dom || !field.instance) {
      return;
    }

    const machineName = field.instance?.libraryInfo.machineName;

    // Add subcontent DOM customization if required
    if (machineName === 'H5P.Image') {
      const image = field.dom?.querySelector('.h5p-image > img');
      if (!image) {
        const placeholder =
          field.dom?.querySelector('.h5p-image > .h5p-placeholder');

        if (placeholder) {
          placeholder.parentNode.style.height = '10rem';
        }
      }
    }
    else if (machineName === 'H5P.Audio') {
      // Fix to H5P.Audio pending since January 2021 (https://github.com/h5p/h5p-audio/pull/48/files)
      const audio = field.dom.querySelector('.h5p-audio');
      if (audio) {
        audio.style.height = (
          !!window.chrome &&
          field.content?.params?.playerMode === 'full'
        ) ?
          '54px' : // Chromium based browsers like Chrome, Edge or Opera need explicit default height
          '100%';
      }
    }
    else if (machineName === 'H5P.ImageHotspots') {
      // Fix resize issue (Image Hotspots sets absolute width)
      this.on('resize', () => {
        clearTimeout(this.timeoutImageHotspots);
        this.timeoutImageHotspots = setTimeout(() => {
          const container =
            field.dom.querySelector('.h5p-image-hotspots-container');

          if (container) {
            container.style.width = '';
            container.style.height = '';
          }
          const image =
            field.dom.querySelector('.h5p-image-hotspots-background');
          if (image) {
            image.style.width = '';
            image.style.height = '';
          }

          // Will lead ImageHotspots to use static font size
          field.instance.initialWidth = null;
          field.instance.resize();
        }, 0);
      });
    }
  }

  /**
   * Remove fullscreen buttons from content.
   * @param {object} field Field.
   * @param {H5P.ContentType} field.instance H5P content.
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
   * Make it easy to bubble events from parent to children.
   * @param {object} origin Origin of the event.
   * @param {string} eventName Name of the event.
   * @param {object[]} targets Targets to trigger event on.
   */
  bubbleDown(origin, eventName, targets = []) {
    origin.on(eventName, function (event) {
      if (origin.bubblingUpwards) {
        return; // Prevent send event back down.
      }

      targets.forEach((target) => {
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

  /**
   * Find field by subContentId.
   * @param {string} subContentId SubContentId to look for.
   * @returns {object|null} Field data.
   */
  findField(subContentId) {
    return this.fields.find((field) => {
      return field.instance?.subContentId === subContentId;
    }) || null;
  }

  /**
   * Determine whether an H5P instance is a task.
   * @param {H5P.ContentType} instance content instance.
   * @returns {boolean} True, if instance is a task.
   */
  isInstanceTask(instance = {}) {
    if (!instance) {
      return false;
    }

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

    return exceptions.includes(instance.libraryInfo?.machineName);
  }

  /**
   * Get instances.
   * @returns {H5P.ContentType[]} H5P instances. Interface for parent.
   */
  getInstances() {
    return this.fields.map((field) => field.instance);
  }

  /**
   * Get instances' semantics. Interface for parent.
   * @returns {object[]} H5P instance semantics.
   */
  getInstancesSemantics() {
    return this.params.fields.map((field) => field.content);
  }
}
