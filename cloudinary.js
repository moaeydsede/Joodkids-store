import { cloudinaryConfig } from "./firebase-config.js";

export async function uploadToCloudinary(file) {
  if (!cloudinaryConfig.cloudName || !cloudinaryConfig.uploadPreset) {
    throw new Error("Cloudinary config missing. Set cloudName/uploadPreset in firebase-config.js");
  }
  const url = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudinaryConfig.cloudName)}/image/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", cloudinaryConfig.uploadPreset);

  const res = await fetch(url, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || "Cloudinary upload failed";
    throw new Error(msg);
  }
  return {
    secure_url: data.secure_url,
    public_id: data.public_id,
    width: data.width,
    height: data.height
  };
}
