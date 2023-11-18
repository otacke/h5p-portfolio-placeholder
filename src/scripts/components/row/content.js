import Util from '@services/util.js';
import InstanceWrapper from '@models/instance-wrapper.js';
import './content.scss';

export default class Content {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {number} [params.contentId] Content id.
   * @param {object} [params.field] Field.
   * @param {string} [params.imageHeightLimit] Image height limit.
   * @param {number} [params.index] Index.
   * @param {object} [params.mainInstance] Main instance.
   * @param {object} [params.previousState] Previous state.
   * @param {string} [params.verticalAlignment] Vertical alignment.
   * @param {number} [params.width] Width.
   * @param {string} [params.widthRelative] Relative width.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.xAPI] Callback for xAPI events.
   */
  constructor(params = {}, callbacks = {}) {
    params = Util.extend({
      previousState: {},
      verticalAlignment: 'top',
      width: 100,
      widthRelative: '100%'
    }, params);

    callbacks = Util.extend({
      xAPI: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-content');
    this.dom.classList.add(`vertical-alignment-${params.verticalAlignment}`);
    this.dom.style.width = params.widthRelative;

    const contentWrapper = document.createElement('div');
    contentWrapper.classList.add('h5p-portfolio-placeholder-content-instance');
    if (params.width) {
      contentWrapper.style.width = params.width;
    }
    this.dom.appendChild(contentWrapper);

    this.instanceWrapper = new InstanceWrapper(
      {
        index: params.index,
        field: params.field,
        contentId: params.contentId,
        dom: contentWrapper,
        mainInstance: params.mainInstance,
        previousState: params.previousState,
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
