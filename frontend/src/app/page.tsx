import { getProducts, getRegion, getProductsByCollection, getCollections } from "@/lib/medusa";
import HomeUSPBar from "./HomeUSPBar";
import { HeroSection } from "./components/home/HeroSection";
import { CategoryGrid } from "./components/home/CategoryGrid";
import { FeaturedProducts } from "./components/home/FeaturedProducts";
import { Testimonials } from "./components/home/Testimonials";
import { CustomPaintingProcess } from "./components/home/CustomPaintingProcess";
import { BeforeAfterSection } from "./components/home/BeforeAfterSection";
import { FinalCTA } from "./components/home/FinalCTA";

export const revalidate = 60; // Revalidate every 60 seconds

async function getFeaturedProducts() {
  // Get region for pricing
  const region = await getRegion("gb");
  
  // Try to get best sellers collection first
  const collections = await getCollections();
  const bestSellersCollection = collections.find(
    (c) => c.handle === "best-sellers" || c.title?.toLowerCase().includes("best")
  );
  
  if (bestSellersCollection) {
    const products = await getProductsByCollection(bestSellersCollection.id, region?.id);
    return { products: products.slice(0, 4), region };
  }
  
  // Fallback to all products
  const { products } = await getProducts(region?.id, 4);
  return { products, region };
}

export default async function HomePage() {
  const { products, region } = await getFeaturedProducts();

  return (
    <div className="w-full">
      <HeroSection />
      <HomeUSPBar />
      <CustomPaintingProcess />
      <CategoryGrid />
      <FeaturedProducts products={products} region={region} />
      <BeforeAfterSection />
      <Testimonials />
      <FinalCTA />
    </div>
  );
}
