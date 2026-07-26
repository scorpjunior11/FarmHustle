const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/cidmlcgs/image/upload";
const UPLOAD_PRESET = "farmhustle_uploads";

/**
 * Uploads a base64-encoded image to Cloudinary as a data URI and returns the
 * hosted https URL. Using a base64 data URI (a plain string FormData field)
 * instead of a { uri, name, type } file part avoids React Native's
 * "Unsupported FormDataPart implementation" error entirely.
 * Reusable for product photos, profile pictures, etc.
 */
export async function uploadImageToCloudinary(
  base64: string,
  mimeType: string = "image/jpeg"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", `data:${mimeType};base64,${base64}`);
  formData.append("upload_preset", UPLOAD_PRESET);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Image upload failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as { secure_url?: string };
  if (!data.secure_url) {
    throw new Error(
      `Image upload failed: Cloudinary response had no secure_url. Response: ${JSON.stringify(data)}`
    );
  }
  return data.secure_url;
}
