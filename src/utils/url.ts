export const updateBrowserUrl = (
  videoAUrl: string,
  videoBUrl: string,
  time: number
) => {
  const params = new URLSearchParams();

  params.set('a', videoAUrl);
  params.set('b', videoBUrl);

  if (typeof time === 'number') {
    params.set('t', time.toFixed(3));
  }

  window.history.replaceState(null, '', `?${params.toString()}`);
};

export const getInitialTime = () => {
  const params = new URLSearchParams(window.location.search);

  return Number(params.get('t') || 0);
};

export const getInitialUrl = (
  key: string,
  fallback: string
) => {
  const params = new URLSearchParams(window.location.search);

  return params.get(key) || fallback;
};