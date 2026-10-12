export type VolunteerOpportunity = {
  id: number;
  name: string;
  type: string; // "Education" | "Environment" | "Outreach"
  description: string;
  spotsLeft: number;
  imageUrl: string | null; // set by admins in the Admin Panel (volunteers.image_url)
  isPriority?: boolean; // toggled by admins to feature as priority card
  sessionDetails?: string | null;
  teamDetails?: string | null;
  preparationDetails?: string | null;
};