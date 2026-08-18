-- CreateTable
CREATE TABLE "HotelCandidateReview" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "hotelName" TEXT NOT NULL,
    "dismissed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HotelCandidateReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HotelCandidateReview_branchId_hotelName_key" ON "HotelCandidateReview"("branchId", "hotelName");

-- AddForeignKey
ALTER TABLE "HotelCandidateReview" ADD CONSTRAINT "HotelCandidateReview_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
