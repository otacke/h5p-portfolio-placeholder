import Row from '@components/row/row.js';

export default class Main {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {string} [params.colorBackground] Background color.
   * @param {string} [params.arrangement] Layout arrangement.
   * @param {object[]} [params.fields] Fields.
   * @param {object} [params.previousStates] Previous states.
   */
  constructor(params = {}) {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-contents');
    if (params.colorBackground !== 'rgba(0, 0, 0, 0)') {
      this.dom.style.backgroundColor = params.colorBackground;
    }

    let index = 0;
    const rowsToBuild = params.arrangement.split('-');
    rowsToBuild.forEach((rowCount) => {
      const fieldsToBuild = params.fields
        .slice(index, index + parseInt(rowCount));

      const row = new Row({ fields: fieldsToBuild });
      this.dom.appendChild(row.getDOM());

      index += parseInt(rowCount);
    });
  }

  /**
   * Get the DOM element.
   * @returns {HTMLElement} The DOM element.
   */
  getDOM() {
    return this.dom;
  }

}
