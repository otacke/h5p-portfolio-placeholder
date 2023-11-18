/**
 * Customize H5P content parameters before creating instance.
 * @param {string} machineName Content type's machine name.
 * @param {object} params H5P content parameters.
 * @returns {object} Customized H5P content parameters.
 */
export const customizeParameters = (machineName, params = {}) => {
  // Prevent video from growing endlessly since height is unlimited
  if (machineName === 'H5P.Video') {
    params.visuals.fit = (
      params?.sources?.length > 0 &&
      ['video/mp4', 'video/webm', 'video/ogg']
        .includes(params.sources[0].mime)
    );
  }

  // Prevent audio from overflowing placeholder field
  if (machineName === 'H5P.Audio') {
    params.fitToWrapper = true;
  }

  return params;
};

/**
 * Customize H5P content instance.
 * @param {string} machineName Instance's machine name.
 * @param {object} instance Instance.
 * @param {object} [params] Parameters.
 * @param {string} [params.imageHeightLimit] Image height limit.
 */
export const customizeInstance = (machineName, instance, params = {}) => {
  if (!machineName || !instance) {
    return;
  }

  if (
    machineName === 'H5P.Image' &&
    params.imageHeightLimit &&
    instance.$img
  ) {
    const image = instance.$img.get(0);
    image.style.maxHeight = params.imageHeightLimit;

    // Screenshot module cannot handle object-fit. Workaround by deriving max-width, too
    instance.on('loaded', () => {
      const imageRatio = image.naturalWidth / image.naturalHeight;
      const maxWidth = `calc(${params.imageHeightLimit} * ${imageRatio})`;
      image.parentNode.style.maxWidth = maxWidth;
    });
  }
};

/**
 * Customize H5P content DOM.
 * @param {HTMLElement} dom H5P content wrapper.
 * @param {H5P.ContentType} instance H5P content.
 * @param {H5P.ContentType} mainInstance Parent H5P content.
 * @param {object} [instanceWrapper] Instance wrapper.
 */
export const customizeDOM = (dom, instance, mainInstance, instanceWrapper) => {
  if (!dom || !instance) {
    return;
  }

  const machineName = instance.libraryInfo?.machineName;

  // Add subcontent DOM customization if required
  if (machineName === 'H5P.Image') {
    // Ensure image placeholder has height
    const image = dom.querySelector('.h5p-image > img');
    if (!image) {
      const placeholder =
        dom.querySelector('.h5p-image > .h5p-placeholder');

      if (placeholder) {
        placeholder.parentNode.style.height = '10rem';
      }
    }
  }
  else if (machineName === 'H5P.Audio') {
    // Fix to H5P.Audio pending since January 2021 (https://github.com/h5p/h5p-audio/pull/48/files)
    const audio = dom.querySelector('.h5p-audio');
    if (audio) {
      audio.style.height = (
        !!window.chrome &&
        instance.params?.playerMode === 'full'
      ) ?
        '54px' : // Chromium based browsers like Chrome, Edge or Opera need explicit default height
        '100%';
    }
  }
  else if (machineName === 'H5P.ImageHotspots') {
    // Fix resize issue (Image Hotspots sets absolute width)
    mainInstance.on('resize', () => {
      clearTimeout(instanceWrapper.timeoutImageHotspots);
      instanceWrapper.timeoutImageHotspots = setTimeout(() => {
        const container =
          dom.querySelector('.h5p-image-hotspots-container');

        if (container) {
          container.style.width = '';
          container.style.height = '';
        }
        const image =
          dom.querySelector('.h5p-image-hotspots-background');
        if (image) {
          image.style.width = '';
          image.style.height = '';
        }

        // Will lead ImageHotspots to use static font size
        instance.initialWidth = null;
        instance.resize?.();
      }, 0);
    });
  }
};

/**
 * Remove fullscreen buttons from content.
 * @param {H5P.ContentType} instance H5P content instance.
 */
export const removeFullscreenButtons = (instance) => {
  if (!instance) {
    return;
  }

  const machineName = instance.libraryInfo?.machineName;

  if (machineName === 'H5P.CoursePresentation') {
    if (instance.$fullScreenButton) {
      instance.$fullScreenButton.remove();
    }
  }
  else if (machineName === 'H5P.InteractiveVideo') {
    instance.on('controls', function () {
      if (instance.controls?.$fullscreen) {
        instance.controls?.$fullscreen?.remove();
      }
    });
  }
};
