import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["postgres", "@react-pdf/renderer"],
  // react-pdf (via pdfkit) loads its standard fonts and line-break data by dynamic path, which
  // file tracing can't see; without these the PDF route can't find Helvetica on Vercel.
  outputFileTracingIncludes: {
    "/api/v1/circles/[id]/book/pdf": [
      "./node_modules/.pnpm/pdfkit@*/node_modules/pdfkit/js/**/*",
      "./node_modules/.pnpm/linebreak@*/node_modules/linebreak/**/*",
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "16mb" },
  },
};

export default nextConfig;
