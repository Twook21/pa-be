-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "request_schema";

-- CreateEnum
CREATE TYPE "request_schema"."RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "request_schema"."leave_requests" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "reason" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "request_schema"."RequestStatus" NOT NULL DEFAULT 'pending',
    "photo" VARCHAR(255),
    "note" TEXT,
    "response_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_schema"."external_duties" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "location" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "document" VARCHAR(255),
    "status" "request_schema"."RequestStatus" NOT NULL DEFAULT 'pending',
    "approved_by" INTEGER,
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "external_duties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leave_requests_user_id_status_idx" ON "request_schema"."leave_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "external_duties_user_id_date_idx" ON "request_schema"."external_duties"("user_id", "date");
