-- CreateEnum
CREATE TYPE "Department" AS ENUM ('AM', 'RM', 'TN', 'Audit');

-- CreateEnum
CREATE TYPE "EligibilityResult" AS ENUM ('ELIGIBLE', 'NOT_ELIGIBLE');

-- CreateEnum
CREATE TYPE "StatusFlag" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "ApproverAction" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "budgetPerNight" INTEGER NOT NULL DEFAULT 560,
    "isNewBranch" BOOLEAN NOT NULL DEFAULT false,
    "openDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hotel" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "pricePerNight" INTEGER,
    "recommendLevel" INTEGER NOT NULL DEFAULT 3,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hotel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "amTeam" TEXT,
    "codeNickname" TEXT,
    "storeCenterBranchId" TEXT,
    "hasCompanyCar" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "firebaseUid" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Approver" (
    "id" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "nickname" TEXT NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Approver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "requestCode" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "employeeId" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "destinationBranchId" TEXT NOT NULL,
    "hasCompanyCar" BOOLEAN NOT NULL,
    "storeCenterBranchId" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "distanceCheckPassed" BOOLEAN,
    "isAmTnTwoShift" BOOLEAN,
    "isAmTwoBranchesSimultaneous" BOOLEAN,
    "hasOtherReason" BOOLEAN,
    "otherReasonText" TEXT,
    "eligibilityResult" "EligibilityResult",
    "selectedHotelId" TEXT,
    "otherHotelName" TEXT,
    "bookingLink" TEXT,
    "pricePerNight" INTEGER,
    "checkInDate" TIMESTAMP(3),
    "checkOutDate" TIMESTAMP(3),
    "isHotelInMasterList" BOOLEAN,
    "budgetPerNight" INTEGER,
    "priceDiff" INTEGER,
    "guestWillingToPayDiff" BOOLEAN,
    "statusFlag" "StatusFlag",
    "approverId" TEXT,
    "approverAction" "ApproverAction" NOT NULL DEFAULT 'PENDING',
    "approverComment" TEXT,
    "approverActionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "Hotel_branchId_idx" ON "Hotel"("branchId");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_code_key" ON "Employee"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_firebaseUid_key" ON "Employee"("firebaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "Approver_department_key" ON "Approver"("department");

-- CreateIndex
CREATE UNIQUE INDEX "Request_requestCode_key" ON "Request"("requestCode");

-- CreateIndex
CREATE INDEX "Request_employeeId_idx" ON "Request"("employeeId");

-- CreateIndex
CREATE INDEX "Request_approverId_idx" ON "Request"("approverId");

-- CreateIndex
CREATE INDEX "Request_approverAction_idx" ON "Request"("approverAction");

-- AddForeignKey
ALTER TABLE "Hotel" ADD CONSTRAINT "Hotel_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_storeCenterBranchId_fkey" FOREIGN KEY ("storeCenterBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_destinationBranchId_fkey" FOREIGN KEY ("destinationBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_storeCenterBranchId_fkey" FOREIGN KEY ("storeCenterBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_selectedHotelId_fkey" FOREIGN KEY ("selectedHotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "Approver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
