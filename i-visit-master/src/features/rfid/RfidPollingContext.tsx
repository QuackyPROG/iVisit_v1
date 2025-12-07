// src/features/rfid/RfidPollingContext.tsx
import { createContext, useContext, useState } from "react";

type RfidPollingContextValue = {
    pollingEnabled: boolean;
    setPollingEnabled: (enabled: boolean) => void;
};

const RfidPollingContext = createContext<RfidPollingContextValue | null>(null);

export function RfidPollingProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [pollingEnabled, setPollingEnabled] = useState(true);

    return (
        <RfidPollingContext.Provider value={{ pollingEnabled, setPollingEnabled }}>
            {children}
        </RfidPollingContext.Provider>
    );
}

export function useRfidPollingControl() {
    const ctx = useContext(RfidPollingContext);
    if (!ctx) {
        throw new Error(
            "useRfidPollingControl must be used inside RfidPollingProvider"
        );
    }
    return ctx;
}
