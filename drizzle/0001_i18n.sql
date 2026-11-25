-- Trip text becomes per-locale JSON ({"en": …, "ru": …, "ky": …}) and `region` becomes a key.
-- The column types are unchanged (TEXT), so this is a data-only migration. Existing rows keep their
-- English text in every locale until re-seeded or translated; unknown regions fall back to 'multi'.
UPDATE trips SET
  title = json_object('en', title, 'ru', title, 'ky', title),
  summary = json_object('en', summary, 'ru', summary, 'ky', summary),
  description = json_object('en', description, 'ru', description, 'ky', description),
  highlights = json_object('en', json(highlights), 'ru', json(highlights), 'ky', json(highlights)),
  itinerary = json_object('en', json(itinerary), 'ru', json(itinerary), 'ky', json(itinerary)),
  region = CASE region
    WHEN 'Naryn' THEN 'naryn'
    WHEN 'Issyk-Kul' THEN 'issyk_kul'
    WHEN 'Chui' THEN 'chui'
    WHEN 'Talas' THEN 'talas'
    WHEN 'Jalal-Abad' THEN 'jalal_abad'
    WHEN 'Osh' THEN 'osh'
    WHEN 'Batken' THEN 'batken'
    ELSE 'multi'
  END;
