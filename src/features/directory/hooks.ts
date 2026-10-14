"use client";
import { useQuery } from "@tanstack/react-query";
import { getAvailableSlots, getDoctor, searchDoctors, type SearchFilters } from "@/features/directory/api";
export function useDoctors(filters: SearchFilters = {}) { return useQuery({ queryKey: ["doctors", filters], queryFn: () => searchDoctors(filters) }); }
export function useDoctor(slug: string) { return useQuery({ queryKey: ["doctor", slug], queryFn: () => getDoctor(slug), enabled: Boolean(slug) }); }
export function useAvailableSlots(serviceId: string, date: Date, options: { doctorId?: string; locationId?: string; timezone?: string } = {}) { return useQuery({ queryKey: ["slots", serviceId, date.toISOString().slice(0, 10), options], queryFn: () => getAvailableSlots(serviceId, date, options), enabled: Boolean(serviceId) }); }
