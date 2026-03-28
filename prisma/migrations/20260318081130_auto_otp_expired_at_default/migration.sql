-- AlterTable
ALTER TABLE "Otp" ALTER COLUMN "expiredAt" SET DEFAULT now() + interval '5 minutes';
