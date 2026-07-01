import { hash } from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

function requireAdminConfig(): { email: string; password: string; name: string } {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME ?? "Admin";

  if (process.env.NODE_ENV === "production" && (!email || !password)) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required in production."
    );
  }

  const resolvedEmail = email ?? "admin@agencyos.com";
  const DEFAULT_PASSWORD = "Admin@123";
  const resolvedPassword = password ?? DEFAULT_PASSWORD;

  if (!password) {
    logger.warn(
      { email: resolvedEmail, defaultPassword: DEFAULT_PASSWORD },
      `Bootstrap: ADMIN_PASSWORD not set — using default password. Set ADMIN_PASSWORD in Replit Secrets to use a custom password.`
    );
  }

  return { email: resolvedEmail, password: resolvedPassword, name };
}

export async function bootstrapDatabase(): Promise<void> {
  try {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'MANAGER',
        system_role TEXT NOT NULL DEFAULT 'ACCOUNT_MANAGER',
        department TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate: rename old 'password' column to 'password_hash' if it exists
    await db.execute(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'password'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'password_hash'
        ) THEN
          ALTER TABLE users RENAME COLUMN password TO password_hash;
        END IF;
      END $$;
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        company_name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        website TEXT,
        category TEXT DEFAULT 'RETAINER',
        health TEXT DEFAULT 'GREEN',
        notes TEXT,
        service_type TEXT,
        service_details TEXT,
        social_handles TEXT,
        website_url TEXT,
        content_frequency TEXT,
        target_audience TEXT,
        platforms TEXT,
        social_goals TEXT,
        content_types TEXT,
        website_type TEXT,
        website_features TEXT,
        cms_preference TEXT,
        budget_range TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "service_type TEXT", "service_details TEXT", "social_handles TEXT",
      "website_url TEXT", "content_frequency TEXT", "target_audience TEXT",
      "platforms TEXT", "social_goals TEXT", "content_types TEXT",
      "website_type TEXT", "website_features TEXT", "cms_preference TEXT", "budget_range TEXT",
      "logo_url TEXT",
    ]) {
      const [colName] = col.split(" ");
      await db.execute(`ALTER TABLE clients ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    for (const col of [
      "system_role TEXT NOT NULL DEFAULT 'ACCOUNT_MANAGER'",
      "department TEXT",
      "role TEXT NOT NULL DEFAULT 'MANAGER'",
      "password_hash TEXT",
      "allowed_modules TEXT",
    ]) {
      await db.execute(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        title TEXT,
        company_name TEXT,
        contact_name TEXT,
        email TEXT,
        stage TEXT DEFAULT 'LEAD',
        value NUMERIC,
        stage_changed_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate leads table to match current Drizzle schema
    for (const col of [
      "title TEXT",
      "contact_name TEXT",
      "value NUMERIC",
      "stage_changed_at TIMESTAMP DEFAULT NOW()",
    ]) {
      await db.execute(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'PLANNING',
        start_date TEXT,
        end_date TEXT,
        budget NUMERIC,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
        assignee_id TEXT,
        status TEXT DEFAULT 'TODO',
        priority TEXT DEFAULT 'MEDIUM',
        due_date TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS content_posts (
        id TEXT PRIMARY KEY,
        platform TEXT DEFAULT 'INSTAGRAM',
        content_type TEXT DEFAULT 'POST',
        status TEXT DEFAULT 'IDEA',
        caption TEXT,
        description TEXT,
        reference_url TEXT,
        scheduled_at TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "title TEXT", "script TEXT", "ideation TEXT",
      "reference_links JSON", "shoot_date TEXT", "assets_link TEXT",
      "format TEXT", "needs_revision TEXT DEFAULT 'false'",
      "custom_properties JSON", "comments JSON",
      "approval_status TEXT DEFAULT 'PENDING'",
      "approved_by TEXT",
      "approved_at TIMESTAMP",
      "rejection_note TEXT",
      "media_urls JSONB DEFAULT '[]'",
    ]) {
      await db.execute(`ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY,
        number TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'DRAFT',
        invoice_date TEXT,
        due_date TEXT,
        subtotal REAL DEFAULT 0,
        tax_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        discount_type TEXT DEFAULT 'FIXED',
        total REAL DEFAULT 0,
        notes TEXT,
        currency TEXT DEFAULT 'INR',
        gst_type TEXT DEFAULT 'CGST_SGST',
        logo_url TEXT,
        business_name TEXT,
        business_phone TEXT,
        business_email TEXT,
        business_pan TEXT,
        company_gstin TEXT,
        business_address TEXT,
        business_city TEXT,
        business_postal_code TEXT,
        business_state TEXT,
        client_gstin TEXT,
        client_phone TEXT,
        client_email TEXT,
        client_pan TEXT,
        billing_address TEXT,
        client_city TEXT,
        client_postal_code TEXT,
        client_state TEXT,
        shipping_address TEXT,
        terms_and_conditions TEXT,
        signature_url TEXT,
        bank_details JSONB,
        line_items JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Migrate existing invoices table: add number column (was invoice_number)
    for (const col of [
      "number TEXT",
      "tax_amount REAL DEFAULT 0",
      "discount REAL DEFAULT 0",
      "discount_type TEXT DEFAULT 'FIXED'",
      "currency TEXT DEFAULT 'INR'",
      "gst_type TEXT DEFAULT 'CGST_SGST'",
      "logo_url TEXT",
      "business_name TEXT", "business_phone TEXT", "business_email TEXT", "business_pan TEXT",
      "company_gstin TEXT",
      "business_address TEXT", "business_city TEXT", "business_postal_code TEXT", "business_state TEXT",
      "client_gstin TEXT", "client_phone TEXT", "client_email TEXT", "client_pan TEXT",
      "billing_address TEXT", "client_city TEXT", "client_postal_code TEXT", "client_state TEXT",
      "shipping_address TEXT",
      "terms_and_conditions TEXT",
      "signature_url TEXT",
      "bank_details JSONB",
      "line_items JSONB",
    ]) {
      await db.execute(`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS quotations (
        id TEXT PRIMARY KEY,
        number TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        status TEXT DEFAULT 'DRAFT',
        valid_until TEXT,
        subtotal NUMERIC DEFAULT 0,
        tax_amount NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    for (const col of [
      "quotation_date TEXT",
      "due_date TEXT",
      "currency TEXT DEFAULT 'INR'",
      "company_name TEXT",
      "company_phone TEXT",
      "company_gstin TEXT",
      "company_address TEXT",
      "company_city TEXT",
      "company_postal TEXT",
      "company_state TEXT",
      "company_email TEXT",
      "company_pan TEXT",
      "logo_url TEXT",
      "client_name TEXT",
      "client_phone TEXT",
      "client_gstin TEXT",
      "client_address TEXT",
      "client_city TEXT",
      "client_postal TEXT",
      "client_state TEXT",
      "client_email TEXT",
      "client_pan TEXT",
      "billing_address TEXT",
      "shipping_address TEXT",
      "line_items JSON",
      "tax_amount NUMERIC DEFAULT 0",
      "discount NUMERIC DEFAULT 0",
      "discount_type TEXT DEFAULT 'AMOUNT'",
      "terms_and_conditions TEXT",
      "signature_text TEXT",
      "bank_details JSON",
      "quotation_number TEXT",
    ]) {
      const [colName] = col.split(" ");
      await db.execute(`ALTER TABLE quotations ADD COLUMN IF NOT EXISTS ${col}`).catch(() => {});
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id TEXT PRIMARY KEY,
        po_number TEXT,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        client_name TEXT,
        status TEXT DEFAULT 'DRAFT',
        po_date TEXT,
        delivery_date TEXT,
        subtotal NUMERIC DEFAULT 0,
        tax NUMERIC DEFAULT 0,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);


    await db.execute(`
      CREATE TABLE IF NOT EXISTS proposals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
        client_name TEXT,
        status TEXT DEFAULT 'DRAFT',
        valid_until TEXT,
        total NUMERIC DEFAULT 0,
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_social_accounts (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        platform TEXT NOT NULL,
        handle TEXT,
        page_id TEXT,
        profile_url TEXT,
        access_token TEXT,
        is_active TEXT DEFAULT 'true',
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS client_calendar_shares (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        share_token TEXT NOT NULL UNIQUE,
        label TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        expires_at TIMESTAMP
      )
    `);

    // Add parentId (subtasks) to tasks
    await db.execute(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES tasks(id) ON DELETE CASCADE`).catch(() => {});

    await db.execute(`
      CREATE TABLE IF NOT EXISTS file_attachments (
        id TEXT PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        url TEXT NOT NULL,
        uploaded_by TEXT REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS leave_balances (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        year INTEGER NOT NULL,
        casual_total INTEGER DEFAULT 12,
        casual_used INTEGER DEFAULT 0,
        sick_total INTEGER DEFAULT 6,
        sick_used INTEGER DEFAULT 0,
        earned_total INTEGER DEFAULT 15,
        earned_used INTEGER DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, year)
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS lead_contacts (
        id TEXT PRIMARY KEY,
        lead_id TEXT REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
        type TEXT NOT NULL DEFAULT 'NOTE',
        subject TEXT NOT NULL,
        body TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS time_entries (
        id TEXT PRIMARY KEY,
        task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
        project_id TEXT REFERENCES projects(id),
        user_id TEXT REFERENCES users(id),
        started_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ended_at TIMESTAMP,
        duration_min INTEGER,
        note TEXT,
        is_billable BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    const { email, password, name } = requireAdminConfig();
    const [existing] = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email));
    if (!existing) {
      const passwordHash = await hash(password, 12);
      await db.insert(usersTable).values({
        name,
        email,
        password: passwordHash,
        role: "SUPER_ADMIN",
        systemRole: "SUPER_ADMIN",
        isActive: true,
      });
      logger.info({ email }, "Bootstrap: admin user created");
    } else {
      // Only sync the password if ADMIN_PASSWORD is explicitly configured.
      // If no env var is set, leave the existing password untouched so restarts
      // never break login.
      if (process.env.ADMIN_PASSWORD) {
        const passwordHash = await hash(password, 12);
        await db.update(usersTable).set({ password: passwordHash }).where(eq(usersTable.email, email));
        logger.info({ email }, "Bootstrap: admin user already exists — password synced from ADMIN_PASSWORD");
      } else {
        logger.info({ email }, "Bootstrap: admin user already exists — password unchanged");
      }
    }
  } catch (err) {
    logger.error({ err }, "Bootstrap failed");
    throw err;
  }
}
