-- CAOBA POS - Database Schema
-- Automatización 100% nativa de Tasa BCV con pg_net y pg_cron

-- 1. Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- 2. Tabla exchange_rates (Tasa oficial BCV y fuentes de cambio)
CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  currency TEXT NOT NULL DEFAULT 'USD_VES',
  source TEXT NOT NULL DEFAULT 'bcv',
  rate NUMERIC(14,4) NOT NULL,
  raw_payload JSONB,
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_current BOOLEAN DEFAULT true
);

-- Habilitar Row-Level Security (RLS)
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_exchange_rates_currency_current ON exchange_rates(currency, is_current);

-- Políticas RLS
CREATE POLICY "admin_all" ON exchange_rates FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "auth_select" ON exchange_rates FOR SELECT TO authenticated USING (true);
CREATE POLICY "anon_select" ON exchange_rates FOR SELECT TO anon USING (true);
CREATE POLICY "auth_insert" ON exchange_rates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON exchange_rates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 3. Función para actualizar la tasa oficial (restringida a usuarios autenticados)
CREATE OR REPLACE FUNCTION update_exchange_rate(
  p_rate NUMERIC,
  p_source TEXT DEFAULT 'bcv',
  p_payload JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
BEGIN
  -- Desmarcar tasa actual previa
  UPDATE exchange_rates
  SET is_current = false
  WHERE currency = 'USD_VES' AND is_current = true;

  -- Insertar nuevo registro como activo
  INSERT INTO exchange_rates (currency, source, rate, raw_payload, updated_at, is_current)
  VALUES ('USD_VES', p_source, p_rate, p_payload, now(), true)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION update_exchange_rate(NUMERIC, TEXT, JSONB) FROM public, anon;
GRANT EXECUTE ON FUNCTION update_exchange_rate(NUMERIC, TEXT, JSONB) TO authenticated, service_role;

-- 4. Trigger para procesar la respuesta HTTP de DolarAPI e insertar en exchange_rates
CREATE OR REPLACE FUNCTION process_bcv_http_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload JSONB;
  v_rate NUMERIC;
BEGIN
  IF NEW.status_code = 200 AND NEW.content IS NOT NULL THEN
    BEGIN
      v_payload := NEW.content::JSONB;
      v_rate := COALESCE(
        (v_payload->>'promedio')::NUMERIC,
        (v_payload->>'venta')::NUMERIC,
        (v_payload->>'compra')::NUMERIC
      );

      IF v_rate IS NOT NULL AND v_rate > 0 AND (v_payload->>'moneda') = 'USD' THEN
        PERFORM update_exchange_rate(v_rate, 'bcv', v_payload);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION process_bcv_http_response() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_process_bcv_response ON net._http_response;
CREATE TRIGGER trg_process_bcv_response
AFTER INSERT ON net._http_response
FOR EACH ROW
EXECUTE FUNCTION process_bcv_http_response();

-- 5. Programar ejecución cada hora automáticamente
SELECT cron.schedule(
  'sync-bcv-exchange-rate',
  '0 * * * *',
  $$SELECT net.http_get('https://ve.dolarapi.com/v1/dolares/oficial');$$
);
