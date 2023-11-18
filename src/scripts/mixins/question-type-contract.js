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
    return this.instanceWrappers.some((instanceWrapper) => {
      return (
        typeof instanceWrapper.getInstance()?.getAnswerGiven === 'function' &&
        instanceWrapper.getInstance().getAnswerGiven()
      );
    });
  }

  /**
   * Get score.
   * @returns {number} Score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-2}
   */
  getScore() {
    return this.instanceWrappers.reduce((sum, instanceWrapper) => {
      return sum + (
        typeof instanceWrapper.getInstance()?.getScore === 'function' ?
          instanceWrapper.getInstance()?.getScore() :
          0
      );
    }, 0);
  }

  /**
   * Get maximum possible score.
   * @returns {number} Maximum possible score.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-3}
   */
  getMaxScore() {
    return this.instanceWrappers.reduce((sum, instanceWrapper) => {
      return sum + (
        typeof instanceWrapper.getInstance()?.getMaxScore === 'function' ?
          instanceWrapper.getInstance().getMaxScore() :
          0
      );
    }, 0);
  }

  /**
   * Show solutions.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-4}
   */
  showSolutions() {
    this.instanceWrappers.forEach((instanceWrapper) => {
      if (typeof instanceWrapper.getInstance()?.showSolutions === 'function') {
        instanceWrapper.getInstance().showSolutions();
      }
    });

    this.trigger('resize');
  }

  /**
   * Reset task.
   * @see contract at {@link https://h5p.org/documentation/developers/contracts#guides-header-5}
   */
  resetTask() {
    this.instanceWrappers.forEach((instanceWrapper) => {
      if (typeof instanceWrapper.getInstance()?.resetTask === 'function') {
        instanceWrapper.getInstance().resetTask();
      }

      instanceWrapper.setDone(
        !instanceWrapper.getInstance() || !instanceWrapper.isTask()
      );
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
        this.instanceWrappers
          .map((instanceWrapper) => instanceWrapper.getInstance())
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
      children: this.instanceWrappers.map((instanceWrapper) => {
        return instanceWrapper.instance?.getCurrentState?.() || {};
      })
    };
  }
}
