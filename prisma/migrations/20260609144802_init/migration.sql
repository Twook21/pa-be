-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "activity_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "attendance_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "config_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification_schema";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "request_schema";

-- CreateEnum
CREATE TYPE "auth_schema"."UserRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "auth_schema"."UserStatus" AS ENUM ('active', 'inactive', 'resigned');

-- CreateEnum
CREATE TYPE "attendance_schema"."AttendanceStatus" AS ENUM ('present', 'late', 'absent', 'sakit', 'cuti', 'dinas_luar');

-- CreateEnum
CREATE TYPE "request_schema"."RequestStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "auth_schema"."users" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "password" VARCHAR(255) NOT NULL,
    "photo" VARCHAR(255),
    "role" "auth_schema"."UserRole" NOT NULL DEFAULT 'user',
    "division" VARCHAR(255),
    "phone_number" VARCHAR(15),
    "status" "auth_schema"."UserStatus" NOT NULL DEFAULT 'active',
    "resign_date" TIMESTAMP(3),
    "fcm_token" VARCHAR(255),
    "reset_token" VARCHAR(255),
    "reset_token_exp" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "activity_schema"."activities" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "photo" VARCHAR(255),
    "check_in_start" VARCHAR(5) NOT NULL,
    "check_in_end" VARCHAR(5) NOT NULL,
    "check_out_start" VARCHAR(5) NOT NULL,
    "check_out_end" VARCHAR(5) NOT NULL,
    "check_in_latitude" DECIMAL(10,8),
    "check_in_longitude" DECIMAL(11,8),
    "check_out_latitude" DECIMAL(10,8),
    "check_out_longitude" DECIMAL(11,8),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "config_schema"."locations" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "radius" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_schema"."attendance_settings" (
    "id" SERIAL NOT NULL,
    "check_in_start" VARCHAR(5) NOT NULL,
    "check_in_end" VARCHAR(5) NOT NULL,
    "check_out_start" VARCHAR(5) NOT NULL,
    "check_out_end" VARCHAR(5) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "config_schema"."calendars" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "day" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "is_holiday" BOOLEAN NOT NULL DEFAULT false,
    "holiday_name" VARCHAR(255),
    "holiday_type" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_schema"."notifications" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(255) NOT NULL,
    "notifiable_type" VARCHAR(255) NOT NULL,
    "notifiable_id" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_schema"."user_locations" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "latitude" DECIMAL(10,8) NOT NULL,
    "longitude" DECIMAL(11,8) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "auth_schema"."users"("email");

-- CreateIndex
CREATE INDEX "attendances_user_id_date_idx" ON "attendance_schema"."attendances"("user_id", "date");

-- CreateIndex
CREATE INDEX "attendances_date_status_idx" ON "attendance_schema"."attendances"("date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "activities_date_key" ON "activity_schema"."activities"("date");

-- CreateIndex
CREATE INDEX "leave_requests_user_id_status_idx" ON "request_schema"."leave_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "external_duties_user_id_date_idx" ON "request_schema"."external_duties"("user_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "calendars_date_key" ON "config_schema"."calendars"("date");

-- CreateIndex
CREATE INDEX "calendars_year_month_idx" ON "config_schema"."calendars"("year", "month");

-- CreateIndex
CREATE INDEX "calendars_date_is_holiday_idx" ON "config_schema"."calendars"("date", "is_holiday");

-- CreateIndex
CREATE INDEX "notifications_notifiable_type_notifiable_id_idx" ON "notification_schema"."notifications"("notifiable_type", "notifiable_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_user_id_key" ON "notification_schema"."user_locations"("user_id");
