
import Util from '@services/util.js';
import {
  customizeDOM,
  customizeParameters,
  customizeInstance,
  removeFullscreenButtons
} from './instance-wrapper-customizations.js';

export default class InstanceWrapper {

  /**
   * @class
   * @param {object} params Parameters.
   * @param {number} params.index Index of field.
   * @param {object} params.field Field as defined in editor.
   * @param {number} params.contentId Content id.
   * @param {HTMLElement} params.dom DOM element to render H5P content in.
   * @param {H5P.ContentType} params.mainInstance Parent H5P content.
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
      onXAPI: () => {}
    }, callbacks);

    // Required for external access.
    this.dom = params.dom;

    const machineName = (typeof params.field.content.library === 'string') ?
      params.field.content.library.split(' ')[0] :
      '';

    // Customize parameters
    params.field.content.params = customizeParameters(
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
    customizeInstance(
      machineName,
      this.instance,
      { imageHeightLimit: params.imageHeightLimit }
    );

    // Customize DOM
    customizeDOM(params.dom, this.instance, params.mainInstance, this);

    // Remove fullscreen buttons
    removeFullscreenButtons(params.dom, this.instance);

    // Resize instance to fit inside parent and vice versa
    if (this.instance) {
      this.bubbleDown(params.mainInstance, 'resize', [this.instance]);
      this.bubbleUp(this.instance, 'resize', params.mainInstance);
    }

    if (this.isTask()) {
      this.setDone(false);
      this.instance.on('xAPI', (event) => {
        callbacks.onXAPI(event, params.index);
      });
    }
    else {
      this.setDone(true);
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

  /**
   * Set instance as done or undone.
   * @param {boolean} state True, if instance is done, false if instance not done.
   */
  setDone(state) {
    if (typeof state !== 'boolean') {
      return;
    }

    this.instanceDone = state;
  }

  /**
   * Determine whether instance is done.
   * @returns {boolean} True, if instance is done.
   */
  isDone() {
    return this.instanceDone;
  }

  /**
   * Check if result has been submitted or input has been given to instance.
   * @returns {boolean} True, if instance is answered.
   */
  getAnswerGiven() {
    return (
      typeof this.getInstance()?.getAnswerGiven === 'function' &&
        this.getInstance().getAnswerGiven()
    );
  }

  /**
   * Get score of instance.
   * @returns {number} Score of instance.
   */
  getScore() {
    return (
      typeof this.getInstance()?.getScore === 'function' ?
        this.getInstance()?.getScore() :
        0
    );
  }

  /**
   * Get maximum score of instance.
   * @returns {number} Maximum score of instance.
   */
  getMaxScore() {
    return (
      typeof this.getInstance()?.getMaxScore === 'function' ?
        this.getInstance()?.getMaxScore() :
        0
    );
  }

  /**
   * Show solutions of instance.
   */
  showSolutions() {
    if (typeof this.getInstance()?.showSolutions === 'function') {
      this.getInstance().showSolutions();
    }
  }

  /**
   * Reset instance.
   */
  resetTask() {
    if (typeof this.getInstance()?.resetTask === 'function') {
      this.getInstance().resetTask();
    }

    this.setDone(
      !this.getInstance() || !this.isTask()
    );
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-7}
   */
  getCurrentState() {
    return this.getInstance()?.getCurrentState?.() || {};
  }
}
