"use client";

import { useState } from "react";

import { Search } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ConversationWithParticipants } from "@/lib/chat/types";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationCreated: (conversation: ConversationWithParticipants) => void;
}

interface UserSearchResult {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

export function NewChatDialog({ open, onOpenChange, onConversationCreated }: NewChatDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  // Buscar usuarios
  const handleSearch = async (value: string) => {
    setQuery(value);

    if (!value.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/chat/users/search?q=${encodeURIComponent(value)}`);
      const data = await response.json();

      if (data.users) {
        setResults(data.users);
      }
    } catch (error) {
      console.error("Error buscando usuarios:", error);
    } finally {
      setLoading(false);
    }
  };

  // Crear conversación con usuario seleccionado
  const handleSelectUser = async (userId: string) => {
    setCreating(true);
    try {
      const response = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ peerUserId: userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error ?? "Error al crear conversación");
      }

      const { conversation } = await response.json();

      onConversationCreated(conversation);
      setQuery("");
      setResults([]);
    } catch (error) {
      console.error("Error creando conversación:", error);
      toast.error(error instanceof Error ? error.message : "Error al crear conversación");
    } finally {
      setCreating(false);
    }
  };

  // Limpiar formulario cuando se cierra el modal
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuery("");
      setResults([]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo chat</DialogTitle>
          <DialogDescription>Busca un usuario para iniciar una conversación</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Buscar por nombre o email..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
              disabled={creating}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="border-primary h-6 w-6 animate-spin rounded-full border-2 border-t-transparent" />
            </div>
          ) : results.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="space-y-1">
                {results.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user.id)}
                    disabled={creating}
                    className="hover:bg-muted flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors disabled:opacity-50"
                  >
                    <Avatar key={user.id}>
                      <AvatarImage src={user.image ?? undefined} alt={user.name} />
                      <AvatarFallback>
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium">{user.name}</p>
                      <p className="text-muted-foreground truncate text-sm">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : query.trim() ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
              <p>No se encontraron usuarios</p>
              <p className="text-xs">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            <div className="text-muted-foreground flex flex-col items-center justify-center py-8 text-center">
              <Search className="mb-2 h-8 w-8" />
              <p>Escribe para buscar usuarios</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
