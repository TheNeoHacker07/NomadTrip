import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "../src/db";
import { departures, trips, type ItineraryDay, type TripRegion } from "../src/db/schema";
import { locales, type Locale } from "../src/i18n/config";
import type { Localized } from "../src/i18n/localize";
import { addDays } from "../src/lib/pricing";

/** Builds a Localized value from its three translations. */
const l = <T>(en: T, ru: T, ky: T): Localized<T> => ({ en, ru, ky });

type Segment = { days: number; title: Localized<string>; description: Localized<string>; overnight: Localized<string> };

/** Expands multi-day segments into a day-by-day itinerary per locale. */
function itinerary(segments: Segment[]): Localized<ItineraryDay[]> {
  const build = (lang: Locale): ItineraryDay[] => {
    const out: ItineraryDay[] = [];
    for (const s of segments) {
      for (let i = 0; i < s.days; i++) {
        out.push({
          day: out.length + 1,
          title: s.days > 1 ? `${s.title[lang]} (${i + 1}/${s.days})` : s.title[lang],
          description: s.description[lang],
          overnight: s.overnight[lang],
        });
      }
    }
    return out;
  };
  return Object.fromEntries(locales.map((lang) => [lang, build(lang)])) as Localized<ItineraryDay[]>;
}

const dash = l("—", "—", "—");

