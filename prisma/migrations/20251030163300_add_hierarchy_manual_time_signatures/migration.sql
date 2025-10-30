-- CreateEnum HierarchyType (all other types already exist)
CREATE TYPE "HierarchyType" AS ENUM ('FLAT', 'DEPARTMENTAL', 'HIERARCHICAL');

-- AlterTable organizations - Add hierarchyType field (all other tables/columns already exist)
ALTER TABLE "organizations" ADD COLUMN "hierarchyType" "HierarchyType" NOT NULL DEFAULT 'DEPARTMENTAL';
