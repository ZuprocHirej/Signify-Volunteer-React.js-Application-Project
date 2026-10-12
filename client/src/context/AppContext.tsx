import { createContext, useContext, useState, type ReactNode } from "react";
import type { VolunteerOpportunity } from "../types/VolunteerOpportunity";
import type { ApplicationFormData } from "../types/ApplicationFormData";



type AppContextValue = {
  // set by HomePage when the user clicks "Apply Now" on a card,
  // read by SignUpPage to know which role is being applied for
  selectedOpportunity: VolunteerOpportunity | null;
  setSelectedOpportunity: (opportunity: VolunteerOpportunity | null) => void;

  // set by SignUpPage right after a successful submit
  submittedApplication: ApplicationFormData | null;
  setSubmittedApplication: (data: ApplicationFormData | null) => void;
};

// Step 1: create a data "channel"
const AppContext = createContext<AppContextValue | undefined>(undefined);

// Step 2: broadcast the value to everything nested inside it
export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<VolunteerOpportunity | null>(null);
  const [submittedApplication, setSubmittedApplication] =
    useState<ApplicationFormData | null>(null);

  return (
    <AppContext.Provider
      value={{
        selectedOpportunity,
        setSelectedOpportunity,
        submittedApplication,
        setSubmittedApplication,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

// Step 3: a way to "listen in" from any component
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside an <AppProvider>");
  }
  return context;
}
