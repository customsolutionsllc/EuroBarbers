import { getAllBarbers } from "@/lib/queries";

export default async function AdminStaffPage() {
  const barbers = await getAllBarbers();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Barbers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live from the database. Manage services, weekly availability, and time off in Supabase.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {barbers.map((barber) => (
          <div key={barber.id} className="rounded-lg border bg-white p-6">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-serif text-2xl font-semibold">{barber.name}</h2>
              <span
                className={
                  barber.is_active
                    ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                    : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                }
              >
                {barber.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            {barber.title && <p className="mt-2 text-sm text-muted-foreground">{barber.title}</p>}
            {barber.specialties && barber.specialties.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {barber.specialties.map((s) => (
                  <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
        {barbers.length === 0 && (
          <p className="text-sm text-muted-foreground">No barbers found.</p>
        )}
      </div>
    </div>
  );
}
