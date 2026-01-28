-- Add retroactive options to absence types
ALTER TABLE "public"."absence_types" ADD COLUMN "allowRetroactive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "public"."absence_types" ADD COLUMN "retroactiveMaxDays" INTEGER NOT NULL DEFAULT 0;
