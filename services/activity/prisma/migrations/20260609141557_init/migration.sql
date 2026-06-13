-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "activity_schema";

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

-- CreateIndex
CREATE UNIQUE INDEX "activities_date_key" ON "activity_schema"."activities"("date");
