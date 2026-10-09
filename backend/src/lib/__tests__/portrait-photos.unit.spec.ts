import {
  validatePhoto,
  signPhoto,
  findPhoto,
  MAX_PHOTO_BYTES,
  publicPortraitMetadata,
} from "../portrait-photos";
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
const input = {
  name: "pet.png",
  mime: "image/png",
  content: png.toString("base64"),
};
describe("private portrait photo boundaries", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test-secret-with-more-than-thirty-two-characters";
  });
  it("checks the bytes rather than trusting the claimed MIME", () => {
    expect(validatePhoto(input)).toMatchObject({
      mime: "image/png",
      size: png.length,
    });
    expect(() => validatePhoto({ ...input, mime: "image/jpeg" })).toThrow();
    expect(() =>
      validatePhoto({
        ...input,
        content: Buffer.from("<svg onload='alert(1)'>").toString("base64"),
      }),
    ).toThrow();
  });
  it.each(["pet.svg", "pet.png.exe", "pet.heic"])(
    "rejects unsupported filename %s",
    (name) => {
      expect(() => validatePhoto({ ...input, name })).toThrow();
    },
  );
  it("rejects empty, noncanonical and oversized uploads", () => {
    for (const content of [
      "",
      input.content + "!",
      Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64"),
    ])
      expect(() => validatePhoto({ ...input, content })).toThrow();
    const bytes = Buffer.alloc(MAX_PHOTO_BYTES);
    png.copy(bytes);
    expect(
      validatePhoto({ ...input, content: bytes.toString("base64") }).size,
    ).toBe(MAX_PHOTO_BYTES);
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
