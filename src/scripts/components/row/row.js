import Util from '@services/util.js';
import Content from './content.js';
import './row.scss';

export default class Row {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object[]} [params.fields] Fields.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.xAPI] Callback for xAPI events.
   */
  constructor(params = {}, callbacks = {}) {
    callbacks = Util.extend({
      xAPI: () => {}
    }, callbacks);

    params = Util.extend({ fields: [] }, params);
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-content-row');

    const totalSpaceHorizontal = params.fields.reduce((space, field) => {
      return space + field.width;
    }, 0);

    this.contents = params.fields.map((field, index) => {
      const content = new Content(
        {
          contentId: params.contentId,
          field: field,
          imageHeightLimit: params.imageHeightLimit,
          index: params.index + index,
          mainInstance: params.mainInstance,
          previousStates: params.previousStates,
          totalSpaceHorizontal: totalSpaceHorizontal,
          verticalAlignment: field.verticalAlignment,
          width: field.width
        },
        {
          xAPI: (event, index) => {
            callbacks.xAPI(event, index);
          }
        }
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
