"use client";

import { useState } from "react";

import { MoreVertical, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clearConversationMessages, hideConversation } from "@/server/actions/chat";

interface ConversationOptionsMenuProps {
  conversationId: string;
  onClearSuccess?: () => void;
  onHideSuccess?: (unreadCount: number) => void;
}

export function ConversationOptionsMenu({
  conversationId,
  onClearSuccess,
  onHideSuccess,
}: ConversationOptionsMenuProps) {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleClearChat = async () => {
    setIsClearing(true);
    try {
      await clearConversationMessages(conversationId);
      toast.success("Chat vaciado correctamente");
      setShowClearDialog(false);
      onClearSuccess?.();
    } catch (error) {
      console.error("Error al vaciar chat:", error);
      toast.error(error instanceof Error ? error.message : "Error al vaciar el chat");
    } finally {
      setIsClearing(false);
    }
  };

  const handleHideConversation = async () => {
    setIsDeleting(true);
    try {
      const result = await hideConversation(conversationId);
      toast.success("Conversación eliminada");
      setShowDeleteDialog(false);
      onHideSuccess?.(result.unreadCount);
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar la conversación");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Opciones</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowClearDialog(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Vaciar chat
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteDialog(true);
            }}
            className="text-destructive"
          >
            <X className="mr-2 h-4 w-4" />
            Eliminar conversación
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Dialog de confirmación para vaciar chat */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Vaciar este chat?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán todos los mensajes de esta conversación. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearChat} disabled={isClearing}>
              {isClearing ? "Vaciando..." : "Vaciar chat"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmación para eliminar conversación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta conversación?</AlertDialogTitle>
            <AlertDialogDescription>
              La conversación se ocultará de tu lista. Si recibes un nuevo mensaje, volverá a aparecer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleHideConversation} disabled={isDeleting} className="bg-destructive">
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
