/*
  Warnings:

  - You are about to drop the column `refreshTokenHash` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `users` table. All the data in the column will be lost.
  - Added the required column `hashedRefreshToken` to the `sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hashedPassword` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "refreshTokenHash",
ADD COLUMN     "hashedRefreshToken" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "password",
ADD COLUMN     "hashedPassword" TEXT NOT NULL,
ADD COLUMN     "isEnabled2FA" BOOLEAN NOT NULL DEFAULT false;
