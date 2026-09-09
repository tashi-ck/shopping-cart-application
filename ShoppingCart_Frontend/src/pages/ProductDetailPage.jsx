import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { ImageOff, ArrowLeft, Package, Minus, Plus, ShoppingCart, Check } from "lucide-react";
import axiosClient from "../api/axiosClient";
import { useCart } from "../context/CartContext";
import { createBuyNowCheckoutSession, createGuestCheckoutSession } from "../api/paymentApi";
import { getAddresses } from "../api/addressApi";
import ReviewsSection from "../components/ReviewsSection";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const { addItem } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [quantity, setQuantity] = useState(1);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Add to Cart state
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [added, setAdded] = useState(false);

  // Buy Now state
  const [showBuyNowForm, setShowBuyNowForm] = useState(false);
  const [buyNowAddress, setBuyNowAddress] = useState("");
  const [buyNowGuestEmail, setBuyNowGuestEmail] = useState("");
  const [buyingNow, setBuyingNow] = useState(false);
  const [buyNowError, setBuyNowError] = useState("");

  // Saved addresses (logged-in users only)
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setSelectedImageIndex(0);
    axiosClient.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => setError("Product not found."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToCart = async () => {
    setAddError("");
    setAdding(true);
    const result = await addItem(product, quantity);
    setAdding(false);

    if (result.success) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } else {
      setAddError(result.message);
    }
  };

  const handleBuyNowClick = () => {
    setBuyNowError("");
    setShowBuyNowForm(true);

    if (isAuthenticated && addresses.length === 0) {
      getAddresses()
        .then((res) => {
          setAddresses(res.data);
          const defaultAddress = res.data.find((a) => a.isDefault);
          if (defaultAddress) {
            setSelectedAddressId(String(defaultAddress.addressId));
            setBuyNowAddress(defaultAddress.fullAddress);
          }
        })
        .catch(() => {});
    }
  };

  const handleSelectBuyNowAddress = (e) => {
    const value = e.target.value;
    setSelectedAddressId(value);
    if (value === "") {
      setBuyNowAddress("");
    } else {
      const address = addresses.find((a) => String(a.addressId) === value);
      setBuyNowAddress(address?.fullAddress ?? "");
    }
  };

  const handleBuyNowSubmit = async (e) => {
    e.preventDefault();
    setBuyNowError("");
    setBuyingNow(true);

    try {
      if (isAuthenticated) {
        const res = await createBuyNowCheckoutSession(product.productId, quantity, buyNowAddress);
        window.location.href = res.data.url;
      } else {
        const res = await createGuestCheckoutSession(
          buyNowGuestEmail,
          buyNowAddress,
          [{ productId: product.productId, quantity }],
          `/products/${product.productId}`
        );
        window.location.href = res.data.url;
      }
    } catch (err) {
      setBuyNowError(err.response?.data ?? "Couldn't complete the purchase.");
      setBuyingNow(false);
    }
  };

  if (loading) {
    return (
      <div className="grid md:grid-cols-2 gap-10 animate-pulse">
        <div className="aspect-square bg-gray-100 rounded-2xl" />
        <div className="space-y-3 pt-2">
          <div className="h-3 bg-gray-100 rounded w-1/4" />
          <div className="h-7 bg-gray-100 rounded w-2/3" />
          <div className="h-6 bg-gray-100 rounded w-1/5" />
          <div className="h-4 bg-gray-100 rounded w-full mt-4" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <p className="text-sm text-gray-500 mb-3">{error}</p>
        <Link to="/" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
          Back to products
        </Link>
      </div>
    );
  }

  const outOfStock = product.stockQuantity === 0;

  const allImages = [
    ...(product.imageUrl ? [product.imageUrl] : []),
    ...(product.images ?? []).map((img) => img.imageUrl).filter((url) => url !== product.imageUrl),
  ];

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition mb-6"
      >
        <ArrowLeft size={15} /> Back to products
      </button>

      <div className="grid md:grid-cols-2 gap-10">
        <div>
          <div className="aspect-square bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-200">
            {allImages.length > 0 ? (
              <img
                src={allImages[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <ImageOff className="text-gray-300" size={48} />
            )}
          </div>

          {allImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto">
              {allImages.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    index === selectedImageIndex ? "border-indigo-600" : "border-transparent hover:border-gray-300"
                  }`}
                >
                  <img src={url} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <Link
            to={`/?categoryId=${product.categoryId}`}
            className="text-xs text-indigo-600 font-medium uppercase tracking-wide mb-2 hover:text-indigo-700 w-fit"
          >
            {product.categoryName}
          </Link>

          <h1 className="text-2xl font-semibold text-gray-900 mb-3">{product.name}</h1>
          <p className="text-2xl font-semibold text-gray-900 mb-5">${Number(product.price).toFixed(2)}</p>

          {product.description && (
            <p className="text-sm text-gray-600 leading-relaxed mb-6">{product.description}</p>
          )}

          <div className="flex items-center gap-2 text-sm mb-6">
            <Package size={16} className={outOfStock ? "text-red-500" : "text-gray-400"} />
            {outOfStock ? (
              <span className="text-red-600 font-medium">Out of stock</span>
            ) : (
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{product.stockQuantity}</span> in stock
              </span>
            )}
          </div>

          <div className="mt-auto pt-4 border-t border-gray-100">
            {addError && (
              <div className="mb-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {addError}
              </div>
            )}

            {!outOfStock && (
              <div className="flex items-center gap-3 mb-4">
                <span className="text-sm text-gray-600">Quantity</span>
                <div className="flex items-center border border-gray-300 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="p-2 text-gray-500 hover:text-gray-900"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(product.stockQuantity, q + 1))}
                    className="p-2 text-gray-500 hover:text-gray-900"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={outOfStock || adding}
              className={`w-full flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition disabled:opacity-50 ${
                added ? "bg-green-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {added ? (
                <><Check size={16} /> Added to cart</>
              ) : (
                <><ShoppingCart size={16} /> {adding ? "Adding..." : outOfStock ? "Out of stock" : "Add to cart"}</>
              )}
            </button>

            {!outOfStock && !showBuyNowForm && (
              <button
                type="button"
                onClick={handleBuyNowClick}
                className="w-full mt-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg py-3 hover:bg-gray-50 transition"
              >
                Buy now
              </button>
            )}

            {showBuyNowForm && (
              <form onSubmit={handleBuyNowSubmit} className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
                {!isAuthenticated && (
                  <div>
                    <p className="text-sm font-medium text-gray-900 mb-1">Your email</p>
                    <input
                      type="email"
                      value={buyNowGuestEmail}
                      onChange={(e) => setBuyNowGuestEmail(e.target.value)}
                      required
                      placeholder="you@example.com"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                <p className="text-sm font-medium text-gray-900">Shipping address</p>
                {buyNowError && (
                  <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {buyNowError}
                  </div>
                )}

                {isAuthenticated && addresses.length > 0 && (
                  <select
                    value={selectedAddressId}
                    onChange={handleSelectBuyNowAddress}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {addresses.map((a) => (
                      <option key={a.addressId} value={a.addressId}>
                        {a.label} — {a.fullAddress.length > 40 ? a.fullAddress.slice(0, 40) + "..." : a.fullAddress}
                      </option>
                    ))}
                    <option value="">+ Type a new address</option>
                  </select>
                )}

                <textarea
                  value={buyNowAddress}
                  onChange={(e) => {
                    setBuyNowAddress(e.target.value);
                    setSelectedAddressId("");
                  }}
                  required
                  rows={2}
                  placeholder="Street address, city, postal code..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={buyingNow}
                    className="flex-1 bg-gray-900 text-white text-sm font-medium rounded-lg py-2 hover:bg-gray-800 disabled:opacity-50 transition"
                  >
                    {buyingNow ? "Placing order..." : `Confirm — $${(product.price * quantity).toFixed(2)}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBuyNowForm(false)}
                    disabled={buyingNow}
                    className="text-sm font-medium text-gray-600 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
      <ReviewsSection productId={product.productId} />
    </div>
  );
}