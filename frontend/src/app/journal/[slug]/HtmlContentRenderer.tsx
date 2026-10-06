import parse, { DOMNode, Element } from "html-react-parser";
import { StoreProduct } from "@/lib/types";
import InlineProductBlock from "@/components/journal/InlineProductBlock";
import { sanitizeArticleHtml } from "@/lib/html-safety";

interface HtmlContentRendererProps {
    content: string;
    productsMap: Map<string, StoreProduct>;
    featuredProduct: StoreProduct | null | undefined;
}

// Helper to recursively extract text from a node tree
const getText = (node: unknown): string => {
    if (typeof node !== "object" || node === null) {
        return "";
    }
    if ("data" in node && typeof node.data === "string") {
        return node.data;
    }
    if (node instanceof Element && node.children) {
        return node.children.map((child) => getText(child)).join("");
    }
    return "";
};

export default function HtmlContentRenderer({
    content,
    productsMap,
    featuredProduct,
}: HtmlContentRendererProps) {
    const options = {
        replace: (domNode: DOMNode) => {
            // Only replace block-level elements (paragraphs) to avoid <p><div> nesting errors (Hydration mismatch)
            if (domNode instanceof Element && domNode.name === "p") {
                const text = getText(domNode).trim();

                // Match [product] OR [product:handle] strictly as the only content
                const match = text.match(/^\[product(?::([a-zA-Z0-9-]+))?\]$/);

                if (match) {
                    const handle = match[1];
                    if (handle) {
                        const product = productsMap.get(handle);
                        if (product) return <InlineProductBlock product={product} />;
                    } else {
                        // [product] shortcode -> use featuredProduct
                        if (featuredProduct) return <InlineProductBlock product={featuredProduct} />;
                    }
                }
            }
        },
    };

    return <>{parse(sanitizeArticleHtml(content), options)}</>;
}
