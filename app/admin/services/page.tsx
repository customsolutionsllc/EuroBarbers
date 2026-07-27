import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getAllServices } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/confirm-button";

export const dynamic = "force-dynamic";

const GRID = "grid grid-cols-[1.6fr_0.8fr_0.9fr_0.8fr_0.9fr_auto] items-center gap-3";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function dollars(cents: number) {
  return (cents / 100).toFixed(2);
}

function toCents(value: FormDataEntryValue | null) {
  const n = parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function toInt(value: FormDataEntryValue | null) {
  const n = parseInt(String(value ?? "0"), 10);
  return Number.isFinite(n) ? n : 0;
}

async function saveService(formData: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("admin_update_service", {
    p_id: String(formData.get("id")),
    p_name: String(formData.get("name") ?? ""),
    p_price_cents: toCents(formData.get("price")),
    p_duration: toInt(formData.get("duration")),
    p_buffer: toInt(formData.get("buffer")),
    p_is_active: formData.get("is_active") === "on"
  });
  revalidatePath("/admin/services");
  redirect("/admin/services?msg=Service+saved.");
}

async function addService(formData: FormData) {
  "use server";
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const duration = toInt(formData.get("duration"));
  if (!name || duration <= 0) {
    redirect("/admin/services?msg=Name+and+duration+are+required.");
  }
  const supabase = await createServerSupabaseClient();
  await supabase.rpc("admin_create_service", {
    p_name: name,
    p_price_cents: toCents(formData.get("price")),
    p_duration: duration,
    p_buffer: toInt(formData.get("buffer"))
  });
  revalidatePath("/admin/services");
  redirect("/admin/services?msg=Service+added.");
}

async function deleteService(formData: FormData) {
  "use server";
  await requireAdmin();
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("admin_delete_service", {
    p_id: String(formData.get("id"))
  });
  if (error) {
    redirect(
      "/admin/services?msg=" +
        encodeURIComponent(
          "Can't delete a service that has booking history. Untick \u201CBookable\u201D to hide it instead."
        )
    );
  }
  revalidatePath("/admin/services");
  redirect("/admin/services?msg=Service+deleted.");
}

export default async function AdminServicesPage({
  searchParams
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  await requireAdmin();
  const { msg } = await searchParams;
  const services = await getAllServices();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-semibold">Services</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a service to edit its price, duration, buffer, or remove it. Add new services below.
          Changes apply to online booking and check-in immediately.
        </p>
      </div>

      {msg && (
        <p className="rounded-md border border-primary/30 bg-primary/5 px-4 py-2 text-sm text-foreground">
          {msg}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        <div
          className={`${GRID} border-b bg-muted/40 px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground`}
        >
          <span>Service</span>
          <span>Price</span>
          <span>Duration</span>
          <span>Buffer</span>
          <span>Status</span>
          <span className="text-right">Edit</span>
        </div>

        {services.map((service) => (
          <details key={service.id} className="group border-b last:border-0">
            <summary className={`${GRID} cursor-pointer list-none px-4 py-3 hover:bg-muted/30`}>
              <span className="font-medium">{service.name}</span>
              <span>{money(service.price_cents)}</span>
              <span>{service.duration_minutes} min</span>
              <span>{service.buffer_after_minutes} min</span>
              <span>
                <span
                  className={
                    service.is_active
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                      : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                  }
                >
                  {service.is_active ? "Active" : "Inactive"}
                </span>
              </span>
              <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground transition group-open:rotate-180" />
            </summary>

            <div className="border-t bg-muted/20 px-4 py-5">
              <form action={saveService} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <input type="hidden" name="id" value={service.id} />
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Service name
                  </span>
                  <Input name="name" defaultValue={service.name} required className="mt-1" />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Price ($)
                  </span>
                  <Input
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={dollars(service.price_cents)}
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Duration (min)
                  </span>
                  <Input
                    name="duration"
                    type="number"
                    min="1"
                    step="1"
                    defaultValue={service.duration_minutes}
                    required
                    className="mt-1"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Buffer (min)
                  </span>
                  <Input
                    name="buffer"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={service.buffer_after_minutes}
                    className="mt-1"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={service.is_active}
                    className="h-4 w-4"
                  />
                  Bookable (active)
                </label>
                <div className="flex items-center justify-end sm:col-span-2">
                  <Button type="submit">Save changes</Button>
                </div>
              </form>

              <form action={deleteService} className="mt-4 border-t pt-4">
                <input type="hidden" name="id" value={service.id} />
                <ConfirmButton
                  variant="destructive"
                  size="sm"
                  confirmMessage={`Delete the service \u201C${service.name}\u201D? This cannot be undone.`}
                >
                  Delete service
                </ConfirmButton>
              </form>
            </div>
          </details>
        ))}

        {services.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No services yet. Add one below.
          </p>
        )}
      </div>

      <details className="rounded-lg border border-dashed bg-muted/30">
        <summary className="cursor-pointer list-none px-5 py-4 font-serif text-xl font-semibold">
          + Add a service
        </summary>
        <form action={addService} className="grid gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Service name
            </span>
            <Input name="name" placeholder="e.g. Buzz Cut" required className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Price ($)
            </span>
            <Input name="price" type="number" min="0" step="0.01" placeholder="0.00" className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Duration (min)
            </span>
            <Input name="duration" type="number" min="1" step="1" placeholder="30" required className="mt-1" />
          </label>
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Buffer (min)
            </span>
            <Input name="buffer" type="number" min="0" step="1" placeholder="0" className="mt-1" />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="secondary">Add service</Button>
          </div>
        </form>
      </details>
    </div>
  );
}
