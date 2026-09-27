-- Matches made before match payments existed (0010) never got paid_at, so the free ones (admins, and anyone
-- while billing is off) and the ones paid with credits looked unpaid: their page waited for a payment forever
-- and the partner's link stayed closed. They were paid, or free, when made.
UPDATE "matches" SET "paid_at" = "created_at"
WHERE "paid_at" IS NULL
  AND ("source" IN ('admin', 'free')
       OR EXISTS (SELECT 1 FROM "credit_ledger" l WHERE l."reason" = 'match' AND l."ref" = "matches"."id"::text));
