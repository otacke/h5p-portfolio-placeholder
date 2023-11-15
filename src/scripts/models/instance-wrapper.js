
import Util from '@services/util.js';

export default class InstanceWrapper {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {number} params.index Index of field.
   * @param {object} params.field Field as defined in editor.
   * @param {number} params.contentId Content id.
   * @param {HTMLElement} params.dom DOM element to render H5P content in.
   * @param {H5P.ContentType} params.parentInstance Parent H5P content.
   * @param {object} params.previousState Previous state of H5P content.
   * @param {string} params.imageHeightLimit Image height limit.
   * @param {object} callbacks Callbacks.
   * @param {function} callbacks.onXAPI Callback for xAPI events.
   */
  constructor(params = {}, callbacks = {}) {
    params = Util.extend({
      field: {
        content: {}
      },
      previousState: {}
    }, params);

    callbacks = Util.extend({
      onXAPI: () => {} }, callbacks
    );

    const machineName = (typeof params.field.content.library === 'string') ?
      params.field.content.library.split(' ')[0] :
      '';

    // Customize parameters
    params.field.content.params = this.customizeParameters(
      machineName,
      params.field.content.params
    );

    this.instance = (params.field.content.library && !params.field.isHidden) ?
      H5P.newRunnable(
        params.field.content,
        params.contentId,
        H5P.jQuery(params.dom),
        false,
        { previousState: params.previousState }
      ) :
      null;

    // Customize instance
    this.customizeInstance(
      machineName,
      this.instance,
      { imageHeightLimit: params.imageHeightLimit }
    );

    // Customize DOM
    this.customizeDOM(params.dom, this.instance);

    // Remove fullscreen buttons
    this.removeFullscreenButtons(params.dom, this.instance);

    // Resize instance to fit inside parent and vice versa
    if (this.instance) {
      this.bubbleDown(params.parentInstance, 'resize', [this.instance]);
      this.bubbleUp(this.instance, 'resize', params.parentInstance);
    }

    if (this.isTask()) {
      this.instance.on('xAPI', (event) => {
        callbacks.onXAPI(event, params.index);
      });
    }
  }

  /**
   * Customize H5P content parameters before creating instance.
   * @param {string} machineName Content type's machine name.
   * @param {object} params H5P content parameters.
   * @returns {object} Customized H5P content parameters.
   */
  customizeParameters(machineName, params = {}) {
    // Prevent video from growing endlessly since height is unlimited
    if (machineName === 'H5P.Video') {
      params.visuals.fit = (
        params?.sources?.length > 0 &&
        ['video/mp4', 'video/webm', 'video/ogg']
          .includes(params.sources[0].mime)
      );
    }

    // Prevent audio from overflowing placeholder field
    if (machineName === 'H5P.Audio') {
      params.fitToWrapper = true;
    }

    return params;
  }

  /**
   * Customize H5P content instance.
   * @param {string} machineName Instance's machine name.
   * @param {object} instance Instance.
   * @param {object} [params] Parameters.
   * @param {string} [params.imageHeightLimit] Image height limit.
   */
  customizeInstance(machineName, instance, params = {}) {
    if (!machineName || !instance) {
      return;
    }

    if (
      machineName === 'H5P.Image' &&
      params.imageHeightLimit &&
      instance.$img
    ) {
      const image = instance.$img.get(0);
      image.style.maxHeight = params.imageHeightLimit;

      // Screenshot module cannot handle object-fit. Workaround by deriving max-width, too
      instance.on('loaded', () => {
        const imageRatio = image.naturalWidth / image.naturalHeight;
        const maxWidth = `calc(${params.imageHeightLimit} * ${imageRatio})`;
        image.parentNode.style.maxWidth = maxWidth;
      });
    }
  }

  /**
   * Customize H5P content DOM.
   * @param {HTMLElement} dom H5P content wrapper.
   * @param {H5P.ContentType} instance H5P content.
   */
  customizeDOM(dom, instance) {
    if (!dom || !instance) {
      return;
    }

    const machineName = instance.libraryInfo?.machineName;

    // Add subcontent DOM customization if required
    if (machineName === 'H5P.Image') {
      // Ensure image placeholder has height
      const image = dom.querySelector('.h5p-image > img');
      if (!image) {
        const placeholder =
          dom.querySelector('.h5p-image > .h5p-placeholder');

        if (placeholder) {
          placeholder.parentNode.style.height = '10rem';
        }
      }
    }
    else if (machineName === 'H5P.Audio') {
      // Fix to H5P.Audio pending since January 2021 (https://github.com/h5p/h5p-audio/pull/48/files)
      const audio = dom.querySelector('.h5p-audio');
      if (audio) {
        audio.style.height = (
          !!window.chrome &&
          instance.params?.playerMode === 'full'
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
            dom.querySelector('.h5p-image-hotspots-container');

          if (container) {
            container.style.width = '';
            container.style.height = '';
          }
          const image =
            dom.querySelector('.h5p-image-hotspots-background');
          if (image) {
            image.style.width = '';
            image.style.height = '';
          }

          // Will lead ImageHotspots to use static font size
          instance.initialWidth = null;
          instance.resize?.();
        }, 0);
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
   * Remove fullscreen buttons from content.
   * @param {H5P.ContentType} instance H5P content instance.
   */
  removeFullscreenButtons(instance) {
    if (!instance) {
      return;
    }

    const machineName = instance.libraryInfo?.machineName;

    if (machineName === 'H5P.CoursePresentation') {
      if (instance.$fullScreenButton) {
        instance.$fullScreenButton.remove();
      }
    }
    else if (machineName === 'H5P.InteractiveVideo') {
      instance.on('controls', function () {
        if (instance.controls?.$fullscreen) {
          instance.controls?.$fullscreen?.remove();
        }
      });
    }
  }

  /**
   * Get original H5P instance.
   * @returns {H5P.ContentType|null} H5P instance.
   */
  getInstance() {
    return this.instance;
  }

  /**
   * Determine whether an H5P instance is a task.
   * @returns {boolean} True, if instance is a task.
   */
  isTask() {
    if (!this.instance) {
      return false;
    }

    if (typeof this.instance.isTask === 'boolean') {
      return this.instance.isTask; // Content will determine if it's task on its own
    }

    if (typeof this.instance.isTask === 'function') {
      return this.instance.isTask(); // Content will determine if it's task on its own
    }

    // Check for maxScore as indicator for being a task
    const hasGetMaxScore = (typeof this.instance.getMaxScore === 'function');
    if (hasGetMaxScore) {
      return true;
    }

    // Check for (temporary) exceptions
    const exceptions = [
      'H5P.MemoryGame', // Doesn't implement getMaxScore before V1.3.19, unfortunately minor version was not bumped when introducing it, so V1.4 it is
      'H5P.SpeakTheWordsSet' // Doesn't implement getMaxScore yet, PR is from 2020, seehttps://github.com/h5p/h5p-speak-the-words-set/pull/22
    ];

    return exceptions.includes(this.instance.libraryInfo?.machineName);
  }
}
