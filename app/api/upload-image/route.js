export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req) {
  try {
    const { image } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    // Validate base64 image format
    if (!image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }

    // Check size (~5MB limit — base64 is ~33% larger than binary)
    const sizeInBytes = (image.length * 3) / 4;
    if (sizeInBytes > 7 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large. Maximum 5MB." }, { status: 400 });
    }

    const result = await cloudinary.uploader.upload(image, {
      folder: "betgenius/payment-proofs",
      resource_type: "image",
      transformation: [{ quality: "auto", fetch_format: "auto" }],
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    console.error("Image upload error:", error);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
