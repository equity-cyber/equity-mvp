-- ============================================================================
-- Limpieza de perfiles de prueba + validación server-side
-- Proyecto: eocfuhidteqlatkxhrac
-- EJECUTAR POR BLOQUES en el SQL Editor de Supabase (uno a uno)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- BLOQUE 0 · Diagnóstico: qué tipo tienen las columnas id / from_profile_id
-- Ejecuta esto primero para ver los tipos. Si todos son "uuid" o todos "text",
-- los castings de abajo funcionarán sin cambios.
-- ----------------------------------------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (column_name IN ('id', 'from_profile_id', 'to_profile_id', 'profile_id'))
  AND table_name IN ('profiles','messages','connections')
ORDER BY table_name, column_name;


-- ----------------------------------------------------------------------------
-- BLOQUE 1 · Identificar los IDs de perfiles inválidos (solo SELECT, no borra)
-- Revisa el listado antes de ejecutar los DELETE.
-- ----------------------------------------------------------------------------
SELECT id, full_name, bio
FROM profiles
WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                 'loco','prueba','test','testing','asdf','qwer',
                                 'pepe lopez','amazon undertaker')
   OR LENGTH(TRIM(full_name)) < 3
   OR COALESCE(LENGTH(TRIM(bio)), 0) < 30;


-- ----------------------------------------------------------------------------
-- BLOQUE 2 · Borrar mensajes de perfiles inválidos (cast a text por si hay mismatch)
-- ----------------------------------------------------------------------------
DELETE FROM messages
WHERE from_profile_id::text IN (
  SELECT id::text FROM profiles
  WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                   'loco','prueba','test','testing','asdf','qwer',
                                   'pepe lopez','amazon undertaker')
     OR LENGTH(TRIM(full_name)) < 3
     OR COALESCE(LENGTH(TRIM(bio)), 0) < 30
);


-- ----------------------------------------------------------------------------
-- BLOQUE 3 · Borrar conexiones de perfiles inválidos
-- ----------------------------------------------------------------------------
DELETE FROM connections
WHERE from_profile_id::text IN (
  SELECT id::text FROM profiles
  WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                   'loco','prueba','test','testing','asdf','qwer',
                                   'pepe lopez','amazon undertaker')
     OR LENGTH(TRIM(full_name)) < 3
     OR COALESCE(LENGTH(TRIM(bio)), 0) < 30
)
OR to_profile_id::text IN (
  SELECT id::text FROM profiles
  WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                   'loco','prueba','test','testing','asdf','qwer',
                                   'pepe lopez','amazon undertaker')
     OR LENGTH(TRIM(full_name)) < 3
     OR COALESCE(LENGTH(TRIM(bio)), 0) < 30
);


-- ----------------------------------------------------------------------------
-- BLOQUE 4 · Borrar paywall_events huérfanos (si existe la tabla)
-- ----------------------------------------------------------------------------
DELETE FROM paywall_events
WHERE profile_id::text IN (
  SELECT id::text FROM profiles
  WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                   'loco','prueba','test','testing','asdf','qwer',
                                   'pepe lopez','amazon undertaker')
     OR LENGTH(TRIM(full_name)) < 3
     OR COALESCE(LENGTH(TRIM(bio)), 0) < 30
);


-- ----------------------------------------------------------------------------
-- BLOQUE 5 · Borrar los perfiles inválidos
-- ----------------------------------------------------------------------------
DELETE FROM profiles
WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                 'loco','prueba','test','testing','asdf','qwer',
                                 'pepe lopez','amazon undertaker')
   OR LENGTH(TRIM(full_name)) < 3
   OR COALESCE(LENGTH(TRIM(bio)), 0) < 30;


-- ----------------------------------------------------------------------------
-- BLOQUE 6 · Eliminar duplicados (mismo user_id, conserva el más reciente)
-- ----------------------------------------------------------------------------
DELETE FROM profiles a
USING profiles b
WHERE a.user_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.created_at < b.created_at;


-- ----------------------------------------------------------------------------
-- BLOQUE 7 · Constraints server-side (previene futuros perfiles inválidos)
-- ----------------------------------------------------------------------------
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_name_min_len;
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_bio_min_len;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_name_min_len
    CHECK (LENGTH(TRIM(full_name)) >= 3);
ALTER TABLE profiles
  ADD CONSTRAINT profiles_bio_min_len
    CHECK (LENGTH(TRIM(COALESCE(bio, ''))) >= 30);


-- ----------------------------------------------------------------------------
-- BLOQUE 8 · Tabla de reportes (para moderación ligera)
-- Si profiles.id es text en lugar de uuid, cambia UUID por TEXT en reporter_id/reported_id
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_reports (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason       TEXT NOT NULL CHECK (LENGTH(reason) BETWEEN 1 AND 500),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (reporter_id, reported_id)
);

ALTER TABLE profile_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own reports read" ON profile_reports;
CREATE POLICY "own reports read" ON profile_reports
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = reporter_id
  ));

DROP POLICY IF EXISTS "own reports insert" ON profile_reports;
CREATE POLICY "own reports insert" ON profile_reports
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = reporter_id
  ));


-- ----------------------------------------------------------------------------
-- BLOQUE 9 · Tabla de bloqueos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_blocks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id)
);

ALTER TABLE profile_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own blocks read" ON profile_blocks;
CREATE POLICY "own blocks read" ON profile_blocks
  FOR SELECT USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = blocker_id
  ));

DROP POLICY IF EXISTS "own blocks insert" ON profile_blocks;
CREATE POLICY "own blocks insert" ON profile_blocks
  FOR INSERT WITH CHECK (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = blocker_id
  ));

DROP POLICY IF EXISTS "own blocks delete" ON profile_blocks;
CREATE POLICY "own blocks delete" ON profile_blocks
  FOR DELETE USING (auth.uid() IN (
    SELECT user_id FROM profiles WHERE id = blocker_id
  ));
