import fs from "fs"
import os from "os"
import path from "path"
import { Writable } from "stream"
import { GET } from "../static/[filename]/route"
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() }) as any
describe("local static boundary", () => {
  let dir: string
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "cansoria-static-")); jest.spyOn(process, "cwd").mockReturnValue(dir); fs.mkdirSync(path.join(dir, "public-uploads")) })
  afterEach(() => { jest.restoreAllMocks(); fs.rmSync(dir, { recursive: true, force: true }) })
  it("denies a symlink whose target escapes the permitted directory", async () => {
    fs.writeFileSync(path.join(dir, "private.jpg"), "private")
    fs.symlinkSync(path.join(dir, "private.jpg"), path.join(dir, "public-uploads", "linked.jpg"))
    const res = response(); await GET({ params: { filename: "linked.jpg" } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })
  it.each(["activity.svg", "script.html", "text.txt"])('denies active or unsupported file %s', async (filename) => {
    const res = response(); await GET({ params: { filename } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
  })
  it("denies directories and unknown files", async () => {
    fs.mkdirSync(path.join(dir, "public-uploads", "dir.jpg"))
    const res = response(); await GET({ params: { filename: "dir.jpg" } } as any, res)
    expect(res.status).toHaveBeenCalledWith(403)
    const missing = response(); await GET({ params: { filename: "missing.jpg" } } as any, missing)
    expect(missing.status).toHaveBeenCalledWith(404)
    const blank = response(); await GET({ params: {} } as any, blank)
    expect(blank.status).toHaveBeenCalledWith(400)
  })
  it("streams an allowed image with sandbox and download headers", async () => {
    fs.writeFileSync(path.join(dir, "public-uploads", "painting.jpg"), "image")
    const chunks: Buffer[] = []
    const res = Object.assign(new Writable({ write(chunk, _encoding, done) { chunks.push(chunk); done() } }), response()) as any
    const finished = new Promise<void>(resolve => res.once("finish", resolve))
    await GET({ params: { filename: "painting.jpg" } } as any, res); await finished
    expect(Buffer.concat(chunks).toString()).toBe("image")
    expect(res.setHeader).toHaveBeenCalledWith("Content-Security-Policy", "default-src 'none'; sandbox")
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", "attachment")
  })
  it("does not serve local files in production", async () => {
    const env = process.env.NODE_ENV; process.env.NODE_ENV = "production"
    const res = response(); await GET({ params: { filename: "painting.jpg" } } as any, res)
    expect(res.status).toHaveBeenCalledWith(410)
    process.env.NODE_ENV = env
  })
})
