-- Add 'reserve_fund' and 'other' values to concept_type enum
ALTER TYPE "concept_type" ADD VALUE IF NOT EXISTS 'reserve_fund';
ALTER TYPE "concept_type" ADD VALUE IF NOT EXISTS 'other';
