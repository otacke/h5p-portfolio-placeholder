import Util from '@services/util.js';
import InstanceWrapper from '@models/instance-wrapper.js';
import './content.scss';

export default class Content {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {HTMLElement} [params.dom] DOM element.
   * @param {string} [params.verticalAlignment] Vertical alignment.
   * @param {number} [params.width] Width.
   * @param {number} [params.totalSpaceHorizontal] Total horizontal space.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.xAPI] Callback for xAPI events.
   */
  constructor(params = {}, callbacks = {}) {
    callbacks = Util.extend({
      xAPI: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-content');
    this.dom.classList.add(`vertical-alignment-${params.verticalAlignment}`);
    this.dom.style.width =
      `${ 100 * params.width / params.totalSpaceHorizontal }%`;

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('h5p-portfolio-placeholder-content-instance');
    if (params.width) {
      contentWrapper.style.width = params.width;
    }
    this.dom.appendChild(contentWrapper);

    const previousState = params?.previousStates.length > params.index ?
      params.previousStates[params.index] :
      {};

    this.instanceWrapper = new InstanceWrapper(
      {
        index: params.index,
        field: params.field,
        contentId: params.contentId,
        dom: contentWrapper,
        mainInstance: params.mainInstance,
        previousState: previousState,
        imageHeightLimit: params.imageHeightLimit
      },
      {
        onXAPI: (event, index) => {
          callbacks.xAPI(event, index);
        }
      }
    );
  }

  /**
   * Get the DOM element.
   * @returns {HTMLElement} The DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get instance wrapper.
   * @returns {InstanceWrapper} Instance wrapper.
   */
  getInstanceWrapper() {
    return this.instanceWrapper;
  }
}
