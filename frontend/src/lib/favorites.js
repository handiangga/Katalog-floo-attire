const KEY='floo-attire-favorites';
export function getFavorites(){try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}}
export function toggleFavorite(id){const old=getFavorites();const next=old.includes(id)?old.filter(x=>x!==id):[...old,id];localStorage.setItem(KEY,JSON.stringify(next));window.dispatchEvent(new Event('floo-favorites-changed'));return next;}
