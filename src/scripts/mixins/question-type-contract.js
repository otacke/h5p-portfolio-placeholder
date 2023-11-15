/**
 * Mixin containing methods for H5P Question Type contract.
 */
export default class QuestionTypeContract {
  /**
   * Check if result has been submitted or input has been given.
   * @returns {boolean} True, if answer was given.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-1}
   */
  getAnswerGiven() {
    return this.fields.some((field) => {
      return (
        typeof field?.instance?.getAnswerGiven === 'function' &&
        field.instance.getAnswerGiven()
      );
    });
  }

  /**
   * Get score.
   * @returns {number} Score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    return this.fields.reduce((sum, field) => {
      return sum + (typeof field.instance.getScore === 'function' ?
        field.instance.getScore() :
        0);
    }, 0);
  }

  /**
   * Get maximum possible score.
   * @returns {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    return this.fields.reduce((sum, field) => {
      return sum + (typeof field.instance.getMaxScore === 'function' ?
        field.instance.getMaxScore() :
        0);
    }, 0);
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    this.fields.forEach((field) => {
      if (typeof field?.instance?.showSolutions === 'function') {
        field.instance.showSolutions();
      }
    });

    this.trigger('resize');
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.fields.forEach((field) => {
      if (typeof field?.instance?.resetTask === 'function') {
        field.instance.resetTask();
      }

      field.isDone = !field.instance || !this.isInstanceTask(field.instance);
    });

    this.trigger('resize');
  }

  /**
   * Get xAPI data.
   * @returns {object} XAPI statement.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-6}
   */
  getXAPIData() {
    const xAPIEvent = this.createXAPIEvent('answered');

    // Not a valid xAPI value (!), but H5P uses it for reporting
    xAPIEvent.data.statement.object.definition.interactionType = 'compound';

    xAPIEvent.setScoredResult(this.getScore(),
      this.getMaxScore(),
      this,
      true,
      this.getScore() === this.getMaxScore()
    );

    return {
      statement: xAPIEvent.data.statement,
      children: this.getXAPIDataFromChildren(
        this.fields.map((field) => field.instance)
      )
    };
  }

  /**
   * Get current state.
   * @returns {object} Current state.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-7}
   */
  getCurrentState() {
    return {
      children: this.fields.map((field) => {
        return (typeof field?.instance?.getCurrentState === 'function') ?
          field.instance.getCurrentState() || {} :
          {};
      })
    };
  }
}
