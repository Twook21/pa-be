-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth_schema";

-- CreateEnum
CREATE TYPE "auth_schema"."UserRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "auth_schema"."UserStatus" AS ENUM ('active', 'inactive', 'resigned');

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

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "auth_schema"."users"("email");
