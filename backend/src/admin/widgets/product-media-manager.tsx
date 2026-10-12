import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Toaster, toast, Badge, clx } from "@medusajs/ui"
import { useState, useEffect, useRef, useCallback } from "react"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Photo, XMark, Plus } from "@medusajs/icons"

// ============================================================================
// Type Definitions
// ============================================================================

interface ProductImage {
    id: string
    url: string
}

interface ProductVariant {
    id: string
    title: string
    sku?: string
    metadata?: {
        images?: { url: string }[]
    }
}

interface MediaView { productId: string }
interface MediaOperation { view: MediaView; productId: string }

// ============================================================================
// Custom Media Manager Widget
// ============================================================================

const ProductMediaManagerWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
    const [images, setImages] = useState<ProductImage[]>([])
    const [thumbnail, setThumbnail] = useState<string>("")
    const [variants, setVariants] = useState<ProductVariant[]>([])
    const [isUploading, setIsUploading] = useState(false)
    const [isRemoving, setIsRemoving] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [showVariantSelector, setShowVariantSelector] = useState<string | null>(null)
    const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set())
    const [loadedView, setLoadedView] = useState<MediaView | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const viewRef = useRef<MediaView>({ productId: data.id })
    const operationRef = useRef<MediaOperation | null>(null)
    const refreshRequestRef = useRef<object | null>(null)
    const variantRequestRef = useRef<object | null>(null)
    const mountedRef = useRef(true)
    // Invalidate old handlers immediately, including A -> B -> A navigation.
    if (viewRef.current.productId !== data.id) {
        viewRef.current = { productId: data.id }
        operationRef.current = null
        refreshRequestRef.current = null
        variantRequestRef.current = null
    }
    const view = viewRef.current
    const isCurrentView = (target: MediaView) => mountedRef.current && viewRef.current === target
    const isCurrentOperation = (operation: MediaOperation) =>
        isCurrentView(operation.view) && operationRef.current === operation
    const beginOperation = () => {
        if (!isCurrentView(view) || loadedView !== view || operationRef.current) return null
        const operation = { view, productId: view.productId }
        operationRef.current = operation
        refreshRequestRef.current = null
        return operation
    }
    const finishOperation = (operation: MediaOperation) => {
        if (!isCurrentOperation(operation)) return
        operationRef.current = null
        setIsUploading(false)
        setIsRemoving(null)
        setIsSaving(false)
    }
    const isBusy = isUploading || isRemoving !== null || isSaving

    // --------------------------------------------------------------------------
    // Load Data
    // --------------------------------------------------------------------------

    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            operationRef.current = null
            refreshRequestRef.current = null
            variantRequestRef.current = null
        }
    }, [])

    const loadProductData = useCallback(async () => {
        if (isCurrentView(view) && !operationRef.current) {
            const request = {}
            variantRequestRef.current = request
            refreshRequestRef.current = null
            console.log('[MediaManager] Loading product data:', data.id)
            setImages(data.images || [])
            setThumbnail(data.thumbnail || "")
            setVariants([])
            setSelectedImages(new Set())
            setShowVariantSelector(null)
            setIsUploading(false)
            setIsRemoving(null)
            setIsSaving(false)
            setLoadedView(view)

            // Load variants
            try {
                const response = await fetch(`/admin/products/${view.productId}/variants?limit=100`, {
                    credentials: 'include',
                })
                if (response.ok) {
                    const result = await response.json()
                    if (!isCurrentView(view) || variantRequestRef.current !== request) return
                    setVariants(result.variants || [])
                }
            } catch (error) {
                if (isCurrentView(view) && variantRequestRef.current === request) {
                    console.error('[MediaManager] Failed to load variants:', error)
                }
            }
        }
    }, [data, view])

    useEffect(() => {
        loadProductData()
    }, [loadProductData])

    // --------------------------------------------------------------------------
    // Hide Native Media Section
    // --------------------------------------------------------------------------

    useEffect(() => {
        // 注入 CSS 样式强制隐藏
        const styleId = 'hide-native-media-style'
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style')
            style.id = styleId
            style.textContent = `
                [data-hide-native-media="true"] {
                    display: none !important;
                    visibility: hidden !important;
                    height: 0 !important;
                    overflow: hidden !important;
                }
            `
            document.head.appendChild(style)
        }

        // 隐藏原生媒体区域
        const hideNativeMedia = () => {
            const headings = document.querySelectorAll('h2')
            headings.forEach(heading => {
                const text = heading.textContent?.trim() || ''
                // 只匹配 "媒体" 但不匹配 "媒体管理"
                if (text === '媒体' || text === 'Media') {
                    let parent = heading.parentElement
                    for (let i = 0; i < 8 && parent; i++) {
                        // 跳过已处理的
                        if (parent.getAttribute('data-hide-native-media') === 'true') return

                        const cls = parent.className || ''
                        // 找到带有 shadow 或 rounded 的容器
                        if (cls.includes('shadow') || cls.includes('rounded-lg')) {
                            parent.setAttribute('data-hide-native-media', 'true')
                            console.log('[MediaManager] Hidden native media section')
                            return
                        }
                        parent = parent.parentElement
                    }
                }
            })
        }

        // 多次执行以确保隐藏
        const t1 = setTimeout(hideNativeMedia, 100)
        const t2 = setTimeout(hideNativeMedia, 300)
        const t3 = setTimeout(hideNativeMedia, 600)
        const t4 = setTimeout(hideNativeMedia, 1000)

        // 监听 DOM 变化
        const observer = new MutationObserver(() => setTimeout(hideNativeMedia, 50))
        observer.observe(document.body, { childList: true, subtree: true })

        return () => {
            clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4)
            observer.disconnect()
        }
    }, [])

    // --------------------------------------------------------------------------
    // Refresh Product Data
    // --------------------------------------------------------------------------

    const refreshProductData = async (operation: MediaOperation) => {
        if (!isCurrentOperation(operation)) return
        const request = {}
        refreshRequestRef.current = request
        try {
            const response = await fetch(`/admin/products/${operation.productId}`, {
                credentials: 'include',
            })
            if (response.ok) {
                const result = await response.json()
                if (!isCurrentOperation(operation) || refreshRequestRef.current !== request) return
                if (result.product?.id === operation.productId) {
                    setImages(result.product.images || [])
                    setThumbnail(result.product.thumbnail || "")
                    const remainingUrls = new Set((result.product.images || []).map((image: ProductImage) => image.url))
                    setSelectedImages(previous => new Set([...previous].filter(url => remainingUrls.has(url))))
                    console.log('[MediaManager] Data refreshed')
                }
            }
        } catch (error) {
            if (isCurrentOperation(operation) && refreshRequestRef.current === request) {
                console.error('[MediaManager] Failed to refresh data:', error)
            }
        }
    }

    // --------------------------------------------------------------------------
    // Upload Handler
    // --------------------------------------------------------------------------

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget
        const files = input.files
        if (!files || files.length === 0) return
        const operation = beginOperation()
        if (!operation) return

        setIsUploading(true)

        try {
            const formData = new FormData()
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i])
            }

            const uploadResponse = await fetch('/admin/uploads', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!uploadResponse.ok) throw new Error('Upload failed')

            const uploadResult = await uploadResponse.json()
            if (!isCurrentOperation(operation)) return
            const uploadedImages = uploadResult.files || []

            const newImages = [
                ...images.map(img => ({ url: img.url })),
                ...uploadedImages.map((file: { url: string }) => ({ url: file.url }))
            ]

            const updateResponse = await fetch(`/admin/products/${operation.productId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ images: newImages }),
            })

            if (!updateResponse.ok) throw new Error('Failed to update product')
            if (!isCurrentOperation(operation)) return
            await refreshProductData(operation)
            if (!isCurrentOperation(operation)) return
            toast.success("上传成功", { description: `已上传 ${uploadedImages.length} 张图片` })

        } catch (error) {
            if (isCurrentOperation(operation)) {
                console.error('[MediaManager] Upload error:', error)
                toast.error("上传失败")
            }
        } finally {
            if (isCurrentOperation(operation)) input.value = ''
            finishOperation(operation)
        }
    }

    // --------------------------------------------------------------------------
    // Remove image references; retain stored assets for any other references.
    // --------------------------------------------------------------------------

    const handleRemoveImage = async (imageUrl: string) => {
        if (!images.some(image => image.url === imageUrl)) return
        const operation = beginOperation()
        if (!operation) return
        setIsRemoving(imageUrl)

        try {
            const newImages = images.filter(img => img.url !== imageUrl).map(img => ({ url: img.url }))
            const newThumbnail = thumbnail === imageUrl ? "" : undefined

            const updatePayload: { images: { url: string }[]; thumbnail?: string } = { images: newImages }
            if (newThumbnail !== undefined) updatePayload.thumbnail = newThumbnail

            const updateResponse = await fetch(`/admin/products/${operation.productId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            })

            if (!updateResponse.ok) throw new Error('Failed to update product')
            if (!isCurrentOperation(operation)) return
            await refreshProductData(operation)
            if (!isCurrentOperation(operation)) return
            toast.success("图片已从商品移除", { description: "存储文件保留，其他引用不受影响" })

        } catch (error) {
            if (isCurrentOperation(operation)) {
                console.error('[MediaManager] Remove image error:', error)
                toast.error("移除失败")
            }
        } finally {
            finishOperation(operation)
        }
    }

    // --------------------------------------------------------------------------
    // Batch Remove Handler
    // --------------------------------------------------------------------------

    const handleBatchRemove = async () => {
        if (selectedImages.size === 0) return
        const operation = beginOperation()
        if (!operation) return

        setIsRemoving('batch')
        const urlsToRemove = Array.from(selectedImages)

        try {
            // Filter out selected images
            const newImages = images
                .filter(img => !selectedImages.has(img.url))
                .map(img => ({ url: img.url }))

            // Remove the product thumbnail reference if selected.
            const newThumbnail = selectedImages.has(thumbnail) ? "" : undefined
            const updatePayload: { images: { url: string }[]; thumbnail?: string } = { images: newImages }
            if (newThumbnail !== undefined) updatePayload.thumbnail = newThumbnail

            const updateResponse = await fetch(`/admin/products/${operation.productId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload),
            })

            if (!updateResponse.ok) throw new Error('Failed to update product')
            if (!isCurrentOperation(operation)) return
            setSelectedImages(new Set())
            await refreshProductData(operation)
            if (!isCurrentOperation(operation)) return
            toast.success("图片已从商品移除", { description: `已移除 ${urlsToRemove.length} 张图片的商品引用，存储文件保留` })

        } catch (error) {
            if (isCurrentOperation(operation)) {
                console.error('[MediaManager] Batch remove error:', error)
                toast.error("批量移除失败")
            }
        } finally {
            finishOperation(operation)
        }
    }

    // Toggle image selection
    const toggleImageSelection = (imageUrl: string) => {
        if (!isCurrentView(view) || loadedView !== view || operationRef.current) return
        setSelectedImages(prev => {
            const newSet = new Set(prev)
            if (newSet.has(imageUrl)) {
                newSet.delete(imageUrl)
            } else {
                newSet.add(imageUrl)
            }
            return newSet
        })
    }

    // Select/deselect all
    const toggleSelectAll = () => {
        if (!isCurrentView(view) || loadedView !== view || operationRef.current) return
        if (selectedImages.size === images.length) {
            setSelectedImages(new Set())
        } else {
            setSelectedImages(new Set(images.map(img => img.url)))
        }
    }

    // --------------------------------------------------------------------------
    // Set Thumbnail Handler
    // --------------------------------------------------------------------------

    const handleSetThumbnail = async (imageUrl: string) => {
        if (!images.some(image => image.url === imageUrl)) return
        const operation = beginOperation()
        if (!operation) return
        setIsSaving(true)
        try {
            const response = await fetch(`/admin/products/${operation.productId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ thumbnail: imageUrl }),
            })
            if (!response.ok) throw new Error('Failed to set thumbnail')
            if (!isCurrentOperation(operation)) return
            setThumbnail(imageUrl)
            toast.success("缩略图已设置")
        } catch (error) {
            if (isCurrentOperation(operation)) toast.error("设置失败")
        } finally {
            finishOperation(operation)
        }
    }

    // --------------------------------------------------------------------------
    // Set Variant Image Handler
    // --------------------------------------------------------------------------

    const handleSetVariantImage = async (imageUrl: string, variantId: string) => {
        const variant = variants.find(v => v.id === variantId)
        if (!variant || !images.some(image => image.url === imageUrl)) return
        const operation = beginOperation()
        if (!operation) return
        variantRequestRef.current = null
        setIsSaving(true)
        try {
            // 覆盖模式：一个变体只能关联一张图片
            const newImages = [{ url: imageUrl }]

            const response = await fetch(`/admin/products/${operation.productId}/variants/${variantId}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metadata: {
                        ...variant?.metadata,
                        images: newImages
                    }
                }),
            })

            if (!response.ok) throw new Error('Failed to update variant')
            if (!isCurrentOperation(operation)) return

            // Update local state
            setVariants(prev => prev.map(v =>
                v.id === variantId
                    ? { ...v, metadata: { ...v.metadata, images: newImages } }
                    : v
            ))

            toast.success("已关联到变体", { description: variant?.title || variantId })
        } catch (error) {
            if (isCurrentOperation(operation)) {
                console.error('[MediaManager] Set variant image error:', error)
                toast.error("设置失败")
            }
        } finally {
            if (isCurrentOperation(operation)) setShowVariantSelector(null)
            finishOperation(operation)
        }
    }

    // --------------------------------------------------------------------------
    // Utility
    // --------------------------------------------------------------------------

    const getVariantCountForImage = (imageUrl: string): number => {
        return variants.filter(v =>
            (v.metadata?.images as { url: string }[] | undefined)?.some(img => img.url === imageUrl)
        ).length
    }

    const showVariantsForImage = (imageUrl: string | null) => {
        if (!isCurrentView(view) || loadedView !== view || operationRef.current) return
        setShowVariantSelector(imageUrl)
    }

    // --------------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------------

    // Until this view's state is loaded, never expose the previous product's handlers.
    if (loadedView !== view) return <Container><Text size="small">正在加载媒体...</Text></Container>

    return (
        <Container className="divide-y p-0">
            <Toaster />

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <Photo className="text-ui-fg-subtle w-4 h-4" />
                    <Heading level="h2">媒体管理</Heading>
                    <Badge color="blue" size="xsmall">{images.length}</Badge>
                    {selectedImages.size > 0 && (
                        <Badge color="orange" size="xsmall">已选 {selectedImages.size}</Badge>
                    )}
                </div>
                <div className="flex gap-2">
                    {images.length > 0 && (
                        <Button
                            variant="secondary"
                            size="small"
                            onClick={toggleSelectAll}
                            disabled={isBusy}
                        >
                            {selectedImages.size === images.length ? '取消全选' : '全选'}
                        </Button>
                    )}
                    {selectedImages.size > 0 && (
                        <Button
                            variant="danger"
                            size="small"
                            onClick={handleBatchRemove}
                            disabled={isBusy}
                        >
                            {isRemoving === 'batch' ? '移除中...' : `移除图片 (${selectedImages.size})`}
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isBusy}
                    >
                        <Plus className="w-3 h-3 mr-1" />{isUploading ? '上传中...' : '上传'}
                    </Button>
                </div>
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                disabled={isBusy}
            />

            {/* Image Grid */}
            <div className="px-4 pb-4">
                {images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-ui-fg-subtle">
                        <Photo className="w-8 h-8 mb-2" />
                        <Text size="small">暂无图片</Text>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                        {images.map((image) => (
                            <div
                                key={image.id || image.url}
                                className={clx(
                                    "relative group rounded overflow-hidden border transition-all cursor-pointer",
                                    selectedImages.has(image.url)
                                        ? "border-blue-500 border-2 ring-2 ring-blue-200"
                                        : thumbnail === image.url
                                            ? "border-ui-fg-interactive border-2"
                                            : "border-ui-border-base hover:border-ui-border-strong"
                                )}
                                onClick={() => toggleImageSelection(image.url)}
                            >
                                <div className="aspect-square bg-ui-bg-subtle">
                                    <img src={image.url} alt="" className="w-full h-full object-cover" />
                                </div>

                                {/* Selection checkbox */}
                                <div className="absolute top-1 right-1">
                                    <input
                                        type="checkbox"
                                        checked={selectedImages.has(image.url)}
                                        onChange={() => toggleImageSelection(image.url)}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={isBusy}
                                        className="w-4 h-4 rounded border-gray-300 text-blue-500 cursor-pointer"
                                    />
                                </div>

                                {/* Badges */}
                                <div className="absolute top-1 left-1 flex flex-col gap-0.5">
                                    {thumbnail === image.url && (
                                        <span className="bg-green-500 text-white text-[10px] px-1 rounded">T</span>
                                    )}
                                    {getVariantCountForImage(image.url) > 0 && (
                                        <span className="bg-purple-500 text-white text-[10px] px-1 rounded">V{getVariantCountForImage(image.url)}</span>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 p-1" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleSetThumbnail(image.url); }}
                                        disabled={isBusy || thumbnail === image.url}
                                        className="w-full text-center py-1 px-1 bg-white/90 hover:bg-white rounded text-xs disabled:opacity-50"
                                    >
                                        缩略图
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); showVariantsForImage(image.url); }}
                                        disabled={isBusy}
                                        className="w-full text-center py-1 px-1 bg-white/90 hover:bg-white rounded text-xs"
                                    >
                                        变体
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(image.url); }}
                                        disabled={isBusy}
                                        className="w-full text-center py-1 px-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs disabled:opacity-50"
                                    >
                                        {isRemoving === image.url ? '...' : '移除'}
                                    </button>
                                </div>

                                {showVariantSelector === image.url && (
                                    <div className="absolute inset-0 bg-white/95 flex flex-col p-2 z-10" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex justify-between items-center mb-1">
                                            <Text weight="plus" size="xsmall">选择变体</Text>
                                            <button onClick={(e) => { e.stopPropagation(); showVariantsForImage(null); }} disabled={isBusy} className="text-ui-fg-subtle hover:text-ui-fg-base">
                                                <XMark className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex-1 overflow-y-auto space-y-1">
                                            {variants.length === 0 ? (
                                                <Text size="xsmall" className="text-ui-fg-subtle">无变体</Text>
                                            ) : (
                                                variants.map(variant => {
                                                    const linkedImage = (variant.metadata?.images as { url: string }[] | undefined)?.[0]
                                                    const isLinked = linkedImage?.url === image.url
                                                    const hasOtherImage = linkedImage && !isLinked
                                                    return (
                                                        <button
                                                            key={variant.id}
                                                            onClick={(e) => { e.stopPropagation(); handleSetVariantImage(image.url, variant.id); }}
                                                            disabled={isBusy || isLinked}
                                                            className={clx(
                                                                "w-full text-left px-1 py-1 rounded text-xs transition-colors",
                                                                isLinked
                                                                    ? "bg-ui-bg-subtle-pressed text-ui-fg-disabled cursor-not-allowed"
                                                                    : "hover:bg-ui-bg-subtle"
                                                            )}
                                                        >
                                                            {variant.title}
                                                            {isLinked && <span className="ml-1 text-xs">(当前)</span>}
                                                            {hasOtherImage && <span className="ml-1 text-xs text-orange-500">(替换)</span>}
                                                        </button>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "product.details.before",
})

export default ProductMediaManagerWidget
