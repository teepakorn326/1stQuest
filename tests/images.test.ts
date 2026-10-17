import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalisePhoto } from "@/lib/images";

describe("normalisePhoto", () => {
  it("fits within 2000px, outputs JPEG and drops EXIF (incl. GPS)", async () => {
    const original = await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#A4C4DF" } })
      .withExif({ IFD0: { Make: "TestCam" }, IFD3: { GPSLatitudeRef: "S", GPSLatitude: "33/1 53/1 0/1" } })
      .jpeg()
      .toBuffer();
    expect((await sharp(original).metadata()).exif).toBeDefined();
    const out = await normalisePhoto(original);
    const meta = await sharp(out.data).metadata();
    expect(meta.format).toBe("jpeg");
    expect(Math.max(meta.width!, meta.height!)).toBe(2000);
    expect(meta.exif).toBeUndefined();
  });

  it("applies EXIF orientation", async () => {
    const original = await sharp({ create: { width: 300, height: 100, channels: 3, background: "#fff" } })
      .withMetadata({ orientation: 6 })
      .jpeg()
      .toBuffer();
    const meta = await sharp((await normalisePhoto(original)).data).metadata();
    expect([meta.width, meta.height]).toEqual([100, 300]);
  });

  it("rejects non-images", async () => {
    await expect(normalisePhoto(Buffer.from("not an image"))).rejects.toThrow();
  });
});
