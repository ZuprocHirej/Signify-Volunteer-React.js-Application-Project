// collects lives in ONE type + ONE initial-value object, so the whole
// multi-step form only ever needs a single useState variable.

export type ApplicationFormData = {
  // Step 1: Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;   
  city: string;  

  // Step 2: Availability & Experience
  availability: string[]; // e.g. ["Mon-Morning", "Wed-Afternoon", "Wed-Evening"]
  experience: string;     

  // Step 3: Additional Information
  skills: string[];       // e.g. ["Leadership"]
  heardAbout: string;
  agreeTerms: boolean;
};

export const initialFormData: ApplicationFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  age: "",
  city: "",
  availability: [],
  experience: "",
  skills: [],
  heardAbout: "",
  agreeTerms: false,
};

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const TIME_BLOCKS = [
  { key: "Morning", label: "Morning (8am - 12pm)" },
  { key: "Afternoon", label: "Afternoon (12pm - 4pm)" },
  { key: "Evening", label: "Evening (4pm - 8pm)" },
];
export const SKILL_OPTIONS = [
  "Communication",
  "Leadership",
  "First Aid",
  "Teaching",
  "Manual Labor",
  "Event Planning",
  "Cooking",
  "Driving",
];
export const HEARD_ABOUT_OPTIONS = [
  "School / University",
  "Social Media",
  "Friend / Family",
  "Community Event",
  "Other",
];
