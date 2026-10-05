export default function JournalLoading() {
    return (
        <div className="bg-cream min-h-screen pt-[72px] lg:pt-[88px] animate-pulse">
            {/* Hero Skeleton */}
            <section className="relative w-full h-[75vh] lg:h-[650px] flex flex-col lg:flex-row overflow-hidden bg-[#F5F3EF]">
                <div className="w-full lg:w-[55%] h-full bg-gray-200 order-1 lg:order-2"></div>
                <div className="absolute bottom-0 left-0 w-full p-8 lg:static lg:w-[45%] lg:bg-cream lg:flex lg:flex-col lg:justify-center lg:px-20 lg:py-0 order-2 lg:order-1 z-10">
                    <div className="space-y-4">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-10 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-20 bg-gray-200 rounded w-full hidden md:block"></div>
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                    </div>
                </div>
            </section>

            {/* Filter Bar Skeleton */}
            <div className="sticky top-[72px] lg:top-[88px] z-30 bg-cream/95 border-b border-gray-200 py-4">
                <div className="max-w-[1400px] mx-auto px-6 lg:px-8 flex gap-4 lg:justify-center">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="h-8 bg-gray-200 rounded-full w-24"></div>
                    ))}
                </div>
            </div>

            {/* Article Grid Skeleton */}
            <section className="max-w-[1400px] mx-auto px-6 lg:px-8 py-16 lg:py-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="space-y-4">
                            <div className="aspect-[3/2] bg-gray-200 rounded-sm"></div>
                            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                            <div className="h-16 bg-gray-200 rounded w-full"></div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
