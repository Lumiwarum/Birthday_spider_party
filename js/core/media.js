'use strict';
/* ---------- media ---------- */
function imgSrc(ref){
  if(!ref) return null;
  if(ref.startsWith('builtin:')) return AVATARS[+ref.slice(8)] || null;
  return state.media[ref] || null;
}
function figPlaceholder(f){
  const c = f.color || '#ff2e4d';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><radialGradient id="g" cx="50%" cy="38%" r="70%"><stop offset="0" stop-color="${c}"/><stop offset=".55" stop-color="#2a0f4d"/><stop offset="1" stop-color="#07030f"/></radialGradient><pattern id="h" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.3" fill="#fff" opacity=".22"/></pattern></defs><rect width="200" height="200" fill="url(#g)"/><rect width="200" height="200" fill="url(#h)"/><g transform="translate(40 22) scale(1.2)" opacity=".92"><g fill="#07030f" stroke="#07030f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="50" cy="57" rx="8" ry="13" stroke="none"/><circle cx="50" cy="40" r="6" stroke="none"/><path fill="none" d="M45 50L32 40L27 24M45 54L28 49L16 40M45 60L29 66L20 79M46 65L36 77L33 92M55 50L68 40L73 24M55 54L72 49L84 40M55 60L71 66L80 79M54 65L64 77L67 92"/></g></g><text x="100" y="186" text-anchor="middle" font-family="Arial Black,Impact,sans-serif" font-size="26" font-weight="900" fill="#fff" stroke="#000" stroke-width="5" paint-order="stroke">${esc(initials(f.nameEn))}</text></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const figSrc = f => imgSrc(f.image) || FIGURE_IMAGES[f.id]?.portrait || figPlaceholder(f);
// для раскрытия: фигурка целиком, если ведущий не загрузил своё фото
const figFullSrc = f => !f.image && FIGURE_IMAGES[f.id]?.full;
function readImage(file, max = 520){
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = reject;
    fr.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const cv = document.createElement('canvas'); cv.width = Math.round(img.width*k); cv.height = Math.round(img.height*k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
        let url = cv.toDataURL('image/webp', .85);
        if(!url.startsWith('data:image/webp')) url = cv.toDataURL('image/png');
        resolve(url);
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}


let uploadTarget = null;
