import Content from './content.js';
import './row.scss';

export default class Row {
  /**
   * @class
   * @param {object} [params] Parameters.
   * @param {object[]} [params.fields] Fields.
   */
  constructor(params = {}) {
    params.fields = params.fields || [];

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-portfolio-placeholder-content-row');

    const totalSpaceHorizontal = params.fields.reduce((space, field) => {
      return space + field.width;
    }, 0);

    params.fields.forEach((field) => {
      const content = new Content({
        dom: field.dom, // Create in content.js
        verticalAlignment: field.verticalAlignment,
        width: field.width,
        totalSpaceHorizontal: totalSpaceHorizontal
      });

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
}
