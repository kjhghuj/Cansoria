import fs from "fs"
import path from "path"

const rootDir = path.resolve(__dirname, "..", "..", "..")

function readProjectFile(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8")
}

describe("Cansoria runtime branding", () => {
  const runtimeFiles = [
    "package.json",
    ".env.template",
    "src/scripts/seed.ts",
    "src/modules/resend/service.ts",
    "src/emails/welcome.tsx",
    "src/emails/customer_created.tsx",
    "data/templates/customer_created/html.hbs",
    "data/templates/customer_created/text.hbs",
    "data/templates/order_placed/html.hbs",
    "data/templates/order_placed/text.hbs",
  ]

  it("keeps old Lumiera intimate-wellness language out of runtime files", () => {
    const oldBrandPattern =
      /LUMIERA|Lumiera|lumiera|lumierawellness\.com|Premium Intimate Wellness|intimate wellness|discreet|The Rose|The Wand|Kegel|Couples|Solo Play|toy cleaner|toy materials/i

    const offenders = runtimeFiles
      .map((relativePath) => ({
        relativePath,
        content: readProjectFile(relativePath),
      }))
      .filter(({ content }) => oldBrandPattern.test(content))
      .map(({ relativePath }) => relativePath)

    expect(offenders).toEqual([])
  })

  it("seeds Cansoria oil-painting products and storefront taxonomy", () => {
    const seed = readProjectFile("src/scripts/seed.ts")

    expect(seed).toContain("Cansoria Studio")
    expect(seed).toContain("Cansoria Studio Storefront")
    expect(seed).toContain("pp_stripe_stripe")

    for (const handle of [
      "custom-portraits",
      "custom-painting",
      "pet-portraits",
      "wedding-gifts",
      "landscape",
      "abstract",
      "classic-art",
      "home-decor",
      "wall-art",
    ]) {
      expect(seed).toContain(handle)
    }

    for (const title of [
      "Custom Portrait From Photo",
      "Pet Portrait Oil Painting",
      "Wedding Anniversary Oil Portrait",
      "Landscape Oil Painting",
      "Abstract Canvas Wall Art",
      "Classic Art Reproduction",
      "Home Decor Canvas Painting",
    ]) {
      expect(seed).toContain(title)
    }

    for (const optionTitle of ["Size", "Framing", "Orientation"]) {
      expect(seed).toContain(`title: "${optionTitle}"`)
    }

    for (const metadataKey of [
      "customizable",
      "free_preview",
      "rating",
      "review_count",
      "production_time",
      "story_sections",
    ]) {
      expect(seed).toContain(metadataKey)
    }
  })
})
