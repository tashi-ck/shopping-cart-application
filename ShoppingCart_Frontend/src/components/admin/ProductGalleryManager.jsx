import { useState } from "react";
import { Trash2, GripVertical, Plus } from "lucide-react";
import { uploadProductImage } from "../../api/uploadApi";
import { addProductImage, deleteProductImage, reorderProductImages } from "../../api/productApi";

export function ProductGalleryManager({ productId, images, onImagesChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [draggedId, setDraggedId] = useState(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    try {
      const uploadRes = await uploadProductImage(file);
      const addRes = await addProductImage(productId, uploadRes.data.imageUrl);
      onImagesChange([...images, addRes.data]);
    } catch (err) {
      setError(err.response?.data ?? "Couldn't add image.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (imageId) => {
    await deleteProductImage(productId, imageId);
    onImagesChange(images.filter((img) => img.productImageId !== imageId));
  };

  const handleDragStart = (imageId) => setDraggedId(imageId);

  const handleDragOver = (e, targetId) => {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) return;

    const draggedIndex = images.findIndex((img) => img.productImageId === draggedId);
    const targetIndex = images.findIndex((img) => img.productImageId === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const reordered = [...images];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onImagesChange(reordered); // optimistic reorder while dragging, visually instant
  };

  const handleDragEnd = async () => {
    setDraggedId(null);
    await reorderProductImages(productId, images.map((img) => img.productImageId));
  };

  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-2">Gallery images</label>

      {error && (
        <div className="mb-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {images.map((img) => (
          <div
            key={img.productImageId}
            draggable
            onDragStart={() => handleDragStart(img.productImageId)}
            onDragOver={(e) => handleDragOver(e, img.productImageId)}
            onDragEnd={handleDragEnd}
            className={`relative w-20 h-20 rounded-lg border border-gray-200 overflow-hidden cursor-grab active:cursor-grabbing ${
              draggedId === img.productImageId ? "opacity-40" : ""
            }`}
          >
            <img src={img.imageUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
            <div className="absolute top-0.5 left-0.5 bg-black/40 rounded p-0.5">
              <GripVertical size={11} className="text-white" />
            </div>
            <button
              type="button"
              onClick={() => handleDelete(img.productImageId)}
              className="absolute top-0.5 right-0.5 bg-white/90 rounded-full p-1 text-gray-500 hover:text-red-600 transition"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}

        <label className="w-20 h-20 flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition cursor-pointer">
          {uploading ? (
            <span className="text-[10px]">Uploading...</span>
          ) : (
            <>
              <Plus size={16} />
              <span className="text-[10px]">Add</span>
            </>
          )}
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFileSelect} disabled={uploading} className="hidden" />
        </label>
      </div>
      <p className="text-[11px] text-gray-400 mt-2">Drag to reorder.</p>
    </div>
  );
}

export default ProductGalleryManager;