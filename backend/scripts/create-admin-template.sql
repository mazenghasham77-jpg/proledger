-- Example template only. Adapt to your real password hash flow.
-- Recommended real approach: create admin through an app bootstrap script or secure admin endpoint.

-- Example structure reminder:
-- insert into "User" ("id", "email", "passwordHash", "fullName", "role", "isActive", "companyId", "createdAt", "updatedAt")
-- values ('replace-id', 'admin@example.com', 'replace-bcrypt-hash', 'Admin User', 'ADMIN', true, 'seed-company', now(), now());
