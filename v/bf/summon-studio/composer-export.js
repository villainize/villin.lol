// Render the same styled DOM used by the preview, including object-fit and text.
window.exportComposition = async function(stage) {
  await document.fonts.ready;
  const bounds = stage.getBoundingClientRect();
  const clone = stage.cloneNode(true);
  const originals = [stage, ...stage.querySelectorAll('*')];
  const copies = [clone, ...clone.querySelectorAll('*')];
  const assets = new Map();
  async function embed(url) {
    const absolute = new URL(url, location.href).href;
    if (!assets.has(absolute)) assets.set(absolute, (async () => {
      const response = await fetch(absolute);
      if (!response.ok) throw new Error('Could not load an image for export.');
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        response.blob().then(blob => reader.readAsDataURL(blob), reject);
      });
    })());
    return assets.get(absolute);
  }
  for (let i = 0; i < originals.length; i++) {
    const source = originals[i], target = copies[i], css = getComputedStyle(source);
    target.removeAttribute('class');
    target.removeAttribute('id');
    target.style.cssText = '';
    for (const property of css) target.style.setProperty(property, css.getPropertyValue(property));
    target.style.outline = 'none';
    target.style.animation = 'none';
    target.style.transition = 'none';
    if (source.classList.contains('resize-handle')) target.style.display = 'none';
    if (source.tagName === 'IMG') {
      target.src = await embed(source.currentSrc || source.src);
      target.removeAttribute('srcset');
      target.removeAttribute('loading');
    }
    if (css.backgroundImage !== 'none') {
      const match = css.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/);
      if (match) target.style.backgroundImage = `url("${await embed(match[1])}")`;
    }
  }
  Object.assign(clone.style, {
    width: bounds.width + 'px', height: bounds.height + 'px',
    position: 'relative', left: '0', top: '0', margin: '0',
    transform: 'none', boxShadow: 'none', overflow: 'hidden'
  });
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${bounds.width}" height="${bounds.height}" viewBox="0 0 ${bounds.width} ${bounds.height}"><foreignObject width="100%" height="100%">${markup}</foreignObject></svg>`;
  const rendered = new Image();
  await new Promise((resolve, reject) => {
    rendered.onload = resolve;
    rendered.onerror = () => reject(new Error('The browser could not render the composition.'));
    rendered.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const output = document.createElement('canvas');
  output.width = output.height = 1024;
  output.getContext('2d').drawImage(rendered, 0, 0, 1024, 1024);
  return await new Promise((resolve, reject) => output.toBlob(blob => {
    if (blob) resolve(blob); else reject(new Error('PNG export failed.'));
  }, 'image/png'));
};
