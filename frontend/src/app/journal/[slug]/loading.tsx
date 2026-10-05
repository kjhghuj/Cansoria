export default function ArticleLoading() {
    return (
        <div className="bg-cream min-h-screen pt-[72px] lg:pt-[88px] animate-pulse">
            {/* Header Skeleton */}
            <header className="max-w-[1000px] mx-auto px-6 lg:px-8 pt-12 lg:pt-24 pb-12 text-center">
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="h-3 bg-gray-200 rounded w-3"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="h-12 lg:h-16 bg-gray-200 rounded w-3/4 mx-auto mb-8"></div>
                <div className="flex items-center justify-center gap-4">
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                    <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                    <div className="w-1 h-1 bg-gray-200 rounded-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-32"></div>
                </div>
            </header>

            {/* Hero Image Skeleton */}
            <div className="w-full max-w-[1200px] mx-auto px-4 lg:px-8 mb-16 lg:mb-24">
                <div className="aspect-[3/2] lg:aspect-[21/9] bg-gray-200 rounded-sm"></div>
            </div>

            {/* Content Skeleton */}
            <div className="max-w-[1200px] mx-auto px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 mb-24">
                <div className="lg:col-span-9 lg:pr-12 space-y-6">
                    <div className="flex gap-6 mb-12 border-b border-gray-100 pb-6">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="flex gap-4 ml-auto">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="h-5 w-5 bg-gray-200 rounded"></div>
                            ))}
                        </div>
                    </div>

                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="space-y-3">
                            <div className="h-5 bg-gray-200 rounded w-full"></div>
                            <div className="h-5 bg-gray-200 rounded w-11/12"></div>
                            <div className="h-5 bg-gray-200 rounded w-4/5"></div>
                        </div>
                    ))}
                </div>

                {/* Sidebar Skeleton */}
                <div className="hidden lg:block lg:col-span-3 pl-8 border-l border-gray-100">
                    <div className="space-y-4">
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                        <div className="aspect-[4/5] bg-gray-200 rounded-sm"></div>
                        <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-200 rounded w-16"></div>
                        <div className="h-10 bg-gray-200 rounded w-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
