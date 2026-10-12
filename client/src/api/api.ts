import axios from "axios";
import api from "./axios";
import type { VolunteerOpportunity } from "../types/VolunteerOpportunity";
import type { ApplicationFormData } from "../types/ApplicationFormData";

function formatAxiosError(err: unknown, fallback: string): Error {
  if (axios.isAxiosError(err)) {
    const msg =
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      fallback;
    return new Error(msg);
  }
  return err instanceof Error ? err : new Error(fallback);
}

export type AuthAccount = {
  id: number;
  username: string | null;
  email: string;
  role: "user" | "admin";
  createdAt: string;
};

type AuthResponse = { token: string; account: AuthAccount };

export async function registerAccount(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const res = await api.post<AuthResponse>("/auth/register", {
      email,
      password,
    });
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Could not create your account.");
  }
}

export async function loginAccount(
  email: string,
  password: string
): Promise<AuthResponse> {
  try {
    const res = await api.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Could not log you in.");
  }
}

export async function getCurrentAccount(): Promise<AuthAccount> {
  try {
    const res = await api.get<{ account: AuthAccount }>("/auth/me");
    return res.data.account;
  } catch (err) {
    throw formatAxiosError(err, "Your session has expired.");
  }
}

// ── Opportunities ─────────────────────────────────────────────────────────────

export async function fetchOpportunities(): Promise<VolunteerOpportunity[]> {
  try {
    const res = await api.get<VolunteerOpportunity[]>("/volunteers");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load opportunities.");
  }
}

export async function fetchOpportunityById(
  id: number
): Promise<VolunteerOpportunity> {
  try {
    const res = await api.get<VolunteerOpportunity>(`/volunteers/${id}`);
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Opportunity not found.");
  }
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function submitApplication(
  volunteerId: number,
  data: ApplicationFormData
) {
  try {
    const res = await api.post("/applications", { volunteerId, ...data });
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to submit application.");
  }
}

export type ApplicationRecord = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  age: number | null;
  city: string | null;
  availability: string[];
  experience: string | null;
  skills: string[];
  heardAbout: string | null;
  agreeTerms: boolean;
  submittedAt: string;
  volunteerId: number;
  volunteerName: string;
  volunteerType: string;
  status: "pending" | "approved" | "rejected";
};

export async function fetchApplications(): Promise<ApplicationRecord[]> {
  try {
    const res = await api.get<ApplicationRecord[]>("/applications");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load applications.");
  }
}

/**
 * Deletes / withdraws an application record by ID.
 */
export async function deleteApplication(id: number): Promise<void> {
  try {
    await api.delete(`/applications/${id}`);
  } catch (err) {
    throw formatAxiosError(err, "Failed to delete application.");
  }
}

export type AdminOpportunity = VolunteerOpportunity;

export type AdminApplication = ApplicationRecord & {
  accountEmail: string | null;
};

export async function fetchAdminOpportunities(): Promise<AdminOpportunity[]> {
  try {
    const res = await api.get<AdminOpportunity[]>("/admin/opportunities");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load admin opportunities.");
  }
}

export async function createAdminOpportunity(
  data: Omit<AdminOpportunity, "id">
): Promise<AdminOpportunity> {
  try {
    const res = await api.post<AdminOpportunity>("/admin/opportunities", data);
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to create opportunity.");
  }
}

export async function updateAdminOpportunity(
  id: number,
  data: Partial<Omit<AdminOpportunity, "id">>
): Promise<AdminOpportunity> {
  try {
    const res = await api.patch<AdminOpportunity>(
      `/admin/opportunities/${id}`,
      data
    );
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to update opportunity.");
  }
}

export async function deleteAdminOpportunity(id: number): Promise<void> {
  try {
    await api.delete(`/admin/opportunities/${id}`);
  } catch (err) {
    throw formatAxiosError(err, "Failed to delete opportunity.");
  }
}

export async function fetchAdminApplications(): Promise<AdminApplication[]> {
  try {
    const res = await api.get<AdminApplication[]>("/admin/applications");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load all applications.");
  }
}

export async function deleteAdminApplication(id: number): Promise<void> {
  try {
    await api.delete(`/admin/applications/${id}`);
  } catch (err) {
    throw formatAxiosError(err, "Failed to delete application.");
  }
}

export async function updateAdminApplicationStatus(
  id: number,
  status: AdminApplication["status"]
): Promise<{ id: number; status: AdminApplication["status"] }> {
  try {
    const res = await api.patch<{ id: number; status: AdminApplication["status"] }>(
      `/admin/applications/${id}/status`,
      { status }
    );
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to update application status.");
  }
}

// ── Testimonials & Site Settings Types & API ─────────────────────────────────

export type TestimonialRecord = {
  id: number;
  quote: string;
  author: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ImpactStat = {
  value: string;
  label: string;
};

export type SiteSettingsRecord = {
  missionStatement: string;
  stats: ImpactStat[];
};

export async function fetchTestimonials(): Promise<TestimonialRecord[]> {
  try {
    const res = await api.get<TestimonialRecord[]>("/testimonials");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load testimonials.");
  }
}

export async function fetchSiteSettings(): Promise<SiteSettingsRecord> {
  try {
    const res = await api.get<SiteSettingsRecord>("/site-settings");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load site settings.");
  }
}

export async function fetchAdminTestimonials(): Promise<TestimonialRecord[]> {
  try {
    const res = await api.get<TestimonialRecord[]>("/admin/testimonials");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load admin testimonials.");
  }
}

export async function createAdminTestimonial(
  data: Omit<TestimonialRecord, "id" | "createdAt" | "updatedAt">
): Promise<TestimonialRecord> {
  try {
    const res = await api.post<TestimonialRecord>("/admin/testimonials", data);
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to create testimonial.");
  }
}

export async function updateAdminTestimonial(
  id: number,
  data: Partial<Omit<TestimonialRecord, "id" | "createdAt" | "updatedAt">>
): Promise<TestimonialRecord> {
  try {
    const res = await api.patch<TestimonialRecord>(
      `/admin/testimonials/${id}`,
      data
    );
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to update testimonial.");
  }
}

export async function deleteAdminTestimonial(id: number): Promise<void> {
  try {
    await api.delete(`/admin/testimonials/${id}`);
  } catch (err) {
    throw formatAxiosError(err, "Failed to delete testimonial.");
  }
}

export async function fetchAdminSiteSettings(): Promise<SiteSettingsRecord> {
  try {
    const res = await api.get<SiteSettingsRecord>("/admin/site-settings");
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to load site settings.");
  }
}

export async function updateAdminSiteSettings(
  data: SiteSettingsRecord
): Promise<SiteSettingsRecord> {
  try {
    const res = await api.patch<SiteSettingsRecord>(
      `/admin/site-settings`,
      data
    );
    return res.data;
  } catch (err) {
    throw formatAxiosError(err, "Failed to update site settings.");
  }
}
