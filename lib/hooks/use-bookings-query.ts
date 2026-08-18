import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { useEffect } from "react";
import type { Booking } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: string;
  department?: string;
  search?: string;
  usingDate?: string;
}

export interface PaginatedBookingsResponse {
  data: Booking[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

async function fetchBookings(
  filters: BookingFilters = {},
): Promise<PaginatedBookingsResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set("page", filters.page.toString());
  if (filters.limit) params.set("limit", filters.limit.toString());
  if (filters.status) params.set("status", filters.status);
  if (filters.department) params.set("department", filters.department);
  if (filters.search) params.set("search", filters.search);
  if (filters.usingDate) params.set("usingDate", filters.usingDate);

  const res = await fetch(`/api/v1/bookings?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to fetch bookings");
  }
  return res.json();
}

export function useBookingsQuery(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: ["bookings", filters],
    queryFn: () => fetchBookings(filters),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useBookingDetailQuery(id: string) {
  return useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/bookings?id=${id}`);
      if (!res.ok) throw new Error("Failed to fetch booking detail");
      const data = await res.json();
      return data.data?.[0] as Booking | undefined;
    },
    enabled: Boolean(id),
    staleTime: 30_000,
  });
}

export function useUpdateBookingMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Booking>;
    }) => {
      const res = await fetch(`/api/v1/bookings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update booking");
      }
      return res.json();
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: ["booking", id] });
      const previousBooking = queryClient.getQueryData<Booking>([
        "booking",
        id,
      ]);

      if (previousBooking) {
        queryClient.setQueryData<Booking>(["booking", id], {
          ...previousBooking,
          ...patch,
        });
      }

      return { previousBooking };
    },
    onError: (_err, { id }, context) => {
      if (context?.previousBooking) {
        queryClient.setQueryData(["booking", id], context.previousBooking);
      }
    },
    onSettled: (_data, _error, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["booking", id] });
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });
}

export function useRealtimeBooking(bookingId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!bookingId) return;
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`booking-realtime-${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
          filter: `id=eq.${bookingId}`,
        },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["booking", bookingId] });
          void queryClient.invalidateQueries({ queryKey: ["bookings"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient]);
}
