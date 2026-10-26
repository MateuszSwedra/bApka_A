-- Track whether the user finished caretaker/senior role selection.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleSelected" BOOLEAN NOT NULL DEFAULT false;

-- Existing settled accounts: keep them out of role-selection.
UPDATE "User"
SET "roleSelected" = true
WHERE role IN ('CARETAKER', 'HYBRID');

UPDATE "User"
SET "roleSelected" = true
WHERE role = 'DEPENDENT'
  AND EXISTS (
    SELECT 1
    FROM "Connection" c
    WHERE c."dependentId" = "User".id
      AND c."isPaired" = true
  );
