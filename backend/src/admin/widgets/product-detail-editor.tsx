// src/admin/widgets/product-detail-editor.tsx

import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Toaster, toast, Input, Textarea, Label, IconButton } from "@medusajs/ui"
import { useState, useEffect, useRef } from "react"
import { DetailWidgetProps, AdminProduct } from "@medusajs/framework/types"
import { Plus, Trash, ArrowUpMini, ArrowDownMini, Photo } from "@medusajs/icons"

// 定义数据结构，需与前端 StorySection 对应
interface StorySectionData {
    id: string;
    title: string;
    content: string;
    imageUrl: string;
    imageAlt: string;
}

const ProductDetailStoryWidget = ({ data }: DetailWidgetProps<AdminProduct>) => {
    const [sections, setSections] = useState<StorySectionData[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isDirty, setIsDirty] = useState(false)
    const [uploadingSectionId, setUploadingSectionId] = useState<string | null>(null)
    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
    const savedSectionsRef = useRef<StorySectionData[]>([])
    const loadedProductIdRef = useRef<string | null>(null)
    const productIdRef = useRef(data.id)
    const dirtyRef = useRef(false)
    const mountedRef = useRef(true)
    const activeUploadRef = useRef<{ productId: string; sectionId: string } | null>(null)
    const activeSaveRef = useRef<{ productId: string } | null>(null)
    productIdRef.current = data.id

    // --------------------------------------------------------------------------
    // 1. 初始化数据
    // --------------------------------------------------------------------------
    useEffect(() => {
        mountedRef.current = true
        return () => {
            mountedRef.current = false
            activeUploadRef.current = null
            activeSaveRef.current = null
        }
    }, [])

    useEffect(() => {
        // A background refresh for this product must not overwrite its draft.
        if (loadedProductIdRef.current === data.id &&
            (dirtyRef.current || activeUploadRef.current || activeSaveRef.current)) return

        let loadedSections: StorySectionData[] = []
        try {
            const stored = data.metadata?.story_sections
            const parsed = typeof stored === "string" ? JSON.parse(stored) : stored
            if (Array.isArray(parsed)) {
                loadedSections = parsed.map(section => ({ ...section, id: section.id || crypto.randomUUID() }))
            }
        } catch (error) {
            console.error("Failed to parse story sections", error)
        }
        loadedProductIdRef.current = data.id
        savedSectionsRef.current = loadedSections
        activeUploadRef.current = null
        activeSaveRef.current = null
        dirtyRef.current = false
        setSections(loadedSections)
        setIsDirty(false)
        setUploadingSectionId(null)
        setIsSaving(false)
    }, [data])

    const markDirty = () => {
        dirtyRef.current = true
        setIsDirty(true)
    }

    // --------------------------------------------------------------------------
    // 2. 操作逻辑 (增删改查)
    // --------------------------------------------------------------------------
    const handleAddSection = () => {
        if (activeSaveRef.current) return
        const newSection: StorySectionData = {
            id: crypto.randomUUID(),
            title: "",
            content: "",
            imageUrl: "",
            imageAlt: ""
        }
        setSections(previous => [...previous, newSection])
        markDirty()
    }

    const handleRemoveSection = (sectionId: string) => {
        if (activeSaveRef.current) return
        setSections(previous => previous.filter(section => section.id !== sectionId))
        markDirty()
    }

    const handleMove = (sectionId: string, direction: 'up' | 'down') => {
        if (activeSaveRef.current) return
        setSections(previous => {
            const index = previous.findIndex(section => section.id === sectionId)
            const targetIndex = direction === 'up' ? index - 1 : index + 1
            if (index < 0 || targetIndex < 0 || targetIndex >= previous.length) return previous
            const newSections = [...previous]
            const moved = newSections[index]
            newSections[index] = newSections[targetIndex]
            newSections[targetIndex] = moved
            return newSections
        })
        markDirty()
    }

    const updateSection = (sectionId: string, field: keyof StorySectionData, value: string) => {
        if (activeSaveRef.current) return
        setSections(previous => previous.map(section =>
            section.id === sectionId ? { ...section, [field]: value } : section
        ))
        markDirty()
    }

    // --------------------------------------------------------------------------
    // 3. 图片上传逻辑
    // --------------------------------------------------------------------------
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, sectionId: string) => {
        const input = e.currentTarget
        const files = input.files
        if (!files || files.length === 0 || activeUploadRef.current || activeSaveRef.current) return

        const upload = { productId: data.id, sectionId }
        activeUploadRef.current = upload
        setUploadingSectionId(sectionId)
        const file = files[0] // 每次只传一张作为封面

        try {
            const formData = new FormData()
            formData.append('files', file)

            // 使用你现有的上传 API
            const response = await fetch('/admin/uploads', {
                method: 'POST',
                credentials: 'include',
                body: formData,
            })

            if (!response.ok) throw new Error('Upload failed')

            const result = await response.json()
            const uploadedFile = result.files?.[0]

            if (!uploadedFile?.url) throw new Error('Upload returned no image URL')
            if (!mountedRef.current || activeUploadRef.current !== upload || productIdRef.current !== upload.productId) return

            // Only update the draft. Keep old and new files, including on cancel
            // or failed save. ID + functional update preserves concurrent text edits.
            updateSection(sectionId, 'imageUrl', uploadedFile.url)
            toast.success("图片上传完成，保存后生效")
        } catch (error) {
            if (mountedRef.current && activeUploadRef.current === upload) {
                console.error('Upload error:', error)
                toast.error("上传失败")
            }
        } finally {
            input.value = ''
            if (mountedRef.current && activeUploadRef.current === upload) {
                activeUploadRef.current = null
                setUploadingSectionId(null)
            }
        }
    }

    // --------------------------------------------------------------------------
    // 4. 保存逻辑
    // --------------------------------------------------------------------------
    const handleSave = async () => {
        if (!dirtyRef.current || activeUploadRef.current || activeSaveRef.current) return
        const save = { productId: data.id }
        activeSaveRef.current = save
        setIsSaving(true)
        try {
            // 保存为 JSON 对象数组
            const response = await fetch(`/admin/products/${data.id}`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metadata: {
                        ...data.metadata,
                        story_sections: sections, // 直接存数组
                        // 清理旧字段以防混淆（可选）
                        detail_story: null
                    },
                }),
            })

            if (!response.ok) throw new Error('Save failed')
            if (!mountedRef.current || activeSaveRef.current !== save || productIdRef.current !== save.productId) return
            toast.success("保存成功")
            savedSectionsRef.current = sections
            dirtyRef.current = false
            setIsDirty(false)
        } catch (error) {
            if (mountedRef.current && activeSaveRef.current === save) {
                console.error('Save error:', error)
                toast.error("保存失败，更改已保留，可重试")
            }
        } finally {
            if (mountedRef.current && activeSaveRef.current === save) {
                activeSaveRef.current = null
                setIsSaving(false)
            }
        }
    }

    const handleCancel = () => {
        if (activeSaveRef.current) return
        // Invalidate late upload completion without deleting either stored asset.
        activeUploadRef.current = null
        setUploadingSectionId(null)
        setSections(savedSectionsRef.current)
        dirtyRef.current = false
        setIsDirty(false)
    }

    // --------------------------------------------------------------------------
    // 渲染 UI
    // --------------------------------------------------------------------------
    return (
        <Container className="p-0 overflow-hidden">
            <Toaster />

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base bg-ui-bg-subtle">
                <div className="flex items-center gap-2">
                    <Heading level="h2">产品故事模块</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                        ({sections.length} 个章节)
                    </Text>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={handleAddSection}
                        disabled={isSaving}
                    >
                        <Plus /> 添加章节
                    </Button>
                    <Button
                        variant="secondary"
                        size="small"
                        onClick={handleCancel}
                        disabled={isSaving || (!isDirty && uploadingSectionId === null)}
                    >
                        放弃更改
                    </Button>
                    <Button
                        variant="primary"
                        size="small"
                        onClick={handleSave}
                        disabled={!isDirty || isSaving || uploadingSectionId !== null}
                    >
                        {isSaving ? "保存中..." : "保存更改"}
                    </Button>
                </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-4 p-6 bg-ui-bg-base">
                {sections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-ui-fg-muted border-2 border-dashed border-ui-border-base rounded-lg">
                        <Text>暂无内容，点击右上角添加章节</Text>
                    </div>
                ) : (
                    sections.map((section, index) => (
                        <div key={section.id} className="border border-ui-border-base rounded-lg p-4 bg-ui-bg-subtle shadow-sm transition-all hover:shadow-md">
                            <div className="flex gap-6">
                                {/* Left: Image Uploader */}
                                <div className="w-[240px] flex-shrink-0 flex flex-col gap-2">
                                    <div
                                        className="relative aspect-[4/3] bg-ui-bg-base border border-ui-border-base rounded-md overflow-hidden flex items-center justify-center cursor-pointer group"
                                        onClick={() => {
                                            if (!isSaving && uploadingSectionId === null) fileInputRefs.current[section.id]?.click()
                                        }}
                                    >
                                        {section.imageUrl ? (
                                            <>
                                                <img src={section.imageUrl} alt="preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                                    <Text size="small">更换图片</Text>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center text-ui-fg-muted">
                                                <Photo />
                                                <Text size="small" className="mt-2">点击上传图片</Text>
                                            </div>
                                        )}
                                        {uploadingSectionId === section.id && (
                                            <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                <Text size="small">上传中...</Text>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        ref={el => { fileInputRefs.current[section.id] = el }}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => handleFileSelect(e, section.id)}
                                        disabled={isSaving || uploadingSectionId !== null}
                                    />
                                    <div className="grid gap-1">
                                        <Label size="xsmall" className="text-ui-fg-muted">图片描述 (Alt)</Label>
                                        <Input
                                            size="small"
                                            placeholder="描述图片内容..."
                                            value={section.imageAlt}
                                            onChange={(e) => updateSection(section.id, 'imageAlt', e.target.value)}
                                            disabled={isSaving}
                                        />
                                    </div>
                                </div>

                                {/* Right: Content Inputs */}
                                <div className="flex-1 flex flex-col gap-4">
                                    <div className="grid gap-2">
                                        <Label size="small" weight="plus">标题</Label>
                                        <Input
                                            placeholder="例如：精心打磨的工艺..."
                                            value={section.title}
                                            onChange={(e) => updateSection(section.id, 'title', e.target.value)}
                                            disabled={isSaving}
                                        />
                                    </div>
                                    <div className="grid gap-2 flex-1">
                                        <Label size="small" weight="plus">文案内容</Label>
                                        <Textarea
                                            placeholder="输入详细的故事文案..."
                                            rows={5}
                                            value={section.content}
                                            onChange={(e) => updateSection(section.id, 'content', e.target.value)}
                                            disabled={isSaving}
                                            className="resize-none"
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col gap-2 border-l border-ui-border-base pl-4 justify-center">
                                    <IconButton
                                        variant="transparent"
                                        onClick={() => handleMove(section.id, 'up')}
                                        disabled={isSaving || index === 0}
                                        aria-label="上移此章节"
                                    >
                                        <ArrowUpMini className="text-ui-fg-subtle" />
                                    </IconButton>
                                    <IconButton
                                        variant="transparent"
                                        onClick={() => handleMove(section.id, 'down')}
                                        disabled={isSaving || index === sections.length - 1}
                                        aria-label="下移此章节"
                                    >
                                        <ArrowDownMini className="text-ui-fg-subtle" />
                                    </IconButton>
                                    <div className="h-px bg-ui-border-base my-1" />
                                    <IconButton
                                        variant="transparent"
                                        className="text-ui-fg-error hover:bg-ui-bg-error-hover"
                                        onClick={() => handleRemoveSection(section.id)}
                                        disabled={isSaving}
                                        aria-label="移除此章节"
                                    >
                                        <Trash />
                                    </IconButton>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </Container>
    )
}

export const config = defineWidgetConfig({
    zone: "product.details.after",
})

export default ProductDetailStoryWidget
