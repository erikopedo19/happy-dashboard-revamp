import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listServices from "./tools/list-services";
import listAppointments from "./tools/list-appointments";
import listCustomers from "./tools/list-customers";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "cutzio-mcp",
  title: "Cutzio",
  version: "0.1.0",
  instructions:
    "Cutzio barber-booking tools. Use `list_services`, `list_appointments`, and `list_customers` to read the signed-in barber's data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listServices, listAppointments, listCustomers],
});
