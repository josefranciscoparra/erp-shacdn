import { useEffect, useState } from "react";

/**
 * Hook para verificar si el chat está habilitado en la organización
 */
export function useChatEnabled() {
  const [chatEnabled, setChatEnabled] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChatConfig = async () => {
      try {
        const response = await fetch("/api/chat/config");
        if (response.ok) {
          const data = await response.json();
          setChatEnabled(data.chatEnabled ?? false);
        } else {
          setChatEnabled(false);
        }
      } catch {
        setChatEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchChatConfig();
  }, []);

  return { chatEnabled, isLoading };
}
