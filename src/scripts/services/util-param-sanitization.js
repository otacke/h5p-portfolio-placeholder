import Util from '@services/util.js';

/**
 * Sanitize image height limit. Not covering all cases ...
 * @param {string} originalLength Original CSS length.
 * @returns {string|undefined} Image height limit or undefined.
 */
const sanitizeImageHeightLimit = (originalLength) => {
  if (typeof originalLength !== 'string') {
    return;
  }

  // Remove space characters
  originalLength = originalLength.replace(/ /, '');

  // Assume px if no unit is attached
  if (!isNaN(Number(originalLength))) {
    originalLength = `${originalLength}px`;
  }

  return originalLength;
};

/**
 * Sanitize parameters.
 * @param {object} params Parameters passed by the editor.
 * @returns {object} Sanitized parameters.
 */
export const sanitize = (params) => {
  let sanitzedParams = Util.extend(
    {
      placeholder: {
        arrangement: '1',
        fields: [],
      },
    }, params);

  // Sanitize image height limit
  sanitzedParams.placeholder.imageHeightLimit =
    sanitizeImageHeightLimit(
      sanitzedParams.placeholder.imageHeightLimit,
    );

  // Sanitize grow proportion
  sanitzedParams.placeholder.fields = sanitzedParams.placeholder.fields
    .map((field) => {
      field.width = field.width ?? 100;
      field.verticalAlignment = field.verticalAlignment ?? 'top';
      return field;
    });

  sanitzedParams = sanitzedParams.placeholder;

  // Sanitize field parameters
  const numberOfFields = sanitzedParams.arrangement
    .split('-')
    .reduce((sum, summand) => sum + parseInt(summand), 0);

  // Ensure correct number of fields
  sanitzedParams.fields = sanitzedParams.fields.slice(0, numberOfFields);
  while (sanitzedParams.fields.length < numberOfFields) {
    sanitzedParams.fields.push({});
  }

  return sanitzedParams;
};
