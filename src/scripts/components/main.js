import Util from '@services/util.js';
import Row from '@components/row/row.js';

export default class Main {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.colorBackground] Background color.
   * @param {string} [params.arrangement] Layout arrangement.
   * @param {object[]} [params.fields] Fields.
   * @param {object} [params.previousStates] Previous states.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.xAPI] Callback for xAPI events.
   */
  constructor(params = {}, callbacks = {}) {
    params = Util.extend({
      arrangement: '1'
    }, params);

    callbacks = Util.extend({
      xAPI: () => {}
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-contents');
    if (params.colorBackground !== 'rgba(0, 0, 0, 0)') {
      this.dom.style.backgroundColor = params.colorBackground;
    }

    // TODO: Is there a better way to do this?
    let index = 0;

    this.rows = (params.arrangement.split('-')).map((rowCount) => {
      const row = new Row(
        {
          colorBackground: params.colorBackground,
          contentId: params.contentId,
          fields: params.fields.slice(index, index + parseInt(rowCount)),
          imageHeightLimit: params.imageHeightLimit,
          index: index,
          mainInstance: params.mainInstance,
          previousStates: params.previousStates.slice(index, index + parseInt(rowCount))
        },
        {
          xAPI: (event, index) => {
            callbacks.xAPI(event, index);
          }
        }
      );

      // TODO: Extra Loop
      this.dom.appendChild(row.getDOM());

      index += parseInt(rowCount);

      return row;
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
    return this.rows.reduce((instanceWrappers, row) => {
      return [...instanceWrappers, ...row.getInstanceWrappers()];
    }, []);
  }
}