const catalog: {
  slug: string;
  title: Localized<string>;
  region: TripRegion;
  summary: Localized<string>;
  description: Localized<string>;
  pricePerPersonUsd: number;
  difficulty: "easy" | "moderate" | "challenging";
  highlights: Localized<string[]>;
  itinerary: Localized<ItineraryDay[]>;
  capacity: number;
}[] = [
  {
    slug: "song-kul-weekend",
    title: l("Song-Kul Lake Escape", "Побег на озеро Сон-Куль", "Соң-Көл көлүнө саякат"),
    region: "naryn",
    summary: l(
      "Two days at a high-alpine lake, sleeping in a herder family's yurt camp.",
      "Два дня на высокогорном озере с ночёвкой в юртовом лагере семьи скотоводов.",
      "Бийик тоодогу көлдө эки күн, малчы үй-бүлөнүн боз үй лагеринде түнөө.",
    ),
    description: l(
      "Drive up through the Kalmak-Ashuu pass to Song-Kul at 3,016 m, where shepherd families graze their herds all summer. Ride horses along the shore, share kymyz and fresh boorsok, and watch the Milky Way from your yurt door.",
      "Поднимитесь через перевал Калмак-Ашуу к озеру Сон-Куль на высоте 3016 м, где всё лето пасут скот семьи пастухов. Покатайтесь верхом вдоль берега, попробуйте кумыс и свежие боорсоки и полюбуйтесь Млечным Путём прямо от порога юрты.",
      "Калмак-Ашуу ашуусу аркылуу деңиз деңгээлинен 3016 м бийиктиктеги Соң-Көлгө чыгыңыз: жайкысын бул жерде малчы үй-бүлөлөр мал багышат. Көлдүн жээги менен ат минип, кымыз ичип, жаңы бышкан боорсок жеп, боз үйүңүздүн босогосунан Саманчынын жолун тамашалаңыз.",
    ),
    pricePerPersonUsd: 180,
    difficulty: "easy",
    highlights: l(
      ["Lake at 3,016 m", "Horse ride with herders", "Yurt camp dinner", "Night sky"],
      ["Озеро на высоте 3016 м", "Верховая прогулка с пастухами", "Ужин в юртовом лагере", "Звёздное небо"],
      ["3016 м бийиктиктеги көл", "Малчылар менен ат минүү", "Боз үй лагериндеги кечки тамак", "Түнкү асман"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Song-Kul", "Бишкек → Сон-Куль", "Бишкек → Соң-Көл"),
        description: l(
          "Scenic drive via Kochkor and the Kalmak-Ashuu pass. Afternoon ride along the shore.",
          "Живописная дорога через Кочкор и перевал Калмак-Ашуу. После обеда — верховая прогулка вдоль берега.",
          "Кочкор жана Калмак-Ашуу ашуусу аркылуу кооз жол. Түштөн кийин көлдүн жээги менен ат минүү.",
        ),
        overnight: l("Song-Kul yurt camp", "Юртовый лагерь на Сон-Куле", "Соң-Көлдөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Song-Kul → Bishkek", "Сон-Куль → Бишкек", "Соң-Көл → Бишкек"),
        description: l(
          "Sunrise over the lake, felt-making demo, return drive.",
          "Рассвет над озером, мастер-класс по валянию войлока, дорога обратно.",
          "Көлдүн үстүндөгү таң атуу, кийиз басуу көрсөтмөсү, кайтуу жолу.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 12,
  },
  {
    slug: "issyk-kul-circle",
    title: l("Issyk-Kul Circle", "Вокруг Иссык-Куля", "Ысык-Көлдү айланып"),
    region: "issyk_kul",
    summary: l(
      "A week around the 'warm lake' — red canyons, eagle hunters and alpine valleys.",
      "Неделя вокруг «тёплого озера»: красные каньоны, охотники с беркутами и альпийские долины.",
      "«Ысык» көлдү айланып бир жума: кызыл капчыгайлар, бүркүтчүлөр жана тоо өрөөндөрү.",
    ),
    description: l(
      "Loop around Issyk-Kul, the world's second-largest alpine lake. Walk Skazka's red fairy-tale canyon, meet a berkutchi eagle hunter in Bokonbaevo, hike the Jeti-Oguz valley and sleep in yurt camps along the south shore.",
      "Объедьте Иссык-Куль — второе по величине высокогорное озеро мира. Пройдитесь по красному сказочному каньону Сказка, познакомьтесь с беркутчи в Боконбаево, отправьтесь в поход по ущелью Джети-Огуз и ночуйте в юртовых лагерях на южном берегу.",
      "Дүйнөдөгү экинчи чоң тоолуу көл — Ысык-Көлдү айланыңыз. Жомок капчыгайынын кызыл жомоктогудай жолдору менен жүрүп, Боконбаевде бүркүтчү менен таанышып, Жети-Өгүз өрөөнүндө жөө жүрүп, түштүк жээктеги боз үй лагерлеринде түнөңүз.",
    ),
    pricePerPersonUsd: 690,
    difficulty: "moderate",
    highlights: l(
      ["Skazka canyon", "Eagle hunting demo", "Jeti-Oguz valley hike", "Karakol Dungan dinner"],
      ["Каньон Сказка", "Показ охоты с беркутом", "Поход по ущелью Джети-Огуз", "Дунганский ужин в Караколе"],
      ["Жомок капчыгайы", "Бүркүт салуу көрсөтмөсү", "Жети-Өгүз өрөөнүндө жөө жүрүш", "Караколдогу дунган кечки тамагы"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Bokonbaevo", "Бишкек → Боконбаево", "Бишкек → Боконбаево"),
        description: l(
          "Burana tower on the way; eagle hunter demonstration at sunset.",
          "По пути — башня Бурана; показ охоты с беркутом на закате.",
          "Жолдо Бурана мунарасы; күн батарда бүркүт салуу көрсөтмөсү.",
        ),
        overnight: l("Bokonbaevo yurt camp", "Юртовый лагерь в Боконбаево", "Боконбаевдеги боз үй лагери"),
      },
      {
        days: 1,
        title: l("Skazka & Barskoon", "Сказка и Барскоон", "Жомок жана Барскоон"),
        description: l(
          "Walk the red canyon, waterfall hike in Barskoon gorge.",
          "Прогулка по красному каньону, поход к водопаду в Барскоонском ущелье.",
          "Кызыл капчыгай боюнча сейилдөө, Барскоон капчыгайындагы шаркыратмага жөө жүрүш.",
        ),
        overnight: l("Tamga yurt camp", "Юртовый лагерь в Тамге", "Тамгадагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Jeti-Oguz valley", "Ущелье Джети-Огуз", "Жети-Өгүз өрөөнү"),
        description: l(
          "Day hikes in the valley of the Seven Bulls; picnic lunches with local families.",
          "Однодневные походы по долине Семи Быков; пикники с местными семьями.",
          "Жети өгүз өрөөнүндө күндүзгү жөө жүрүштөр; жергиликтүү үй-бүлөлөр менен түштөнүү.",
        ),
        overnight: l("Jeti-Oguz yurt camp", "Юртовый лагерь в Джети-Огузе", "Жети-Өгүздөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Karakol", "Каракол", "Каракол"),
        description: l(
          "Dungan mosque, wooden cathedral and an Ashlyan-fu tasting.",
          "Дунганская мечеть, деревянный собор и дегустация ашлян-фу.",
          "Дунган мечити, жыгач собор жана ашлян-фунун даамын көрүү.",
        ),
        overnight: l("Karakol guesthouse yurt", "Юрта при гостевом доме в Караколе", "Каракол конок үйүнүн боз үйү"),
      },
      {
        days: 1,
        title: l("North shore", "Северный берег", "Түндүк жээк"),
        description: l(
          "Cholpon-Ata petroglyphs and a swim in the lake.",
          "Петроглифы Чолпон-Аты и купание в озере.",
          "Чолпон-Атадагы петроглифтер жана көлдө сүзүү.",
        ),
        overnight: l("Cholpon-Ata yurt camp", "Юртовый лагерь в Чолпон-Ате", "Чолпон-Атадагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Return to Bishkek", "Возвращение в Бишкек", "Бишкекке кайтуу"),
        description: l(
          "Drive back through Boom gorge.",
          "Обратная дорога через Боомское ущелье.",
          "Боом капчыгайы аркылуу кайтуу жолу.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 12,
  },
  {
    slug: "tian-shan-horse-trek",
    title: l("Tian Shan Horse Trek", "Конный трек по Тянь-Шаню", "Тянь-Шань боюнча ат менен жүрүш"),
    region: "multi",
    summary: l(
      "Two weeks in the saddle across high passes, from Kochkor to Song-Kul and beyond.",
      "Две недели в седле через высокие перевалы — от Кочкора до Сон-Куля и дальше.",
      "Эки жума ат үстүндө бийик ашуулар аркылуу — Кочкордон Соң-Көлгө жана андан ары.",
    ),
    description: l(
      "A classic multi-day horse trek with local wranglers. Cross passes above 3,500 m, camp beside glacial rivers and live the jailoo summer-pasture life. Suitable for riders with some experience and good fitness.",
      "Классический многодневный конный поход с местными проводниками. Вы преодолеете перевалы выше 3500 м, остановитесь лагерем у ледниковых рек и почувствуете жизнь на джайлоо — летних пастбищах. Подходит для всадников с некоторым опытом и хорошей физической формой.",
      "Жергиликтүү жол башчылар менен классикалык көп күндүк ат менен жүрүш. 3500 м ашкан ашууларды ашып, мөңгүдөн агып түшкөн дарыялардын боюнда түнөп, жайлоодогу турмушту башыңыздан өткөрөсүз. Ат минүүдө бир аз тажрыйбасы бар жана дени сак, чыдамкай саякатчыларга ылайыктуу.",
    ),
    pricePerPersonUsd: 1590,
    difficulty: "challenging",
    highlights: l(
      ["10 days of riding", "Passes above 3,500 m", "Jailoo life", "Tash Rabat caravanserai"],
      ["10 дней верховой езды", "Перевалы выше 3500 м", "Жизнь на джайлоо", "Караван-сарай Таш-Рабат"],
      ["10 күн ат минүү", "3500 м ашкан ашуулар", "Жайлоодогу турмуш", "Таш-Рабат керван-сарайы"],
    ),
    itinerary: itinerary([
      {
        days: 2,
        title: l("Bishkek & Kochkor", "Бишкек и Кочкор", "Бишкек жана Кочкор"),
        description: l(
          "Meet the team, gear check, felt workshop in Kochkor.",
          "Знакомство с командой, проверка снаряжения, мастерская по валянию войлока в Кочкоре.",
          "Команда менен таанышуу, жабдууларды текшерүү, Кочкордогу кийиз басуу устаканасы.",
        ),
        overnight: l("Kochkor guesthouse yurt", "Юрта при гостевом доме в Кочкоре", "Кочкор конок үйүнүн боз үйү"),
      },
      {
        days: 4,
        title: l("Ride to Song-Kul", "Верхом к Сон-Кулю", "Соң-Көлгө ат менен"),
        description: l(
          "Ride over Jalgyz-Karagai pass to the lake.",
          "Подъём верхом через перевал Жалгыз-Карагай к озеру.",
          "Жалгыз-Карагай ашуусу аркылуу көлгө чейин ат минүү.",
        ),
        overnight: l("Herders' yurt camp", "Юртовый лагерь пастухов", "Малчылардын боз үй лагери"),
      },
      {
        days: 4,
        title: l("Song-Kul to At-Bashy", "От Сон-Куля до Ат-Баши", "Соң-Көлдөн Ат-Башыга"),
        description: l(
          "Remote valleys and river crossings with wranglers.",
          "Отдалённые долины и переправы через реки вместе с проводниками.",
          "Жол башчылар менен алыскы өрөөндөр жана дарыялардан кечүү.",
        ),
        overnight: l("Mobile yurt camp", "Передвижной юртовый лагерь", "Көчмө боз үй лагери"),
      },
      {
        days: 2,
        title: l("Tash Rabat", "Таш-Рабат", "Таш-Рабат"),
        description: l(
          "15th-century Silk Road caravanserai; rest day.",
          "Караван-сарай XV века на Шёлковом пути; день отдыха.",
          "Жибек жолундагы XV кылымдагы керван-сарай; эс алуу күнү.",
        ),
        overnight: l("Tash Rabat yurt camp", "Юртовый лагерь у Таш-Рабата", "Таш-Рабаттагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Return via Naryn", "Возвращение через Нарын", "Нарын аркылуу кайтуу"),
        description: l(
          "Drive back to Bishkek, farewell dinner.",
          "Дорога обратно в Бишкек, прощальный ужин.",
          "Бишкекке кайтуу жолу, коштошуу кечки тамагы.",
        ),
        overnight: l("Bishkek hotel / —", "Отель в Бишкеке / —", "Бишкектеги мейманкана / —"),
      },
    ]),
    capacity: 8,
  },
  {
    slug: "great-nomad-journey",
    title: l("The Great Nomad Journey", "Великое кочевое путешествие", "Улуу көчмөн саякат"),
    region: "multi",
    summary: l(
      "A full month across every region — lakes, deserts, the Pamir-Alay and the south.",
      "Целый месяц по всем регионам: озёра, пустыни, Памиро-Алай и юг страны.",
      "Бир ай бою бардык аймактар аркылуу: көлдөр, чөлдөр, Памир-Алай жана түштүк.",
    ),
    description: l(
      "Our longest journey: 30 days crossing the whole country from Bishkek to Osh. Mix trekking, riding and slow days with nomad families; sleep in a different yurt camp almost every week and see Kyrgyzstan as few travelers do.",
      "Наше самое длинное путешествие: 30 дней через всю страну от Бишкека до Оша. Сочетайте трекинг, верховую езду и неспешные дни в кочевых семьях; почти каждую неделю — новый юртовый лагерь, и вы увидите Кыргызстан так, как его видят немногие.",
      "Эң узак саякатыбыз: Бишкектен Ошко чейин бүт өлкөнү кесип өткөн 30 күн. Трекингди, ат минүүнү жана көчмөн үй-бүлөлөр менен шашылбаган күндөрдү айкалыштырыңыз; дээрлик жума сайын башка боз үй лагеринде түнөп, Кыргызстанды аз саякатчылар көргөндөй көрөсүз.",
    ),
    pricePerPersonUsd: 3400,
    difficulty: "moderate",
    highlights: l(
      ["Song-Kul, Issyk-Kul & Sary-Chelek", "Lenin Peak base camp", "Osh bazaar", "Arslanbob walnut forest"],
      ["Сон-Куль, Иссык-Куль и Сары-Челек", "Базовый лагерь пика Ленина", "Ошский базар", "Ореховый лес Арсланбоб"],
      ["Соң-Көл, Ысык-Көл жана Сары-Челек", "Ленин чокусунун базалык лагери", "Ош базары", "Арстанбап жаңгак токою"],
    ),
    itinerary: itinerary([
      {
        days: 3,
        title: l("Bishkek & Ala-Archa", "Бишкек и Ала-Арча", "Бишкек жана Ала-Арча"),
        description: l(
          "Arrival, city walk, acclimatisation hikes in Ala-Archa.",
          "Прибытие, прогулка по городу, акклиматизационные походы в Ала-Арче.",
          "Келүү, шаарды кыдыруу, Ала-Арчада көнүгүү жөө жүрүштөрү.",
        ),
        overnight: l("Ala-Archa yurt camp", "Юртовый лагерь в Ала-Арче", "Ала-Арчадагы боз үй лагери"),
      },
      {
        days: 7,
        title: l("Issyk-Kul circle", "Вокруг Иссык-Куля", "Ысык-Көлдү айланып"),
        description: l(
          "Canyons, eagle hunters, Jeti-Oguz and Karakol.",
          "Каньоны, охотники с беркутами, Джети-Огуз и Каракол.",
          "Капчыгайлар, бүркүтчүлөр, Жети-Өгүз жана Каракол.",
        ),
        overnight: l("South-shore yurt camps", "Юртовые лагеря на южном берегу", "Түштүк жээктеги боз үй лагерлери"),
      },
      {
        days: 5,
        title: l("Naryn & Song-Kul", "Нарын и Сон-Куль", "Нарын жана Соң-Көл"),
        description: l(
          "Riding with herders and the Tash Rabat caravanserai.",
          "Верховые прогулки с пастухами и караван-сарай Таш-Рабат.",
          "Малчылар менен ат минүү жана Таш-Рабат керван-сарайы.",
        ),
        overnight: l("Song-Kul yurt camp", "Юртовый лагерь на Сон-Куле", "Соң-Көлдөгү боз үй лагери"),
      },
      {
        days: 5,
        title: l("Sary-Chelek & Arslanbob", "Сары-Челек и Арсланбоб", "Сары-Челек жана Арстанбап"),
        description: l(
          "Biosphere reserve lakes and the world's largest walnut forest.",
          "Озёра биосферного заповедника и крупнейший в мире ореховый лес.",
          "Биосфералык коруктун көлдөрү жана дүйнөдөгү эң чоң жаңгак токою.",
        ),
        overnight: l("Village homestay yurts", "Юрты в деревенских семьях", "Айылдык үй-бүлөлөрдөгү боз үйлөр"),
      },
      {
        days: 6,
        title: l("Alay valley & Lenin Peak", "Алайская долина и пик Ленина", "Алай өрөөнү жана Ленин чокусу"),
        description: l(
          "Tulpar-Kul lake beneath the 7,134 m Lenin Peak.",
          "Озеро Тулпар-Куль у подножия пика Ленина (7134 м).",
          "Ленин чокусунун (7134 м) этегиндеги Тулпар-Көл.",
        ),
        overnight: l("Tulpar-Kul yurt camp", "Юртовый лагерь у Тулпар-Куля", "Тулпар-Көлдөгү боз үй лагери"),
      },
      {
        days: 4,
        title: l("Osh & departure", "Ош и отъезд", "Ош жана кетүү"),
        description: l(
          "Sulaiman-Too, the great bazaar, farewell feast.",
          "Сулайман-Тоо, большой базар, прощальный пир.",
          "Сулайман-Тоо, чоң базар, коштошуу дасторкону.",
        ),
        overnight: l("Osh hotel / —", "Отель в Оше / —", "Ошто мейманкана / —"),
      },
    ]),
    capacity: 8,
  },
];

const path = process.env.DATABASE_PATH ?? "data/nomadtrip.db";
const db = createDb(path);
migrate(db, { migrationsFolder: "drizzle" });

if (db.select({ id: trips.id }).from(trips).limit(1).get()) {
  console.log(`Database at ${path} already has trips — skipping seed.`);
} else {
  const start = new Date().toISOString().slice(0, 10);
  db.transaction((tx) => {
    for (const { capacity, ...trip } of catalog) {
      const { id } = tx.insert(trips).values({ ...trip, durationDays: trip.itinerary.en.length }).returning().get();
      const starts = [14, 28, 42, 56, 84, 112].map((d) => addDays(start, d));
      tx.insert(departures).values(starts.map((startDate) => ({ tripId: id, startDate, capacity }))).run();
    }
  });
  console.log(`Seeded ${catalog.length} trips into ${path}.`);
}
