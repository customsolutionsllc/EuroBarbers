import { Clock } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type Service = {
  name: string;
  duration: number;
  buffer: number;
  price: number;
  description: string;
};

export function ServiceCard({ service }: { service: Service }) {
  return (
    <div className="flex items-center justify-between gap-6 rounded-lg border bg-white p-6 transition hover:border-primary/40 hover:shadow-sm sm:p-8">
      <div className="min-w-0">
        <h3 className="font-serif text-2xl font-semibold">{service.name}</h3>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
          {service.description}
        </p>
        <span className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Clock className="h-4 w-4" />
          {service.duration + service.buffer} min
        </span>
      </div>
      <div className="shrink-0 text-right">
        <span className="font-serif text-4xl font-semibold text-primary sm:text-5xl">
          {formatCurrency(service.price)}
        </span>
      </div>
    </div>
  );
}
