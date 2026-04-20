-- ============================================================================
-- Limpieza de perfiles de prueba + validación server-side
-- Ejecutar en Supabase SQL editor (proyecto eocfuhidteqlatkxhrac)
-- ============================================================================

-- 1) Borrar mensajes/conexiones de perfiles inválidos primero (evitar FK)
DELETE FROM messages
WHERE from_profile_id IN (
  SELECT id FROM profiles
  WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                   'loco','prueba','test','testing','asdf','qwer',
                                   'pepe lopez','amazon undertaker')
     OR LENGTH(TRIM(full_name)) < 3
     OR COALESCE(LENGTH(TRIM(bio)), 0) < 30
);

DELETE FROM connections
WHERE from_profile_id IN (
  SELECT id FROM profiles
  WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                   'loco','prueba','test','testing','asdf','qwer',
                                   'pepe lopez','amazon undertaker')
     OR LENGTH(TRIM(full_name)) < 3
     OR COALESCE(LENGTH(TRIM(bio)), 0) < 30
) OR to_profile_id IN (
  SELECT id FROM profiles
  WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                   'loco','prueba','test','testing','asdf','qwer',
                                   'pepe lopez','amazon undertaker')
     OR LENGTH(TRIM(full_name)) < 3
     OR COALESCE(LENGTH(TRIM(bio)), 0) < 30
);

-- 2) Borrar perfiles inválidos
DELETE FROM profiles
WHERE LOWER(TRIM(full_name)) IN ('aa','aaa','aaaa','hh','dd','ff','gg','xx','zz',
                                 'loco','prueba','test','testing','asdf','qwer',
                                 'pepe lopez','amazon undertaker')
   OR LENGTH(TRIM(full_name)) < 3
   OR COALESCE(LENGTH(TRIM(bio)), 0) < 30;

-- 3) Eliminar duplicados (misma combinación user_id+full_name) conservando el más reciente
DELETE FROM profiles a
USING profiles b
WHERE a.user_id IS NOT NULL
  AND a.user_id = b.user_id
  AND a.created_at < b.created_at;

-- 4) Añadir constraints server-side para prevenir inserciones inválidas
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_name_min_len,
  DROP CONSTRAINT IF EXISTS profiles_bio_min_len;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_name_min_len
    CHECK (LENGTH(TRIM(full_name)) >= 3),
  ADD CONSTRAINT profiles_bio_min_len
    CHECK (LENGTH(TRIM(COALESCE(bio, ''))) >= 30);

-- 5) Tabla de reportes (para moderación ligera)
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

-- 6) Tabla de bloqueos
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
