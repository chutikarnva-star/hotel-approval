-- AlterTable
ALTER TABLE "Request" DROP COLUMN "bookingLink",
ADD COLUMN     "choowapBookedAt" TIMESTAMP(3),
ADD COLUMN     "choowapBookingCode" TEXT;
