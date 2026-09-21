import QRCode from "qrcode";

/** A QR code as inline SVG, drawn on the server. Always dark on white so any camera can read it. */
export async function Qr({ value, size = 160, label }: { value: string; size?: number; label: string }) {
  const svg = await QRCode.toString(value, { type: "svg", margin: 1, color: { dark: "#1c2321", light: "#ffffff" } });
  return <div role="img" aria-label={label} className="overflow-hidden rounded-xl border border-line bg-white p-2" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
}
