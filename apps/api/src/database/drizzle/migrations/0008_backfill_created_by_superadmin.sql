-- Migration: Backfill created_by field with superadmin user for existing records
-- Description: Updates management_companies and condominiums that have NULL created_by
--              and assigns them to the superadmin user

-- Get the first superadmin user ID
DO $$
DECLARE
    v_superadmin_id UUID;
BEGIN
    -- Find the first user with SUPERADMIN role
    SELECT u.id INTO v_superadmin_id
    FROM users u
    INNER JOIN user_roles ur ON ur.user_id = u.id
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE r.name = 'SUPERADMIN'
      AND ur.condominium_id IS NULL
      AND ur.building_id IS NULL
      AND (ur.is_active = true OR ur.is_active IS NULL)
    LIMIT 1;

    -- If superadmin user exists, update the records
    IF v_superadmin_id IS NOT NULL THEN
        -- Update management_companies with NULL created_by
        UPDATE management_companies
        SET created_by = v_superadmin_id,
            updated_at = NOW()
        WHERE created_by IS NULL;

        -- Update condominiums with NULL created_by
        UPDATE condominiums
        SET created_by = v_superadmin_id,
            updated_at = NOW()
        WHERE created_by IS NULL;

        -- Log the results
        RAISE NOTICE 'Backfilled created_by with superadmin user: %', v_superadmin_id;
    ELSE
        RAISE WARNING 'No superadmin user found. Skipping backfill.';
    END IF;
END $$;
