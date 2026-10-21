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

  it("keeps retired oil-painting language out of runtime files", () => {
    const oldBrandPattern =
      /LUMIERA|Lumiera|lumiera|lumierawellness\.com|Premium Intimate Wellness|intimate wellness|discreet|The Rose|The Wand|Kegel|Couples|Solo Play|toy cleaner|toy materials|pet portrait|oil painting|hand-painted|canvas artwork|wall art|Explore Paintings|your first painting|art studio serving homes/i

    const offenders = runtimeFiles
      .map((relativePath) => ({
        relativePath,
        content: readProjectFile(relativePath),
      }))
      .filter(({ content }) => oldBrandPattern.test(content))
      .map(({ relativePath }) => relativePath)

    expect(offenders).toEqual([])
  })

  it("seeds Cansoria watch products and storefront taxonomy", () => {
    const seed = readProjectFile("src/scripts/seed.ts")

    expect(seed).toContain("Cansoria Studio")
    expect(seed).toContain("Cansoria Studio Storefront")
    expect(seed).toContain("pp_stripe_stripe")

    for (const handle of [
      "mens-watches",
      "womens-watches",
      "automatic",
      "chronograph",
      "dress-watches",
      "dive-watches",
      "everyday-watches",
      "watch-gifts",
    ]) {
      expect(seed).toContain(handle)
    }

    for (const title of [
      "Heritage Classic 40",
      "Meridian Automatic",
      "Regent Chronograph",
      "Averly Dress Watch",
      "Northsea Diver",
      "Lucienne Slim 32",
      "Ellery Everyday",
      "Field & Pine Safari",
    ]) {
      expect(seed).toContain(title)
    }

    for (const optionTitle of ["Size", "Strap", "Dial"]) {
      expect(seed).toContain(`title: "${optionTitle}"`)
    }

    for (const metadataKey of [
      "engraveable",
      "movement",
      "water_resistance",
      "warranty",
      "rating",
      "review_count",
      "story_sections",
    ]) {
      expect(seed).toContain(metadataKey)
    }
  })
})
