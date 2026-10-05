import { StoreProduct } from "@/lib/types";
import ImageWithFallback from "@/components/ImageWithFallback";
import Link from "next/link";
import { getProductPrice, getProductImage } from "@/lib/medusa";

const InlineProductBlock = ({ product }: { product: StoreProduct }) => {
    const price = getProductPrice(product);
    const imageUrl = getProductImage(product);

    return (
        <div className="my-10 bg-[#F9F8F6] p-6 rounded-sm border border-gray-100 shadow-sm not-prose lg:hidden">
            <p className="!text-xs !font-serif !italic !text-charcoal-light !mb-4 !border-b !border-gray-200 !pb-2 !leading-normal">
                &quot;A fitting piece for this story...&quot;
            </p>
            <div className="flex gap-4">
                <div className="!w-24 !h-24 bg-white flex-shrink-0 rounded-sm overflow-hidden border border-gray-100 relative">
                    <ImageWithFallback
                        src={imageUrl}
                        alt={product.title}
                        fill
                        className="!object-cover !w-full !h-full !absolute !inset-0 !m-0 !p-0"
                        sizes="(max-width: 768px) 96px, 96px"
                    />
                </div>
                <div className="flex flex-col justify-center flex-1">
                    <h4 className="!font-serif !text-lg !text-charcoal !leading-tight !mb-1 !mt-0 !font-normal">
                        {product.title}
                    </h4>
                    <p className="!text-terracotta !text-sm !font-bold !mb-3 !leading-normal">
                        {"$" + price.toFixed(2)}
                    </p>
                    <Link
                        href={`/product/${product.handle}`}
                        className="inline-block !text-[10px] uppercase tracking-widest !font-bold !text-charcoal !border !border-charcoal text-center py-2 px-4 hover:!bg-charcoal hover:!text-white transition-colors !no-underline"
                    >
                        View Product
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default InlineProductBlock;
