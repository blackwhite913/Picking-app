export function isZebraDevice() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  const uaDataBrands = navigator.userAgentData?.brands
    ? navigator.userAgentData.brands.map((b) => b.brand).join(' ')
    : '';

  const zebraFlag =
    typeof import.meta !== 'undefined' &&
    import.meta.env &&
    import.meta.env.VITE_ZEBRA_MODE === 'true';

  const zebraPattern = /Zebra|TC21/i;

  return zebraFlag || zebraPattern.test(ua) || zebraPattern.test(uaDataBrands);
}

