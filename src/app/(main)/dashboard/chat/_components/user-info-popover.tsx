"use client";

import { ReactNode } from "react";

import { Briefcase, Mail, MessageCircle, Phone, PhoneCall } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getUserAvatarUrl, hasAvatar } from "@/lib/chat/avatar-utils";

interface UserInfoPopoverProps {
  userId: string;
  name: string;
  email: string;
  image: string | null;
  phone?: string | null;
  mobilePhone?: string | null;
  department?: string | null;
  children: ReactNode;
}

export function UserInfoPopover({
  userId,
  name,
  email,
  image,
  phone,
  mobilePhone,
  department,
  children,
}: UserInfoPopoverProps) {
  // Determinar qué número usar para llamar (prioridad móvil)
  const callNumber = mobilePhone ?? phone;

  // Formatear número para WhatsApp (eliminar espacios, guiones, paréntesis)
  const formatPhoneForWhatsApp = (phoneNumber: string) => {
    return phoneNumber.replace(/[\s\-()]/g, "");
  };

  const handleCall = () => {
    if (callNumber) {
      window.location.href = `tel:${callNumber}`;
    }
  };

  const handleWhatsApp = () => {
    if (mobilePhone) {
      const formattedNumber = formatPhoneForWhatsApp(mobilePhone);
      window.open(`https://wa.me/${formattedNumber}`, "_blank");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-4">
          {/* Header con avatar y nombre */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {hasAvatar(image) && <AvatarImage src={getUserAvatarUrl(userId)} alt={name} />}
              <AvatarFallback>
                {name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-semibold">{name}</p>
              {department && <p className="text-muted-foreground truncate text-xs">{department}</p>}
            </div>
          </div>

          {/* Información de contacto */}
          <div className="space-y-2">
            {/* Email */}
            <div className="flex items-center gap-2 text-sm">
              <Mail className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="truncate">{email}</span>
            </div>

            {/* Teléfono fijo */}
            {phone && (
              <div className="flex items-center gap-2 text-sm">
                <PhoneCall className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>{phone}</span>
              </div>
            )}

            {/* Teléfono móvil */}
            {mobilePhone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="text-muted-foreground h-4 w-4 shrink-0" />
                <span>{mobilePhone}</span>
              </div>
            )}
          </div>

          {/* Botones de acción */}
          {(callNumber ?? mobilePhone) && (
            <div className="flex gap-2 border-t pt-3">
              {callNumber && (
                <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleCall}>
                  <PhoneCall className="h-4 w-4" />
                  Llamar
                </Button>
              )}
              {mobilePhone && (
                <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={handleWhatsApp}>
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </Button>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
