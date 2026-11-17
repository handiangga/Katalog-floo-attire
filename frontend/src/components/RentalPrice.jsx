import { rupiah } from '../lib/api';
import './rental-price.css';

export default function RentalPrice({ price, discountPrice, className = '' }) {
  const salePrice = discountPrice == null || discountPrice === '' ? NaN : Number(discountPrice);
  const onSale = Number.isFinite(salePrice) && salePrice >= 0 && salePrice < Number(price);

  return (
    <p className={`rental-price ${className}`}>
      <strong className="rental-price__current">
        <span className="sr-only">{onSale ? 'Harga diskon: ' : 'Harga sewa: '}</span>
        {rupiah(onSale ? salePrice : price)}
      </strong>
      {onSale && (
        <span className="rental-price__original">
          <span className="sr-only">Harga normal: </span>
          <s>{rupiah(price)}</s>
        </span>
      )}
    </p>
  );
}
