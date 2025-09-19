import Util from '@services/util.js';
import Content from './content.js';
import './row.scss';

export default class Row {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.colorBackground] Background color.
   * @param {number} [params.contentId] Content id.
   * @param {object[]} [params.fields] Fields.
   * @param {string} [params.imageHeightLimit] Image height limit.
   * @param {number} [params.index] Index of first field.
   * @param {object} [params.mainInstance] Main instance.
   * @param {object[]} [params.previousStates] Previous states.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.xAPI] Callback for xAPI events.
   */
  constructor(params = {}, callbacks = {}) {
    params = Util.extend({
      fields: [],
      previousStates: [],
    }, params);

    callbacks = Util.extend({
      xAPI: () => {},
    }, callbacks);

    params = Util.extend({ fields: [] }, params);
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-content-row');

    /*
     * totalSpaceHorizontal holds the sum of the width of all fields in the row.
     * It is used to calculate the relative width of each field.
     */
    const totalSpaceHorizontal = params.fields.reduce((space, field) => {
      return space + field.width;
    }, 0);

    this.contents = params.fields.map((field, index) => {
      const previousState =
        (params?.previousStates.length > params.index + index) ?
          params.previousStates[params.index + index] :
          {};

      const content = new Content(
        {
          contentId: params.contentId,
          field: field,
          imageHeightLimit: params.imageHeightLimit,
          index: params.index + index,
          mainInstance: params.mainInstance,
          previousState: previousState,
          totalSpaceHorizontal: totalSpaceHorizontal,
          verticalAlignment: field.verticalAlignment,
          width: field.width,
          widthRelative: `${ 100 * field.width / totalSpaceHorizontal }%`,
        },
        {
          xAPI: (event, index) => {
            callbacks.xAPI(event, index);
          },
        },
      );

      return content;
    });

    this.contents.forEach((content) => {
      this.dom.appendChild(content.getDOM());
    });
  }

  /**
   * Get the DOM element.
   * @returns {HTMLElement} The DOM element.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get instance wrappers.
   * @returns {object[]} Instance wrappers.
   */
  getInstanceWrappers() {
    return this.contents.map((content) => content.getInstanceWrapper());
  }
}
