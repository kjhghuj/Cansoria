import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import path from "path"
import fs from "fs"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (process.env.NODE_ENV === "production") return res.status(410).json({ message: "Local files are unavailable" })
  const { filename } = req.params
  if (!filename) return res.status(400).json({ message: "File name is required" })
  if (/[\\/\0]/.test(filename) || filename !== path.basename(filename) || filename === "." || filename === "..") return res.status(403).json({ message: "Access denied" })
  const types: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".pdf": "application/pdf", ".mp4": "video/mp4", ".webm": "video/webm" }
  const type = types[path.extname(filename).toLowerCase()]
  if (!type) return res.status(403).json({ message: "File type is unavailable" })
  try {
    const root = fs.realpathSync(path.resolve(process.cwd(), "public-uploads"))
    const file = fs.realpathSync(path.join(root, filename))
    const relative = path.relative(root, file)
    if (relative.startsWith("..") || path.isAbsolute(relative) || !fs.statSync(file).isFile()) return res.status(403).json({ message: "Access denied" })
    res.setHeader("Content-Type", type)
    res.setHeader("X-Content-Type-Options", "nosniff")
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox")
    res.setHeader("Content-Disposition", "attachment")
    res.setHeader("Cache-Control", "no-store")
    const stream = fs.createReadStream(file)
    stream.on("error", () => { if (!res.headersSent) res.status(404).end(); else res.end() })
    return stream.pipe(res)
  } catch {
    return res.status(404).json({ message: "File not found" })
  }
}
