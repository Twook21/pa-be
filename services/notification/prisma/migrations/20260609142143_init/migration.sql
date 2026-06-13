-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notification_schema";

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
CREATE INDEX "notifications_notifiable_type_notifiable_id_idx" ON "notification_schema"."notifications"("notifiable_type", "notifiable_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_user_id_key" ON "notification_schema"."user_locations"("user_id");
