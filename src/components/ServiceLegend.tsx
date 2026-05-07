import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface Service {
  id: string;
  name: string;
  color: string;
  text_color: string;
  border_color: string;
}

interface ServiceLegendProps {
  services: Service[];
  selectedServiceId?: string;
  onServiceSelect?: (serviceId: string | null) => void;
}

const ServiceLegend = ({ services, selectedServiceId, onServiceSelect }: ServiceLegendProps) => {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-card rounded-lg border">
      <div className="text-sm font-medium text-muted-foreground mb-2 w-full">
        Service Types
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* All Services Tab */}
        <button
          onClick={() => onServiceSelect?.(null)}
          className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 border ${
            !selectedServiceId 
              ? 'bg-primary text-primary-foreground border-primary' 
              : 'bg-background hover:bg-muted border-border'
          }`}
        >
          <div className="w-3 h-0.5 bg-gradient-to-r from-primary via-accent to-secondary rounded-full" />
          All Services
        </button>

        {/* Individual Service Tabs */}
        {services.map((service) => (
          <button
            key={service.id}
            onClick={() => onServiceSelect?.(service.id)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 border ${
              selectedServiceId === service.id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background hover:bg-muted border-border'
            }`}
            style={{
              borderLeftColor: selectedServiceId === service.id ? undefined : service.color,
              borderLeftWidth: selectedServiceId === service.id ? undefined : '3px'
            }}
          >
            <div 
              className="w-3 h-0.5 rounded-full"
              style={{ backgroundColor: service.color }}
            />
            {service.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ServiceLegend;