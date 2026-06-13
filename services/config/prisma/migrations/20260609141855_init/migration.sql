-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "config_schema";

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

-- CreateIndex
CREATE UNIQUE INDEX "calendars_date_key" ON "config_schema"."calendars"("date");

-- CreateIndex
CREATE INDEX "calendars_year_month_idx" ON "config_schema"."calendars"("year", "month");

-- CreateIndex
CREATE INDEX "calendars_date_is_holiday_idx" ON "config_schema"."calendars"("date", "is_holiday");
