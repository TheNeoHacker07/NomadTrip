/** Photo manifest: freely licensed images from Wikimedia Commons (CC0, public domain, CC BY, CC BY-SA). Do not add a photo without author, license and source. */
import type { TripRegion } from "@/db/schema";
import type { Localized } from "@/i18n/localize";

export type PhotoInfo = {
  src: string;
  width: number;
  height: number;
  author: string;
  license: string;
  /** Empty for public-domain works that have no license page. */
  licenseUrl: string;
  /** The Wikimedia Commons File: page. */
  sourceUrl: string;
  alt: Localized<string>;
};

export type ImageKey = keyof typeof images;

export const images = {
  "alay-valley": {
    src: "/images/alay-valley.jpg",
    width: 1400,
    height: 1050,
    author: "Thermokarst",
    license: "Public domain",
    licenseUrl: "",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Alai_Valley_1.jpg",
    alt: { en: "The Alay valley with snow-capped peaks of the Trans-Alay range", ru: "Алайская долина и заснеженные вершины Заалайского хребта", ky: "Алай өрөөнү жана Заалай кыркасынын мөңгүлүү чокулары" },
  },
  "arslanbob": {
    src: "/images/arslanbob.jpg",
    width: 1400,
    height: 933,
    author: "Ekrem Canli",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Walnut_forest_Arslanbob.jpg",
    alt: { en: "Walnut forest near Arslanbob in southern Kyrgyzstan", ru: "Ореховый лес возле Арстанбоба на юге Кыргызстана", ky: "Кыргызстандын түштүгүндөгү Арстанбап жанындагы жаңгак токою" },
  },
  "batken": {
    src: "/images/batken.jpg",
    width: 1400,
    height: 787,
    author: "Marat Nadjibaev",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%D0%93%D0%B5%D0%BE%D0%BF%D0%B0%D1%80%D0%BA_%D0%9C%D0%B0%D0%B4%D1%8B%D0%B3%D0%B5%D0%BD_(%D0%BA%D1%80%D0%B0%D1%81%D0%BA%D0%B8).jpg",
    alt: { en: "Colourful eroded hills of the Madygen area in Batken region", ru: "Разноцветные размытые холмы Мадыгена в Баткенской области", ky: "Баткен облусундагы Мадыгендин түркүн түстүү эрозияланган дөбөлөрү" },
  },
  "chon-kemin": {
    src: "/images/chon-kemin.jpg",
    width: 1400,
    height: 1050,
    author: "Lupus-sapiens",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chon-Kemin.JPG",
    alt: { en: "The Chon-Kemin river valley in the Tian Shan", ru: "Долина реки Чон-Кемин в Тянь-Шане", ky: "Теңир-Тоодогу Чоң-Кемин дарыясынын өрөөнү" },
  },
  "eagle-hunter": {
    src: "/images/eagle-hunter.jpg",
    width: 1400,
    height: 787,
    author: "Adeenn",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Berkutchi_at_the_world_nomad_games.jpg",
    alt: { en: "Berkutchi with golden eagles during a demonstration at the World Nomad Games", ru: "Беркутчи с беркутами во время показательного выступления на Всемирных играх кочевников", ky: "Дүйнөлүк көчмөндөр оюндарында көрсөтмө учурунда бүркүт кармаган бүркүтчүлөр" },
  },
  "felt-making": {
    src: "/images/felt-making.jpg",
    width: 1400,
    height: 930,
    author: "Fabienkhan",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Wool_Felt_making_KG.jpeg",
    alt: { en: "Rolling wet wool into felt at a felt-making workshop on Issyk-Kul", ru: "Раскатка мокрой шерсти в войлок в мастерской на Иссык-Куле", ky: "Ысык-Көлдөгү устакананын кийиз жасоо процессинде нымдуу жүндү оромо" },
  },
  "food": {
    src: "/images/food.jpg",
    width: 1050,
    height: 1400,
    author: "Firespeaker",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Dastorqon_for_Nooruz.jpg",
    alt: { en: "A traditional Kyrgyz spread of breads, salads and dishes laid out on a dastarkhan", ru: "Традиционный кыргызский стол: хлеб, салаты и блюда на дастархане", ky: "Дасторкондогу нан, салаттар жана тамактар коюлган салттуу кыргыз дастарканы" },
  },
  "horse-riding": {
    src: "/images/horse-riding.jpg",
    width: 1400,
    height: 1050,
    author: "Stoni111121",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Horse_treks.jpg",
    alt: { en: "A saddled horse on a mountain trail above the lake", ru: "Осёдланная лошадь на горной тропе над озером", ky: "Көлдүн үстүндөгү тоо жолунда турган ээрленген ат" },
  },
  "issyk-kul": {
    src: "/images/issyk-kul.jpg",
    width: 1400,
    height: 933,
    author: "Ninara",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Issyk-Kul,_Kyrgyzstan_(42812827150).jpg",
    alt: { en: "Skazka canyon above Issyk-Kul lake with the Tian Shan behind", ru: "Каньон Сказка над озером Иссык-Куль, а за ним Тянь-Шань", ky: "Ысык-Көлдүн үстүндөгү Жомок капчыгайы жана анын артындагы Теңир-Тоо" },
  },
  "jailoo": {
    src: "/images/jailoo.jpg",
    width: 1400,
    height: 1050,
    author: "AseinMad",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kerege-Tash_jailoo_Ak-Suu_District_Issyk-Kul_2026_01.jpg",
    alt: { en: "White yurts on a green jailoo pasture beneath forested hills", ru: "Белые юрты на зелёном джайлоо у подножия лесистых холмов", ky: "Токойлуу дөбөлөрдүн этегиндеги жашыл жайлоодогу ак боз үйлөр" },
  },
  "kel-suu": {
    src: "/images/kel-suu.jpg",
    width: 1400,
    height: 933,
    author: "Калачев Сергей",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:%D0%9A%D0%B5%D0%BB%D1%8C-%D0%A1%D1%83%D1%83_-_panoramio.jpg",
    alt: { en: "Turquoise Kel-Suu lake among steep rock walls", ru: "Бирюзовое озеро Кёль-Суу среди отвесных скал", ky: "Тик аскалардын арасындагы көгүш-жашыл Көл-Суу көлү" },
  },
  "komuz": {
    src: "/images/komuz.jpg",
    width: 937,
    height: 1400,
    author: "Beknazar Zh",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kopuz.jpg",
    alt: { en: "A komuz, the three-stringed Kyrgyz lute", ru: "Комуз, трёхструнный кыргызский музыкальный инструмент", ky: "Комуз, үч кылдуу кыргыз музыкалык аспабы" },
  },
  "manas-ordo": {
    src: "/images/manas-ordo.jpg",
    width: 1400,
    height: 384,
    author: "Ceever",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Manas_Ordo_near_Talas.jpg",
    alt: { en: "The Manas Ordo complex in the Talas valley", ru: "Комплекс Манас Ордо в Таласской долине", ky: "Талас өрөөнүндөгү Манас Ордо комплекси" },
  },
  "night-sky": {
    src: "/images/night-sky.jpg",
    width: 933,
    height: 1400,
    author: "Benjamin Goetzinger",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Milky_way,_Lake_Son_Kol,_Kyrgyzstan.jpg",
    alt: { en: "The Milky Way over the yurts of a camp at Song-Kul lake", ru: "Млечный Путь над юртами лагеря на озере Сон-Куль", ky: "Соң-Көлдөгү лагердин боз үйлөрүнүн үстүндөгү Саманчынын жолу" },
  },
  "sary-chelek": {
    src: "/images/sary-chelek.jpg",
    width: 1400,
    height: 932,
    author: "Kondephy",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Sary_Chelek_Lake.jpg",
    alt: { en: "Sary-Chelek lake surrounded by forested mountains", ru: "Озеро Сары-Челек среди лесистых гор", ky: "Токойлуу тоолор курчаган Сары-Челек көлү" },
  },
  "skazka-canyon": {
    src: "/images/skazka-canyon.jpg",
    width: 1400,
    height: 933,
    author: "Humbie78",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Canyon_de_Skazka.jpg",
    alt: { en: "Wind-carved red and ochre cliffs of Skazka canyon on Issyk-Kul", ru: "Красные и охристые скалы каньона Сказка на Иссык-Куле, выточенные ветром", ky: "Ысык-Көлдөгү Жомок капчыгайынын шамал оюп кеткен кызыл жана саргыч аскалары" },
  },
  "song-kul": {
    src: "/images/song-kul.jpg",
    width: 1400,
    height: 1050,
    author: "AseinMad",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Yurt_camp_near_Song-Kul_lake_2026_01.jpg",
    alt: { en: "Yurt camp on the shore of Song-Kul lake in the Naryn highlands", ru: "Юртовый лагерь на берегу озера Соң-Көл в нарынских высокогорьях", ky: "Нарын тоолорундагы Соң-Көлдүн жээгиндеги боз үй лагери" },
  },
  "tash-rabat": {
    src: "/images/tash-rabat.jpg",
    width: 1400,
    height: 1050,
    author: "Raki_Man",
    license: "CC BY 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by/3.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Caravanserai-_Tash_Rabat_-_panoramio.jpg",
    alt: { en: "The stone caravanserai of Tash Rabat in the Tian Shan", ru: "Каменный караван-сарай Таш-Рабат в Тянь-Шане", ky: "Теңир-Тоодогу таш керван-сарай Таш-Рабат" },
  },
  "trekking": {
    src: "/images/trekking.jpg",
    width: 1400,
    height: 933,
    author: "Bruno Rijsman",
    license: "CC BY-SA 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Teleti_Pass_Trek_(Kyrgyzstan,_August_2019)_-_75_(50569845696).jpg",
    alt: { en: "A green Tian Shan valley with a stream below snow-capped peaks, on the Teleti Pass trek", ru: "Зелёная долина Тянь-Шаня с ручьём под заснеженными вершинами на маршруте через перевал Телети", ky: "Телети ашуусунун багытындагы Теңир-Тоонун мөңгүлүү чокуларынын алдындагы булактуу жашыл өрөөн" },
  },
  "tulpar-kol": {
    src: "/images/tulpar-kol.jpg",
    width: 1400,
    height: 700,
    author: "Kondephy",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Camp_next_to_Tulpar_Kol_Lake.jpg",
    alt: { en: "A yurt camp beside Tulpar-Kol lake near Lenin Peak", ru: "Юртовый лагерь у озера Тулпар-Куль рядом с пиком Ленина", ky: "Ленин чокусунун жанындагы Тулпар-Көл көлүнүн боюндагы боз үй лагери" },
  },
  "yurt-camp": {
    src: "/images/yurt-camp.jpg",
    width: 1400,
    height: 933,
    author: "Kondephy",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Yurt_Camp_in_Song_kol_region.jpg",
    alt: { en: "A yurt camp on a high mountain pasture near Song-Kul", ru: "Юртовый лагерь на высокогорном пастбище возле озера Сон-Куль", ky: "Соң-Көлдүн жанындагы бийик тоо жайлоосундагы боз үй лагери" },
  },
  "yurt-exterior": {
    src: "/images/yurt-exterior.jpg",
    width: 1400,
    height: 933,
    author: "Kalpak Travel",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Kyrgyzstan_yurts_at_Song_Kul_(48221119097).jpg",
    alt: { en: "White yurts standing on the grassy shore at Song-Kul", ru: "Белые юрты на травянистом берегу Сон-Куля", ky: "Соң-Көлдүн жайыт жээгинде турган ак боз үйлөр" },
  },
  "yurt-interior": {
    src: "/images/yurt-interior.jpg",
    width: 1400,
    height: 933,
    author: "Thomas Depenbusch",
    license: "CC BY 2.0",
    licenseUrl: "https://creativecommons.org/licenses/by/2.0",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Song_K%C3%B6l_lake,_Kyrgyzstan_(29441553104).jpg",
    alt: { en: "Inside a Kyrgyz yurt: wooden lattice walls, felt and a view out of the open door", ru: "Внутри кыргызской юрты: деревянные решётчатые стены, войлок и вид из открытой двери", ky: "Кыргыз боз үйүнүн ичи: жыгач керегелер, кийиз жана ачык эшиктен көрүнгөн талаа" },
  },
} as const satisfies Record<string, PhotoInfo>;

const regionCovers: Record<TripRegion, ImageKey> = {
  chui: "chon-kemin",
  issyk_kul: "issyk-kul",
  naryn: "song-kul",
  talas: "manas-ordo",
  jalal_abad: "sary-chelek",
  osh: "alay-valley",
  batken: "batken",
  multi: "jailoo",
};

/** Trips whose seed itinerary centres on one place get that place's photo instead of the region cover. */
const tripCovers: Record<string, ImageKey> = {
  "song-kul-weekend": "song-kul",
  "issyk-kul-circle": "skazka-canyon",
  "tian-shan-horse-trek": "horse-riding",
  "chon-kemin-valley": "chon-kemin",
  "sary-chelek-arslanbob": "sary-chelek",
  "talas-manas-ordo": "manas-ordo",
  "kel-suu-lake": "kel-suu",
  "osh-alay-tulpar-kol": "tulpar-kol",
};

export function regionCover(region: TripRegion): ImageKey {
  return regionCovers[region];
}

/** Slug-specific photo when one exists, otherwise the region cover (so admin-created trips always get an image). */
export function tripCover(slug: string, region: TripRegion): ImageKey {
  return tripCovers[slug] ?? regionCovers[region];
}
