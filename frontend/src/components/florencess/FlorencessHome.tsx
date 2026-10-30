import { FL_ALSO_PRODUCTS, FL_SALE_PRODUCTS } from "@/lib/florencess-products";
import CategoryMosaic from "./CategoryMosaic";
import HeroSlider from "./HeroSlider";
import ProductSection from "./ProductSection";
import SocialNewsletter from "./SocialNewsletter";
import UspStrip from "./UspStrip";

export default function FlorencessHome() {
  return (
    <div className="fl-root">
      <HeroSlider />
      <UspStrip />
      <ProductSection title="WAREHOUSE SALE FOR $9.99" products={FL_SALE_PRODUCTS} />
      <CategoryMosaic />
      <ProductSection title="YOU MAY ALSO LIKE" products={FL_ALSO_PRODUCTS} tight />
      <SocialNewsletter />
    </div>
  );
}
