import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{service.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{service.description}</p>
        <div className="mt-6 flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            {service.duration + service.buffer} min
          </span>
          <span className="font-semibold">{formatCurrency(service.price)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
