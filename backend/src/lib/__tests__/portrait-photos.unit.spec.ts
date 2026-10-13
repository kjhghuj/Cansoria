import sharp from "sharp";
import {
  validatePhoto,
  signPhoto,
  findPhoto,
  MAX_PHOTO_BYTES,
  publicPortraitMetadata,
} from "../portrait-photos";

// Real decodable fixtures: validation now decodes every pixel, so header-only
// bytes are no longer a valid image.
const realPng = sharp({
  create: { width: 2, height: 2, channels: 3, background: "#7f7f7f" },
})
  .png()
  .toBuffer();
const headerOnlyPng = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const input = {
  name: "pet.png",
  mime: "image/png",
  content: "",
};

describe("private portrait photo boundaries", () => {
  let png: Buffer;
  beforeAll(async () => {
    png = await realPng;
    input.content = png.toString("base64");
  });
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  });
  it("checks the bytes rather than trusting the claimed MIME", async () => {
    await expect(validatePhoto(input)).resolves.toMatchObject({
      mime: "image/png",
      size: png.length,
    });
    await expect(validatePhoto({ ...input, mime: "image/jpeg" })).rejects.toThrow();
    await expect(
      validatePhoto({
        ...input,
        content: Buffer.from("<svg onload='alert(1)'>").toString("base64"),
      }),
    ).rejects.toThrow();
  });
  it.each(["pet.svg", "pet.png.exe", "pet.heic"])(
    "rejects unsupported filename %s",
    async (name) => {
      await expect(validatePhoto({ ...input, name })).rejects.toThrow();
    },
  );
  it("rejects files that are only a header with no image frames or pixels", async () => {
    await expect(
      validatePhoto({
        name: "pet.png",
        mime: "image/png",
        content: headerOnlyPng.toString("base64"),
      }),
    ).rejects.toThrow();
    const jpeg = await sharp({
      create: { width: 2, height: 2, channels: 3, background: "#7f7f7f" },
    })
      .jpeg()
      .toBuffer();
    // Truncated JPEG: a real header with missing image data.
    await expect(
      validatePhoto({
        name: "pet.jpg",
        mime: "image/jpeg",
        content: jpeg.subarray(0, 25).toString("base64"),
      }),
    ).rejects.toThrow();
    // A fake three-byte JPEG header must not pass as a decodable photo.
    await expect(
      validatePhoto({
        name: "pet.jpg",
        mime: "image/jpeg",
        content: Buffer.from([0xff, 0xd8, 0xff]).toString("base64"),
      }),
    ).rejects.toThrow();
    // A padded header is not a real image either.
    const padded = Buffer.alloc(Math.min(MAX_PHOTO_BYTES, 64 * 1024));
    headerOnlyPng.copy(padded);
    await expect(
      validatePhoto({
        name: "pet.png",
        mime: "image/png",
        content: padded.toString("base64"),
      }),
    ).rejects.toThrow();
  });
  it("rejects empty, noncanonical and oversized uploads", async () => {
    for (const content of [
      "",
      input.content + "!",
      Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64"),
    ])
      await expect(validatePhoto({ ...input, content })).rejects.toThrow();
  });
  it("binds the storage key to the cart and rejects metadata tampering", () => {
    const photo = signPhoto({
      id: "2c0e1371-36f3-40a7-b8c7-861f3c185559",
      cart_id: "cart_a",
      file_id: "private-file.png",
      name: "pet.png",
      mime: "image/png",
      size: 9,
    });
    expect(findPhoto({ portrait_photos: [photo] }, "cart_a", photo.id)).toEqual(
      photo,
    );
    expect(
      findPhoto({ portrait_photos: [photo] }, "cart_b", photo.id),
    ).toBeUndefined();
    expect(
      findPhoto(
        { portrait_photos: [{ ...photo, file_id: "victim.png" }] },
        "cart_a",
        photo.id,
      ),
    ).toBeUndefined();
    expect(
      findPhoto({ portrait_photos: [photo] }, "cart_a", "../../secret"),
    ).toBeUndefined();
  });
  it("projects only public portrait metadata", () => {
    expect(publicPortraitMetadata({ secret: 1 })).toBeUndefined();
    expect(
      publicPortraitMetadata({
        portrait: {
          style: "dark-classic",
          photo_name: "pet.png",
          file_id: "private",
          signature: "secret",
          notes: "hello",
        },
      }),
    ).toEqual({
      portrait: {
        style: "dark-classic",
        photo_name: "pet.png",
        notes: "hello",
      },
    });
  });
  it("keeps durable photo records valid across JWT secret rotation", () => {
    const previous = process.env.PORTRAIT_PHOTO_SECRET;
    try {
      process.env.PORTRAIT_PHOTO_SECRET = "persistent-photo-secret-with-more-than-thirty-two-characters";
      const photo = signPhoto({ id: "2c0e1371-36f3-40a7-b8c7-861f3c185559", cart_id: "cart_a", file_id: "private-ref.png", name: "pet.png", mime: "image/png", size: 9 });
      process.env.JWT_SECRET = "rotated-session-secret-with-more-than-thirty-two-characters";
      expect(findPhoto({ portrait_photos: [photo] }, "cart_a", photo.id)).toEqual(photo);
    } finally { if (previous === undefined) delete process.env.PORTRAIT_PHOTO_SECRET; else process.env.PORTRAIT_PHOTO_SECRET = previous; }
  });
});
