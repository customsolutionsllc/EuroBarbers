import { getAllServices } from "@/lib/queries";

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export default async function AdminServicesPage() {
  const services = await getAllServices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Services</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live from the database. Edit pricing, duration, and availability in Supabase.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Buffer</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="font-medium">{service.name}</div>
                  <div className="text-xs text-muted-foreground">{service.slug}</div>
                </td>
                <td className="px-4 py-3">{formatPrice(service.price_cents)}</td>
                <td className="px-4 py-3">{service.duration_minutes} min</td>
                <td className="px-4 py-3">{service.buffer_after_minutes} min</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      service.is_active
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                        : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                    }
                  >
                    {service.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-muted-foreground" colSpan={5}>
                  No services found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
