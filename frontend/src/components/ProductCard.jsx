import { Link } from 'react-router-dom';
import { MessageCircle, Shirt, Tag } from 'lucide-react';
import { imageUrl, rupiah, waLink } from '../lib/api';
import FavoriteButton from './FavoriteButton';
import './product-card.css';

export default function ProductCard({ product, whatsapp }) {
  const detailPath = '/produk/' + product.slug;
  const photo = product.images?.[0];
  const category = product.category || 'Koleksi';
  const sizes = product.sizes || 'S - XL';

  return (
    <article className="product-card">
      <div className="relative">
        <Link to={detailPath} className="product-image" aria-label={product.name}>
          {photo ? (
            <img src={imageUrl(photo.url)} alt={product.name} loading="lazy" />
          ) : (
            <span className="product-card__placeholder">Foto kebaya</span>
          )}
        </Link>
        <FavoriteButton id={product.id} />
      </div>
      <div className="product-info">
        <Link to={detailPath}>
          <h3 className="product-card__title" title={product.name}>{product.name}</h3>
          <p className="product-price">{rupiah(product.price)}</p>
        </Link>
        <p className="product-card__metadata">
          <span className="product-card__attribute">
            <Tag size={14} aria-hidden="true" />
            <span title={category}>{category}</span>
          </span>
          <span className="product-card__attribute">
            <Shirt size={14} aria-hidden="true" />
            <span title={sizes}>{sizes}</span>
          </span>
        </p>
        {whatsapp && (
          <a
            href={waLink(whatsapp, product)}
            target="_blank"
            rel="noreferrer"
            className="btn product-card__booking"
          >
            <MessageCircle size={17} aria-hidden="true" />
            <span>Booking via WhatsApp</span>
          </a>
        )}
      </div>
    </article>
  );
}
