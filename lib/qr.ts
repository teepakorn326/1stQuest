import "server-only";
import QRCode from "qrcode";

/** Inline SVG markup for a URL, styled in the app's ink colour. */
export async function qrSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#1C2B3A", light: "#FFFFFF" },
  });
}
