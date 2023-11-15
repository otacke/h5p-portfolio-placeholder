/**
 * Mixin for API functions for parent content types
 */
export default class API {
  /**
   * Find field by subContentId.
   * @param {string} subContentId SubContentId to look for.
   * @returns {object|null} Field data.
   */
  findField(subContentId) {
    return this.fields.find((field) => {
      return field.instanceWrapper.getInstance().subContentId === subContentId;
    }) || null;
  }

  /**
   * Get instances.
   * @returns {H5P.ContentType[]} H5P instances. Interface for parent.
   */
  getInstances() {
    return this.fields.map((field) => field.instanceWrapper.getInstance());
  }

  /**
   * Get instances' semantics.
   * @returns {object[]} H5P instance semantics.
   */
  getInstancesSemantics() {
    return this.params.fields.map((field) => field.content);
  }
}
