import Util from '@services/util.js';
import Row from '@components/row/row.js';

export default class Main {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.arrangement] Layout arrangement.
   * @param {string} [params.colorBackground] Background color.
   * @param {number} [params.contentId] Content id.
   * @param {object[]} [params.fields] Fields.
   * @param {string} [params.imageHeightLimit] Image height limit.
   * @param {object} [params.mainInstance] Main instance.
   * @param {object} [params.previousStates] Previous states.
   * @param {object} [callbacks] Callbacks.
   * @param {function} [callbacks.xAPI] Callback for xAPI events.
   */
  constructor(params = {}, callbacks = {}) {
    params = Util.extend({
      arrangement: '1',
      fields: [],
      previousStates: [],
    }, params);

    callbacks = Util.extend({
      xAPI: () => {},
    }, callbacks);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-contents');
    if (params.colorBackground !== 'rgba(0, 0, 0, 0)') {
      this.dom.style.backgroundColor = params.colorBackground;
    }

    /*
     * columnIndex holds the absolute index of the first field to be added to
     * a row. It is incremented by the number of fields in each row.
     */
    let columnIndex = 0;
    this.rows = (params.arrangement.split('-')).map((columnsInRow) => {
      columnsInRow = parseInt(columnsInRow);

      const row = new Row(
        {
          colorBackground: params.colorBackground,
          contentId: params.contentId,
          fields: params.fields.slice(columnIndex, columnIndex + columnsInRow),
          imageHeightLimit: params.imageHeightLimit,
          index: columnIndex,
          mainInstance: params.mainInstance,
          previousStates: params.previousStates
            .slice(columnIndex, columnIndex + columnsInRow),
        },
        {
          xAPI: (event, index) => {
            callbacks.xAPI(event, index);
          },
        },
      );

      columnIndex += columnsInRow;

      return row;
    });

    this.rows.forEach((row) => {
      this.dom.appendChild(row.getDOM());
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
