import { useRef, useState } from "react";
import { Upload, X, Loader2, ImageOff } from "lucide-react";
import { uploadProductImage } from "../../api/uploadApi";

export default function ImageUpload({ value, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);

    try {
      const res = await uploadProductImage(file);
      onChange(res.data.imageUrl);
    } catch (err) {
      setError(err.response?.data ?? "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = ""; // allows re-selecting the same file again if needed
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">Product image</label>

      {error && (
        <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
          {error}
        </div>
      )}

      {value ? (
        <div className="relative w-32 h-32">
          <img
            src={value}
            alt="Product preview"
            className="w-32 h-32 object-cover rounded-lg border border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            title="Remove image"
            className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full p-1 text-gray-500 hover:text-red-600 hover:border-red-300 transition shadow-sm"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-32 h-32 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition disabled:opacity-50"
        >
          {uploading ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs">Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={20} />
              <span className="text-xs">Click to browse</span>
            </>
          )}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}