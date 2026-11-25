# Translation glossary

Use these terms everywhere (UI dictionaries, admin, seed trip content) so one concept has one word per language.
Russian: lower-case «вы». Kyrgyz: «сиз» (polite), Cyrillic only, with ө, ү, ң. Strings with counts always use plural entries (`plural()`); Kyrgyz forms stay identical after a numeral.

| Concept | English | Русский | Кыргызча |
| --- | --- | --- | --- |
| Trip (product) | trip, journey | поездка (в админке тоже «поездка») | саякат |
| Departure (a dated run of a trip) | departure | выезд | жөнөө |
| Booking | booking | бронирование | брондоо |
| Booking request | booking request | заявка | өтүнүч |
| Traveler | traveler | путешественник | саякатчы |
| Yurt | yurt | юрта | боз үй |
| Yurt camp | yurt camp | юртовый лагерь | боз үй лагери |
| Shared / private yurt | shared / private yurt | общая / отдельная юрта | жалпы / жеке боз үй |
| Smoke ring of a yurt | shanyrak | шанырак | шаңырак |
| Felt mattress | tushuk mattress | матрас-тушук | төшөк (to confirm) |
| Summer pasture | jailoo | джайлоо | жайлоо |
| Fermented mare's milk | kymyz | кумыс | кымыз |
| Horse / riding | horse, horse riding | лошадь, верховая езда | ат, ат минүү |
| Guide | guide | гид | гид |
| Host family | host family | принимающая семья | үй ээси / үй-бүлө |
| Herder | herder | пастух | малчы |
| Caravanserai | caravanserai | караван-сарай | керван-сарай |
| Price per person | price per person | цена на человека | бир адамга баасы |
| Seats left | seats left | осталось мест | орун калды |
| Capacity (admin) | capacity | вместимость | орундардын саны |
| Itinerary | itinerary | программа | программа |
| Overnight | overnight | ночёвка | түнөө |
| Difficulty | difficulty | сложность | татаалдык |
| Airport pickup | airport pickup | встреча в аэропорту | аэропортто тосуп алуу |
| Emergency contact | emergency contact | контакт на случай экстренной ситуации (админка: экстренный контакт) | шашылыш байланыш |
| Confirmed / pending / cancelled | confirmed / pending / cancelled | подтверждено / ожидает подтверждения / отменено | ырасталды / күтүүдө / жокко чыгарылды |

## Place names

| English | Русский | Кыргызча |
| --- | --- | --- |
| Kyrgyzstan | Кыргызстан | Кыргызстан |
| Tian Shan | Тянь-Шань | Теңир-Тоо |
| Bishkek / Manas airport | Бишкек / аэропорт Манас | Бишкек / Манас аэропорту |
| Song-Kul | Сон-Куль | Соң-Көл |
| Issyk-Kul | Иссык-Куль | Ысык-Көл |
| Karakol | Каракол | Каракол |
| Jeti-Oguz | Джеты-Огуз | Жети-Өгүз |
| Tash Rabat | Таш-Рабат | Таш-Рабат |
| Naryn / Kochkor | Нарын / Кочкор | Нарын / Кочкор |
| Talas / Manas Ordo | Талас / Манас Ордо | Талас / Манас Ордо |
| Chon-Kemin | Чон-Кемин | Чоң-Кемин |
| Kel-Suu | Кёль-Суу | Көл-Суу |
| Sary-Chelek | Сары-Челек | Сары-Челек |
| Arslanbob | Арстанбоб | Арстанбап |
| Osh / Alay | Ош / Алай | Ош / Алай |
| Tulpar-Kol | Тулпар-Куль | Тулпар-Көл |
| Batken / Ak-Suu | Баткен / Ак-Суу | Баткен / Ак-Суу |
| Uzgen | Узген | Өзгөн |

## Left in Latin script (brand / codes)

`NomadTrip`, `WhatsApp`, `Telegram`, `FRU`, `OSS`, `USD`, `UTC`, flight-number examples (`TK 345`) and the admin field label `Slug`. The allowlist lives in `src/i18n/quality.test.ts`.

## Conventions

- Dates: `formatDate(iso, lang)` only. Money: `usd()` (`$1,450`). No hand-built date or number strings.
- Place the amount inside the dictionary string with a `{price}` / `{count}` slot when word order differs (ky: `{price} баштап`).
- Russian plural entries need distinct `one` / `few` / `many` (`1 поездка`, `2 поездки`, `5 поездок`, `21 поездка`); `other` is used for fractions only.
