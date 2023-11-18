import './content.scss';

export default class Content {

  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {HTMLElement} [params.dom] DOM element.
   * @param {string} [params.verticalAlignment] Vertical alignment.
   * @param {number} [params.width] Width.
   * @param {number} [params.totalSpaceHorizontal] Total horizontal space.
   */
  constructor(params = {}) {
    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-content');
    this.dom.classList.add(`vertical-alignment-${params.verticalAlignment}`);
    this.dom.style.width =
      `${ 100 * params.width / params.totalSpaceHorizontal }%`;
    this.dom.appendChild(params.dom); // TODO: Create DOM here, not in main.js
  }

  /**
   * Get the DOM element.
   * @returns {HTMLElement} The DOM element.
   */
  getDOM() {
    return this.dom;
  }
}
