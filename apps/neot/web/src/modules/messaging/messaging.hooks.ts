import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { listConversations, listMessages, listMessagingContacts } from "./messaging.services";

export const conversationsKey = ["messaging", "conversations"] as const;
export function useConversations() { return useQuery({ queryKey: conversationsKey, queryFn: listConversations }); }
export function useMessages(id: string) { return useQuery({ queryKey: ["messaging", "messages", id], queryFn: () => listMessages(id), enabled: Boolean(id) }); }
export function useMessagingContacts(search: string) { return useQuery({ queryKey: ["messaging", "contacts", search], queryFn: () => listMessagingContacts(search) }); }

export function useMessagingSocket() {
  const client = useQueryClient();
  useEffect(() => {
    const token = window.localStorage.getItem("neot_session");
    if (!token) return;
    const socket = io(import.meta.env.VITE_PLATFORM_API_URL.replace(/\/+$/u, ""), {
      auth: { token }, path: "/api/neot/messaging/socket.io", transports: ["websocket", "polling"]
    });
    socket.on("message.created", (message: { conversationId: string }) => {
      void client.invalidateQueries({ queryKey: ["messaging", "messages", message.conversationId] });
      void client.invalidateQueries({ queryKey: conversationsKey });
    });
    socket.on("conversation.read", (receipt: { conversationId: string }) => {
      void client.invalidateQueries({ queryKey: ["messaging", "messages", receipt.conversationId] });
      void client.invalidateQueries({ queryKey: conversationsKey });
    });
    return () => { socket.close(); };
  }, [client]);
}
