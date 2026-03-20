export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Raise Next.js body size limit to 20MB
export const maxDuration = 30;

export async function POST(req) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    // Allow up to 20MB base64 (~27MB string)
    const sizeInBytes = (image.length * 3) / 4;
    if (sizeInBytes > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large. Maximum 20MB." }, { status: 400 });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "betgenius/payment-proofs",
      resource_type: "image",
      transformation: [
        { width: 1600, height: 1600, crop: "limit" },
        { quality: "auto:good", fetch_format: "auto" },
      ],
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
