import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { listNotifications, markNotificationRead } from "./notification.services";

const queryKey = ["neot", "notifications"] as const;

export function useNotificationCenter() {
  const queryClient = useQueryClient();
  const inbox = useQuery({ queryFn: listNotifications, queryKey, refetchInterval: 30_000 });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey })
  });

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const token = window.localStorage.getItem("neot_session");
    if (!token) return;
    const configuredApiUrl = import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, "");
    const apiOrigin = configuredApiUrl.startsWith("http")
      ? new URL(configuredApiUrl).origin
      : window.location.origin;
    const socket = io(apiOrigin, {
      auth: { token },
      path: "/api/neot/notifications/socket.io",
      transports: ["polling", "websocket"]
    });
    socket.on("notification.created", () => {
      void queryClient.invalidateQueries({ queryKey });
    });
    return () => {
      socket.close();
    };
  }, [queryClient]);

  return {
    items: inbox.data ?? [],
    markRead: (id: string) => markRead.mutate(id)
  };
}
