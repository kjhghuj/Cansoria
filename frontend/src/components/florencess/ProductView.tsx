import Link from "next/link";
import ProductBuy from "./ProductBuy";
import ProductGallery from "./ProductGallery";
import ProductTabs from "./ProductTabs";
import {
  type FlCategory,
  type FlProduct,
  flRelatedProducts,
  flHasVerifiedDiscount,
} from "@/lib/florencess-catalog";

type Props = {
  product: FlProduct;
  category?: FlCategory;
};

export default function ProductView({ product, category }: Props) {
  const related = flRelatedProducts(product, 8);
  const galleryImages = product.localImages.filter(
    (image, index, images) => images.findIndex((candidate) => candidate.src === image.src) === index,
  );
  return (
    <>
      <div className="fl-container">
        <ol className="fl-breadcrumb">
          <li>
            <Link href="/">Home</Link>
          </li>
          {category ? (
            <li>
              <Link href={`/${category.slug}`}>{category.title}</Link>
            </li>
          ) : null}
          <li>{product.title}</li>
        </ol>
      </div>

      <div className="fl-container">
        <div className="fl-pdp">
          <ProductGallery images={galleryImages} title={product.title} />

          <div className="fl-pdp__info">
            <h1 className="fl-pdp__title">{product.title}</h1>
            <div className="fl-pdp__meta">
              <span>Model: {product.model}</span>
              {product.brand ? <span>{product.brand}</span> : null}
              <span>Online availability: pending store verification</span>
            </div>

            <div className="fl-pdp__price">
              <span>{product.price}</span>
              {flHasVerifiedDiscount(product) && product.oldPrice ? (
                <span className="fl-pdp__price-old">{product.oldPrice}</span>
              ) : null}
              {flHasVerifiedDiscount(product) && product.discount ? (
                <span className="fl-pdp__discount">{product.discount}</span>
              ) : null}
            </div>

            {product.description ? (
              <p className="fl-pdp__desc">{product.description}</p>
            ) : null}

            <ProductBuy product={product} />

            <ul className="fl-pdp__facts">
              <li>Model {product.model}</li>
              {product.brand ? <li>Brand {product.brand}</li> : null}
              <li>Prices are shown in {product.currency}.</li>
            </ul>
          </div>
        </div>

        <ProductTabs product={product} related={related} />
      </div>
    </>
  );
}
