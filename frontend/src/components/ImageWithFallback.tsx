"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";
import { ImageOff } from "lucide-react";

interface ImageWithFallbackProps extends ImageProps {
    fallbackText?: string;
}

const ImageWithFallback = ({
    fallbackText = "Image Failed to Load",
    src,
    alt,
    className,
    ...props
}: ImageWithFallbackProps) => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
        return (
            <div
                className={`flex flex-col items-center justify-center bg-gray-50 border border-gray-200 text-gray-400 ${className}`}
                style={{ width: "100%", height: "100%", minHeight: "200px" }}
                role="img"
                aria-label={alt || fallbackText}
            >
                <ImageOff className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">{fallbackText}</span>
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            className={className}
            onError={() => setHasError(true)}
            {...props}
        />
    );
};

export default ImageWithFallback;
