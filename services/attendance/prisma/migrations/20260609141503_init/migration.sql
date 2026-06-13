-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "attendance_schema";

-- CreateEnum
CREATE TYPE "attendance_schema"."AttendanceStatus" AS ENUM ('present', 'late', 'absent', 'sakit', 'cuti', 'dinas_luar');

-- CreateTable
CREATE TABLE "attendance_schema"."attendances" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "check_in_time" TIME,
    "check_out_time" TIME,
    "check_in_photo" VARCHAR(255),
    "check_out_photo" VARCHAR(255),
    "check_in_latitude" DECIMAL(10,8),
    "check_in_longitude" DECIMAL(11,8),
    "check_out_latitude" DECIMAL(10,8),
    "check_out_longitude" DECIMAL(11,8),
    "status" "attendance_schema"."AttendanceStatus" NOT NULL DEFAULT 'absent',
    "notes" TEXT,
    "activity_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendances_user_id_date_idx" ON "attendance_schema"."attendances"("user_id", "date");

-- CreateIndex
CREATE INDEX "attendances_date_status_idx" ON "attendance_schema"."attendances"("date", "status");
