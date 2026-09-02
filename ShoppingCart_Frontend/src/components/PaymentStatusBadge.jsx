import { paymentStatusStyles } from "../utils/statusStyles";

export default function PaymentStatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${paymentStatusStyles[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}