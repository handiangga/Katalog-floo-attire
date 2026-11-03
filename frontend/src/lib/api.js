export const API = import.meta.env.VITE_API_URL || "";
export async function request(url, options = {}) {
  const res = await fetch(API + "/api" + url, {
    ...options,
    headers: {
      ...(options.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
  });
  const data = await res
    .json()
    .catch(() => ({ error: "Server tidak merespons" }));
  if (!res.ok) throw new Error(data.error || "Permintaan gagal");
  return data;
}
export function imageUrl(url) {
  return url ? API + url : null;
}
export const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
export function waLink(number, product) {
  return (
    "https://wa.me/" +
    number +
    "?text=" +
    encodeURIComponent(
      `Halo Floo Attire, saya ingin bertanya ketersediaan kebaya ${product.name}.Untuk tanggal .... sewanya. Terima kasih.`,
    )
  );
}
