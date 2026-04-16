const escapeSvgText = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const getFallbackImage = (label = "FashionHub") => {
  const safeLabel = escapeSvgText(String(label || "FashionHub").slice(0, 36));

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" role="img" aria-label="${safeLabel}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f6f0e6" />
      <stop offset="100%" stop-color="#d8c6aa" />
    </linearGradient>
  </defs>
  <rect width="900" height="1200" fill="url(#bg)" />
  <rect x="72" y="72" width="756" height="1056" rx="24" fill="none" stroke="#6b5a45" stroke-opacity="0.35" />
  <text x="50%" y="49%" text-anchor="middle" dominant-baseline="middle" fill="#2d251d" font-family="Georgia, serif" font-size="54" font-weight="700">FashionHub</text>
  <text x="50%" y="55%" text-anchor="middle" dominant-baseline="middle" fill="#5a4a3a" font-family="Arial, sans-serif" font-size="24">${safeLabel}</text>
</svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export const extractProductImageUrl = (product) => {
  const firstImage = Array.isArray(product?.images) ? product.images[0] : undefined;

  if (typeof firstImage === "string" && firstImage.trim()) {
    return firstImage.trim();
  }

  if (firstImage && typeof firstImage.url === "string" && firstImage.url.trim()) {
    return firstImage.url.trim();
  }

  if (typeof product?.image === "string" && product.image.trim()) {
    return product.image.trim();
  }

  return "";
};

export const getProductImageUrl = (product, label) =>
  extractProductImageUrl(product) || getFallbackImage(label || product?.name || "FashionHub");

export const setImageFallback = (event, label = "FashionHub") => {
  if (!event?.currentTarget) return;

  const img = event.currentTarget;
  img.onerror = null;
  img.src = getFallbackImage(label);
};
