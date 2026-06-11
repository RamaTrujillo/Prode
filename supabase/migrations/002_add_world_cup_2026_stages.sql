-- El Mundial 2026 tiene 48 equipos, lo que agrega la ronda de dieciseisavos
-- ('round_of_32'). También se incluye el partido por el tercer puesto
-- ('third_place'). Ampliamos el CHECK del stage para aceptar ambos.

ALTER TABLE matches DROP CONSTRAINT matches_stage_check;

ALTER TABLE matches ADD CONSTRAINT matches_stage_check
  CHECK (stage IN ('group', 'round_of_32', 'round_of_16', 'quarter', 'semi', 'third_place', 'final'));
