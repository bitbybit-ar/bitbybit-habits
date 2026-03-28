-- BitByBit Habits - Database Schema
-- Neon DB (PostgreSQL)
-- Modelo: Sponsor crea habitos con recompensa en sats, Kid los completa, Sponsor aprueba y paga

-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    nostr_pubkey TEXT UNIQUE,
    locale TEXT NOT NULL DEFAULT 'es',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_nostr_pubkey ON users(nostr_pubkey);

-- ============================================================
-- FAMILIAS / GRUPOS
-- ============================================================
CREATE TABLE IF NOT EXISTS families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS family_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('sponsor', 'kid')),
    joined_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(family_id, user_id)
);

-- ============================================================
-- HABITOS
-- ============================================================
CREATE TABLE IF NOT EXISTS habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_id UUID REFERENCES families(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),
    assigned_to UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#F7A825',
    icon TEXT,
    sat_reward INTEGER NOT NULL DEFAULT 0,
    schedule_type TEXT NOT NULL DEFAULT 'daily' CHECK (schedule_type IN ('daily', 'specific_days', 'times_per_week')),
    schedule_days INTEGER[], -- 0=Dom, 1=Lun, etc.
    schedule_times_per_week INTEGER,
    verification_type TEXT NOT NULL DEFAULT 'sponsor_approval' CHECK (verification_type IN ('sponsor_approval', 'self_verify', 'bot_verify')),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_habits_family ON habits(family_id);
CREATE INDEX idx_habits_assigned ON habits(assigned_to);

-- ============================================================
-- COMPLETADOS (kid marca como hecho)
-- ============================================================
CREATE TABLE IF NOT EXISTS completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    evidence_url TEXT,
    note TEXT,
    completed_at TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    UNIQUE(habit_id, user_id, date)
);

CREATE INDEX idx_completions_habit ON completions(habit_id);
CREATE INDEX idx_completions_user ON completions(user_id);
CREATE INDEX idx_completions_date ON completions(date);
CREATE INDEX idx_completions_status ON completions(status);

-- ============================================================
-- PAGOS LIGHTNING
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    completion_id UUID NOT NULL REFERENCES completions(id),
    from_user_id UUID NOT NULL REFERENCES users(id),
    to_user_id UUID NOT NULL REFERENCES users(id),
    amount_sats INTEGER NOT NULL,
    payment_request TEXT,
    payment_hash TEXT,
    preimage TEXT,
    payment_method TEXT CHECK (payment_method IN ('webln', 'nwc', 'manual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed')),
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_completion ON payments(completion_id);
CREATE INDEX idx_payments_status ON payments(status);

-- ============================================================
-- WALLETS (conexion NWC del sponsor)
-- ============================================================
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) UNIQUE,
    nwc_url_encrypted TEXT NOT NULL,
    label TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- NOTIFICACIONES
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = false;

-- ============================================================
-- ASIGNACIONES DE HABITOS (múltiples miembros por hábito)
-- ============================================================
CREATE TABLE IF NOT EXISTS habit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(habit_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_habit_assignments_habit ON habit_assignments(habit_id);
CREATE INDEX IF NOT EXISTS idx_habit_assignments_user ON habit_assignments(user_id);

-- ============================================================
-- FUNCION: actualizar updated_at automaticamente
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_habits_updated_at
    BEFORE UPDATE ON habits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
