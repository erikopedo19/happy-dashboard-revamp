import React from "react";
import Services from "@/pages/Services";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { user } from "@heroui/react";


// this ount appoinments and keep on user state the name of the service 
interface AppointmentsCounterProps {
    servicesname: string;
    setCount:number;
}

const AppointmentsCounter: React.FC<AppointmentsCounterProps> = () => {
    const [count, setCount] = useState(0);

    const incrementCount = () => setCount(count + 1);
     
    return (
        <div>
            <Services/>
        </div>
    );
};

//need to recreate
export default AppointmentsCounter;
