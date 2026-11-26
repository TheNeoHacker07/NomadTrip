import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "../src/db";
import { departures, trips, type ItineraryDay, type TripRegion } from "../src/db/schema";
import { locales, type Locale } from "../src/i18n/config";
import type { Localized } from "../src/i18n/localize";
import { seasonDepartures } from "../src/lib/season";

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
    title: l("Song-Kul Lake Escape", "Уикенд на озере Сон-Куль", "Соң-Көлгө саякат"),
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
    title: l("Issyk-Kul Circle", "Вокруг Иссык-Куля", "Ысык-Көлдү айланган саякат"),
    region: "issyk_kul",
    summary: l(
      "A week around the 'warm lake' — red canyons, eagle hunters and alpine valleys.",
      "Неделя вокруг «тёплого озера»: красные каньоны, охотники с беркутами и альпийские долины.",
      "«Ысык көлдү» айланган бир жума: кызыл капчыгайлар, бүркүтчүлөр жана тоо өрөөндөрү.",
    ),
    description: l(
      "Loop around Issyk-Kul, the world's second-largest alpine lake. Walk Skazka's red fairy-tale canyon, meet a berkutchi eagle hunter in Bokonbaevo, hike the Jeti-Oguz valley and sleep in yurt camps along the south shore.",
      "Объедьте Иссык-Куль — второе по величине высокогорное озеро мира. Пройдитесь по красному сказочному каньону Сказка, познакомьтесь с беркутчи в Боконбаево, отправьтесь в поход по ущелью Джеты-Огуз и ночуйте в юртовых лагерях на южном берегу.",
      "Дүйнөдөгү экинчи чоң тоолуу көл — Ысык-Көлдү айланыңыз. Жомок капчыгайынын кызыл жомоктогудай жолдору менен жүрүп, Боконбаевде бүркүтчү менен таанышып, Жети-Өгүз өрөөнүндө жөө жүрүп, түштүк жээктеги боз үй лагерлеринде түнөңүз.",
    ),
    pricePerPersonUsd: 690,
    difficulty: "moderate",
    highlights: l(
      ["Skazka canyon", "Eagle hunting demo", "Jeti-Oguz valley hike", "Karakol Dungan dinner"],
      ["Каньон Сказка", "Показ охоты с беркутом", "Поход по ущелью Джеты-Огуз", "Дунганский ужин в Караколе"],
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
        title: l("Jeti-Oguz valley", "Ущелье Джеты-Огуз", "Жети-Өгүз өрөөнү"),
        description: l(
          "Day hikes in the valley of the Seven Bulls; picnic lunches with local families.",
          "Однодневные походы по долине Семи Быков; пикники с местными семьями.",
          "Жети-Өгүз өрөөнүндө күндүзгү жөө жүрүштөр; жергиликтүү үй-бүлөлөр менен түштөнүү.",
        ),
        overnight: l("Jeti-Oguz yurt camp", "Юртовый лагерь в Джеты-Огузе", "Жети-Өгүздөгү боз үй лагери"),
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
    title: l("Tian Shan Horse Trek", "Конный поход по Тянь-Шаню", "Теңир-Тоо боюнча ат менен жүрүш"),
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
          "Верхом через перевал Жалгыз-Карагай к озеру.",
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
      ["Сон-Куль, Иссык-Куль и Сары-Челек", "Базовый лагерь пика Ленина", "Ошский базар", "Ореховый лес Арстанбоб"],
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
        title: l("Issyk-Kul circle", "Вокруг Иссык-Куля", "Ысык-Көлдү айлануу"),
        description: l(
          "Canyons, eagle hunters, Jeti-Oguz and Karakol.",
          "Каньоны, охотники с беркутами, Джеты-Огуз и Каракол.",
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
        title: l("Sary-Chelek & Arslanbob", "Сары-Челек и Арстанбоб", "Сары-Челек жана Арстанбап"),
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
  {
    slug: "chon-kemin-valley",
    title: l("Chon-Kemin Valley Retreat", "Долина Чон-Кемин", "Чоң-Кемин өрөөнү"),
    region: "chui",
    summary: l(
      "Three easy days of forest, rivers and horse rides, an hour or two from Bishkek.",
      "Три лёгких дня среди лесов, рек и верховых прогулок — в одном-двух часах езды от Бишкека.",
      "Бишкектен бир-эки сааттык жолдо токойлордун, дарыялардын жана ат минүүлөрдүн арасында үч жеңил күн.",
    ),
    description: l(
      "A gentle introduction to yurt life in the Chon-Kemin valley, a green river valley in the northern Tian Shan. Ride along the Chon-Kemin river, walk through spruce forest in the national park, and spend two nights in a family-run yurt camp. The trip is short and easy, and it suits families and first-time visitors.",
      "Мягкое знакомство с жизнью в юрте в долине Чон-Кемин — зелёной речной долине северного Тянь-Шаня. Верховые прогулки вдоль реки Чон-Кемин, пешие маршруты по еловым лесам национального парка и две ночи в юртовом лагере, который держит семья. Поездка короткая и несложная, подходит семьям и тем, кто в Кыргызстане впервые.",
      "Түндүк Теңир-Тоодогу жашыл дарыя өрөөнү — Чоң-Кемин өрөөнүндө боз үй жашоосу менен жумшак таанышуу. Чоң-Кемин дарыясынын боюнда ат минип, улуттук парктын карагай токойлору аркылуу жөө жүрүп, үй-бүлө жүргүзгөн боз үй лагеринде эки түн өткөрөсүз. Саякат кыска жана жеңил, үй-бүлөлөргө жана биринчи жолу келгендерге ылайыктуу.",
    ),
    pricePerPersonUsd: 290,
    difficulty: "easy",
    highlights: l(
      ["Chon-Kemin national park", "Horse ride along the river", "Family-run yurt camp", "Burana Tower stop"],
      ["Национальный парк Чон-Кемин", "Верховая прогулка вдоль реки", "Юртовый лагерь семьи", "Остановка у башни Бурана"],
      ["Чоң-Кемин улуттук паркы", "Дарыянын боюнда ат минүү", "Үй-бүлөлүк боз үй лагери", "Бурана мунарасына токтоо"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Chon-Kemin", "Бишкек → Чон-Кемин", "Бишкек → Чоң-Кемин"),
        description: l(
          "Drive east past the Burana Tower, then up into the valley. Settle into camp and walk by the river before dinner.",
          "Дорога на восток с остановкой у башни Бурана, затем подъём в долину. Размещение в лагере и прогулка вдоль реки перед ужином.",
          "Чыгышты көздөй Бурана мунарасынан өтүп, өрөөнгө көтөрүлөбүз. Лагерге жайгашып, кечки тамактан мурун дарыянын боюнда сейилдейбиз.",
        ),
        overnight: l("Chon-Kemin yurt camp", "Юртовый лагерь в Чон-Кемине", "Чоң-Кеминдеги боз үй лагери"),
      },
      {
        days: 1,
        title: l("Forest and river day", "День в лесу и у реки", "Токой жана дарыя күнү"),
        description: l(
          "Guided walk in the national park's spruce forest, then a horse ride with a local herder. Traditional dinner and songs in the camp.",
          "Прогулка с гидом по еловому лесу национального парка, затем верховая поездка с местным пастухом. Традиционный ужин и песни в лагере.",
          "Улуттук парктын карагай токоюнда гид менен сейил, андан соң жергиликтүү малчы менен ат минүү. Лагерде салттуу кечки тамак жана ырлар.",
        ),
        overnight: l("Chon-Kemin yurt camp", "Юртовый лагерь в Чон-Кемине", "Чоң-Кеминдеги боз үй лагери"),
      },
      {
        days: 1,
        title: l("Back to Bishkek", "Возвращение в Бишкек", "Бишкекке кайтуу"),
        description: l(
          "Breakfast with the host family, a short felt-making lesson and the drive back to Bishkek.",
          "Завтрак с принимающей семьёй, короткий мастер-класс по валянию войлока и дорога обратно в Бишкек.",
          "Үй ээси менен эртең мененки тамак, кийиз басуунун кыскача сабагы жана Бишкекке кайтуу.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 12,
  },
  {
    slug: "sary-chelek-arslanbob",
    title: l("Sary-Chelek & Arslanbob", "Сары-Челек и Арстанбоб", "Сары-Челек жана Арстанбап"),
    region: "jalal_abad",
    summary: l(
      "Walnut forests, waterfalls and a mountain lake in a biosphere reserve in southern Kyrgyzstan.",
      "Ореховые леса, водопады и горное озеро в биосферном заповеднике юга Кыргызстана.",
      "Түштүк Кыргызстандагы биосфералык коруктун жаңгак токойлору, шаркыратмалары жана тоо көлү.",
    ),
    description: l(
      "Six days in the green mountains of Jalal-Abad region. Start in Arslanbob, home to one of the largest natural walnut forests in the world, and walk to its waterfalls. Then travel to the Sary-Chelek biosphere reserve for its clear mountain lakes. Nights are spent in village yurt camps and with host families.",
      "Шесть дней в зелёных горах Джалал-Абадской области. Начните с Арстанбоба — здесь один из крупнейших в мире естественных ореховых лесов — и дойдите до его водопадов. Затем отправляйтесь в Сары-Челекский биосферный заповедник с его прозрачными горными озёрами. Ночёвки — в деревенских юртовых лагерях и у принимающих семей.",
      "Жалал-Абад облусунун жашыл тоолорунда алты күн. Дүйнөдөгү эң чоң табигый жаңгак токойлордун бири жайгашкан Арстанбаптан баштап, анын шаркыратмаларына чейин жөө барабыз. Андан кийин тунук тоо көлдөрү бар Сары-Челек биосфералык коругуна жөнөйбүз. Түнөө — айылдагы боз үй лагерлеринде жана үй ээлеринин үйүндө.",
    ),
    pricePerPersonUsd: 890,
    difficulty: "moderate",
    highlights: l(
      ["Arslanbob walnut forest", "Waterfall hike", "Sary-Chelek biosphere reserve", "Village host families"],
      ["Ореховый лес Арстанбоба", "Поход к водопадам", "Сары-Челекский заповедник", "Деревенские принимающие семьи"],
      ["Арстанбаптын жаңгак токою", "Шаркыратмаларга жөө жүрүш", "Сары-Челек биосфералык коругу", "Айылдык үй ээлери"],
    ),
    itinerary: itinerary([
      {
        days: 2,
        title: l("Arslanbob", "Арстанбоб", "Арстанбап"),
        description: l(
          "Meet in Osh or Jalal-Abad and transfer to Arslanbob. Walk through the walnut forest to the waterfalls and visit village families.",
          "Встреча в Оше или Джалал-Абаде и трансфер в Арстанбоб. Прогулка через ореховый лес к водопадам и визит к семьям в деревне.",
          "Ошто же Жалал-Абадда жолугуп, Арстанбапка жөнөйбүз. Жаңгак токою аркылуу шаркыратмаларга чейин жөө баруу жана айылдагы үй-бүлөлөргө конокко баруу.",
        ),
        overnight: l("Arslanbob host-family yurts", "Юрты в семьях Арстанбоба", "Арстанбаптагы үй ээлеринин боз үйлөрү"),
      },
      {
        days: 1,
        title: l("Transfer to Sary-Chelek", "Переезд в Сары-Челек", "Сары-Челекке көчүү"),
        description: l(
          "A long scenic drive through mountain valleys to the edge of the Sary-Chelek reserve.",
          "Долгая живописная дорога через горные долины к границе Сары-Челекского заповедника.",
          "Тоо өрөөндөрү аркылуу Сары-Челек коругунун четине чейин узак кооз жол.",
        ),
        overnight: l("Sary-Chelek yurt camp", "Юртовый лагерь у Сары-Челека", "Сары-Челектеги боз үй лагери"),
      },
      {
        days: 2,
        title: l("Sary-Chelek lakes", "Озёра Сары-Челека", "Сары-Челек көлдөрү"),
        description: l(
          "Walks to the main lake and the smaller lakes in the reserve, with time for swimming where conditions allow and picnic lunches.",
          "Прогулки к главному озеру и малым озёрам заповедника, пикники и купание там, где позволяют условия.",
          "Коруктагы башкы көлгө жана кичи көлдөргө сейил, пикник жана шарт болсо сууга түшүү.",
        ),
        overnight: l("Sary-Chelek yurt camp", "Юртовый лагерь у Сары-Челека", "Сары-Челектеги боз үй лагери"),
      },
      {
        days: 1,
        title: l("Return transfer", "Обратный переезд", "Кайтуу жолу"),
        description: l(
          "Drive back to Jalal-Abad or Osh, where the trip ends.",
          "Дорога обратно в Джалал-Абад или Ош, где заканчивается поездка.",
          "Жалал-Абадга же Ошко кайтуу, саякат ошол жерде аяктайт.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 10,
  },
  {
    slug: "talas-manas-ordo",
    title: l("Talas & Manas Ordo", "Талас и Манас Ордо", "Талас жана Манас Ордо"),
    region: "talas",
    summary: l(
      "Four days in the Talas valley, homeland of the Manas epic, with a night in the Besh-Tash mountains.",
      "Четыре дня в Таласской долине — на родине эпоса «Манас», с ночёвкой в горах Беш-Таш.",
      "«Манас» эпосунун мекени — Талас өрөөнүндө төрт күн, Беш-Таштын тоолорунда түнөө менен.",
    ),
    description: l(
      "Cross the Ala-Bel pass into the Talas valley, one of the quieter corners of Kyrgyzstan. Visit the Manas Ordo complex and the Manas mausoleum, hear the epic's story from a local storyteller, and spend nights in yurts in the foothills and in the Besh-Tash national park.",
      "Проедьте через перевал Ала-Бел в Таласскую долину — один из самых тихих уголков Кыргызстана. Посетите комплекс Манас Ордо и мавзолей Манаса, послушайте сказание из эпоса от местного рассказчика и переночуйте в юртах в предгорьях и в национальном парке Беш-Таш.",
      "Ала-Бел ашуусу аркылуу Кыргызстандын эң тынч бурчтарынын бири — Талас өрөөнүнө өтөбүз. Манас Ордо комплексин жана Манастын күмбөзүн көрүп, жергиликтүү манасчыдан эпостон үзүндү угуп, тоо этектеринде жана Беш-Таш улуттук паркында боз үйлөрдө түнөйбүз.",
    ),
    pricePerPersonUsd: 420,
    difficulty: "easy",
    highlights: l(
      ["Ala-Bel pass", "Manas Ordo complex", "Epic storyteller evening", "Besh-Tash national park"],
      ["Перевал Ала-Бел", "Комплекс Манас Ордо", "Вечер с сказителем эпоса", "Национальный парк Беш-Таш"],
      ["Ала-Бел ашуусу", "Манас Ордо комплекси", "Манасчы менен кеч", "Беш-Таш улуттук паркы"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Talas", "Бишкек → Талас", "Бишкек → Талас"),
        description: l(
          "Drive over the Ala-Bel pass into the Talas valley and settle into a yurt camp at the foot of the mountains.",
          "Дорога через перевал Ала-Бел в Таласскую долину, размещение в юртовом лагере у подножия гор.",
          "Ала-Бел ашуусу аркылуу Талас өрөөнүнө өтүп, тоо этегиндеги боз үй лагерине жайгашабыз.",
        ),
        overnight: l("Talas yurt camp", "Юртовый лагерь в Таласе", "Таластагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Manas Ordo", "Манас Ордо", "Манас Ордо"),
        description: l(
          "Visit the Manas Ordo complex and the Manas mausoleum, then an evening with a manaschi, a performer of the epic.",
          "Посещение комплекса Манас Ордо и мавзолея Манаса, вечером — встреча с манасчи, исполнителем эпоса.",
          "Манас Ордо комплексине жана Манастын күмбөзүнө баруу, кечинде эпостун аткаруучусу — манасчы менен жолугушуу.",
        ),
        overnight: l("Talas yurt camp", "Юртовый лагерь в Таласе", "Таластагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Besh-Tash", "Беш-Таш", "Беш-Таш"),
        description: l(
          "Drive into Besh-Tash national park for a day of walks and horse riding among juniper and walnut slopes.",
          "Поездка в национальный парк Беш-Таш: прогулки и верховая езда по склонам с арчой и орехом.",
          "Беш-Таш улуттук паркына барып, арча жана жаңгак өскөн беткейлерде сейилдеп, ат минебиз.",
        ),
        overnight: l("Besh-Tash yurt camp", "Юртовый лагерь в Беш-Таше", "Беш-Таштагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Back to Bishkek", "Возвращение в Бишкек", "Бишкекке кайтуу"),
        description: l(
          "Return over the Ala-Bel pass with stops in villages on the way.",
          "Обратная дорога через перевал Ала-Бел с остановками в деревнях.",
          "Жолдогу айылдарга токтоп, Ала-Бел ашуусу аркылуу кайтабыз.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 10,
  },
  {
    slug: "kel-suu-lake",
    title: l("Kel-Suu Lake Expedition", "Экспедиция к озеру Кёль-Суу", "Көл-Суу көлүнө экспедиция"),
    region: "naryn",
    summary: l(
      "Five days to a remote turquoise lake in the Naryn mountains, via the Tash-Rabat caravanserai.",
      "Пять дней до далёкого бирюзового озера в горах Нарына через караван-сарай Таш-Рабат.",
      "Таш-Рабат керван-сарайы аркылуу Нарын тоолорундагы алыскы көгүлтүр көлгө беш күн.",
    ),
    description: l(
      "A rugged journey to Kel-Suu, a remote lake in the Naryn region near the border with China, reached on rough tracks and short hikes. On the way, visit the stone Tash-Rabat caravanserai and sleep in yurts in high valleys. Border-zone permits are required for the area and we arrange them in advance. The road is long and rough, so this trip suits travellers with some fitness and a sense of adventure.",
      "Непростая поездка к озеру Кёль-Суу — далёкому озеру в Нарынской области у границы с Китаем, куда ведут грунтовые дороги и короткие пешие участки. По пути — каменный караван-сарай Таш-Рабат и ночёвки в юртах в высокогорных долинах. Для этого района нужен пропуск в приграничную зону, мы оформляем его заранее. Дорога долгая и тряская, поэтому поездка подойдёт тем, у кого есть базовая физическая подготовка и тяга к приключениям.",
      "Кытай менен чектешкен Нарын облусундагы алыскы Көл-Суу көлүнө кыйын жол: начар жолдор жана кыска жөө бөлүктөр. Жолдо таш Таш-Рабат керван-сарайын көрүп, бийик өрөөндөрдөгү боз үйлөрдө түнөйбүз. Бул аймакка кирүү үчүн чек ара зонасына уруксат талап кылынат, аны биз алдын ала тариздейбиз. Жол узак жана оор, ошондуктан бир аз физикалык даярдыгы бар жана укмуштуу окуяларды сүйгөн саякатчыларга ылайыктуу.",
    ),
    pricePerPersonUsd: 780,
    difficulty: "challenging",
    highlights: l(
      ["Kel-Suu lake", "Tash-Rabat caravanserai", "4x4 and hiking in the high mountains", "Remote yurt camps"],
      ["Озеро Кёль-Суу", "Караван-сарай Таш-Рабат", "Внедорожники и пешие участки в высоких горах", "Далёкие юртовые лагеря"],
      ["Көл-Суу көлү", "Таш-Рабат керван-сарайы", "Бийик тоолордо внедорожник жана жөө жүрүш", "Алыскы боз үй лагерлери"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Naryn", "Бишкек → Нарын", "Бишкек → Нарын"),
        description: l(
          "Long drive through Kochkor and the Naryn gorge.",
          "Долгая дорога через Кочкор и Нарынское ущелье.",
          "Кочкор жана Нарын капчыгайы аркылуу узак жол.",
        ),
        overnight: l("Naryn guesthouse yurts", "Юрты в гостевом доме в Нарыне", "Нарындагы конок үйдүн боз үйлөрү"),
      },
      {
        days: 1,
        title: l("Tash-Rabat", "Таш-Рабат", "Таш-Рабат"),
        description: l(
          "Drive through the At-Bashi valley to the medieval stone caravanserai of Tash-Rabat, with a short walk in the surrounding hills.",
          "Дорога через долину Ат-Баши к средневековому каменному караван-сараю Таш-Рабат и короткая прогулка по окрестным холмам.",
          "Ат-Башы өрөөнү аркылуу орто кылымдагы таш Таш-Рабат керван-сарайына барып, айланадагы адырларда кыска сейилдейбиз.",
        ),
        overnight: l("Tash-Rabat yurt camp", "Юртовый лагерь у Таш-Рабата", "Таш-Рабаттагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("To the Kel-Suu valley", "К долине Кёль-Суу", "Көл-Суу өрөөнүнө"),
        description: l(
          "Rough 4x4 transfer toward Kel-Suu, finishing on foot or horseback depending on conditions.",
          "Трудный переезд на внедорожнике в сторону Кёль-Суу; последний участок пешком или верхом — по условиям.",
          "Көл-Суу тарапка оор жол менен внедорожникте барып, акыркы бөлүгүн шартка жараша жөө же атчан өтөбүз.",
        ),
        overnight: l("Kel-Suu yurt camp", "Юртовый лагерь у Кёль-Суу", "Көл-Суудагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Kel-Suu lake", "Озеро Кёль-Суу", "Көл-Суу көлү"),
        description: l(
          "A full day at the lake, with walks and photography. Weather can change quickly at this altitude.",
          "Целый день у озера: прогулки и фотосъёмка. На такой высоте погода быстро меняется.",
          "Көлдө бир күн: сейил жана сүрөткө тартуу. Мынчалык бийиктикте аба ырайы тез өзгөрөт.",
        ),
        overnight: l("Kel-Suu yurt camp", "Юртовый лагерь у Кёль-Суу", "Көл-Суудагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Return to Bishkek", "Возвращение в Бишкек", "Бишкекке кайтуу"),
        description: l(
          "A long return day by 4x4 and road back to Bishkek.",
          "Долгий обратный день: внедорожник и дорога до Бишкека.",
          "Внедорожник жана жол менен Бишкекке узак кайтуу күнү.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 8,
  },
  {
    slug: "osh-alay-tulpar-kol",
    title: l("Osh, Alay & Tulpar-Kol", "Ош, Алай и Тулпар-Куль", "Ош, Алай жана Тулпар-Көл"),
    region: "osh",
    summary: l(
      "Eight days from the ancient Silk Road city of Osh to the Alay valley and the Pamir peaks.",
      "Восемь дней от древнего города Шёлкового пути Оша до Алайской долины и вершин Памира.",
      "Жибек жолундагы байыркы Ош шаарынан Алай өрөөнүнө жана Памир чокуларына чейин сегиз күн.",
    ),
    description: l(
      "Begin in Osh, one of Central Asia's oldest cities, with Sulaiman-Too and the great bazaar. Then climb through the Taldyk pass to Sary-Tash and the wide Alay valley, with the Pamir-Alay peaks across the plain. Spend nights in yurt camps near Tulpar-Kol lake and in the valley, and close with a visit to historic Uzgen.",
      "Начните с Оша — одного из старейших городов Центральной Азии: гора Сулайман-Тоо и большой базар. Затем через перевал Талдык поднимитесь в Сары-Таш и широкую Алайскую долину, за которой видны вершины Памиро-Алая. Ночуйте в юртовых лагерях у озера Тулпар-Куль и в долине, а завершите поездку в старинном Узгене.",
      "Борбордук Азиянын эң байыркы шаарларынын бири Оштон — Сулайман-Тоо жана чоң базардан баштайбыз. Андан соң Талдык ашуусу аркылуу Сары-Ташка жана кең Алай өрөөнүнө көтөрүлөбүз, анын аркы өйүзүндө Памир-Алай чокулары көрүнөт. Түнөө — Тулпар-Көлдүн жанындагы жана өрөөндөгү боз үй лагерлеринде, аягында тарыхый Өзгөнгө баруу.",
    ),
    pricePerPersonUsd: 1180,
    difficulty: "moderate",
    highlights: l(
      ["Sulaiman-Too and Osh bazaar", "Taldyk pass", "Alay valley views", "Tulpar-Kol lake", "Uzgen minaret"],
      ["Сулайман-Тоо и ошский базар", "Перевал Талдык", "Виды Алайской долины", "Озеро Тулпар-Куль", "Минарет Узгена"],
      ["Сулайман-Тоо жана Ош базары", "Талдык ашуусу", "Алай өрөөнүнүн көрүнүштөрү", "Тулпар-Көл", "Өзгөн мунарасы"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Osh", "Ош", "Ош"),
        description: l(
          "Sulaiman-Too, the old town and the great bazaar.",
          "Сулайман-Тоо, старый город и большой базар.",
          "Сулайман-Тоо, эски шаар жана чоң базар.",
        ),
        overnight: l("Osh guesthouse", "Гостевой дом в Оше", "Ошто конок үй"),
      },
      {
        days: 1,
        title: l("Osh → Sary-Tash", "Ош → Сары-Таш", "Ош → Сары-Таш"),
        description: l(
          "Drive through Gulcha and over the Taldyk pass to Sary-Tash, at the edge of the Alay valley.",
          "Дорога через Гульчу и перевал Талдык в Сары-Таш на краю Алайской долины.",
          "Гүлчө жана Талдык ашуусу аркылуу Алай өрөөнүнүн четиндеги Сары-Ташка барабыз.",
        ),
        overnight: l("Sary-Tash yurt camp", "Юртовый лагерь в Сары-Таше", "Сары-Таштагы боз үй лагери"),
      },
      {
        days: 3,
        title: l("Alay valley & Tulpar-Kol", "Алайская долина и Тулпар-Куль", "Алай өрөөнү жана Тулпар-Көл"),
        description: l(
          "Explore the Alay valley under the Pamir-Alay peaks, with days of walking and horse riding around Tulpar-Kol lake and herders' summer pastures.",
          "Знакомство с Алайской долиной под вершинами Памиро-Алая: пешие и конные прогулки вокруг озера Тулпар-Куль и по летним пастбищам.",
          "Памир-Алай чокуларынын алдындагы Алай өрөөнүн изилдейбиз: Тулпар-Көлдүн жана малчылардын жайлоолорунун айланасында жөө жана атчан сейил.",
        ),
        overnight: l("Tulpar-Kol yurt camp", "Юртовый лагерь у Тулпар-Куля", "Тулпар-Көлдөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Daroot-Korgon", "Дароот-Коргон", "Дароот-Коргон"),
        description: l(
          "Down the valley to Daroot-Korgon, with a visit to a local village and a family dinner.",
          "Спуск по долине в Дароот-Коргон, знакомство с деревней и ужин в семье.",
          "Өрөөн боюнча Дароот-Коргонго түшүп, айылга барып, үй-бүлөдө кечки тамак ичебиз.",
        ),
        overnight: l("Daroot-Korgon host-family yurt", "Юрта в семье в Дароот-Коргоне", "Дароот-Коргондогу үй ээсинин боз үйү"),
      },
      {
        days: 1,
        title: l("Uzgen", "Узген", "Өзгөн"),
        description: l(
          "Drive to Uzgen to see its minaret and medieval mausoleums, then on to Osh.",
          "Переезд в Узген: минарет и средневековые мавзолеи, затем дорога в Ош.",
          "Өзгөнгө барып, мунарасын жана орто кылымдагы күмбөздөрүн көрөбүз, андан соң Ошко өтөбүз.",
        ),
        overnight: l("Osh guesthouse", "Гостевой дом в Оше", "Ошто конок үй"),
      },
      {
        days: 1,
        title: l("Osh & departure", "Ош и отъезд", "Ош жана кетүү"),
        description: l(
          "Free morning at the bazaar and farewell lunch.",
          "Свободное утро на базаре и прощальный обед.",
          "Эртең менен базарда эркин убакыт жана коштошуу түшкү тамагы.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 8,
  },
  {
    slug: "batken-ak-suu",
    title: l("Batken Apricots & Ak-Suu Peaks", "Баткенские абрикосы и вершины Ак-Суу", "Баткен өрүгү жана Ак-Суу чокулары"),
    region: "batken",
    summary: l(
      "Ten days in far-southwest Kyrgyzstan: orchards, villages and a trek into the granite Ak-Suu valley.",
      "Десять дней на юго-западе Кыргызстана: сады, деревни и поход в гранитную долину Ак-Суу.",
      "Кыргызстандын түштүк-батышында он күн: бакчалар, айылдар жана гранит Ак-Суу өрөөнүнө жөө жүрүш.",
    ),
    description: l(
      "Travel to Batken, Kyrgyzstan's remote southwest, a region known for its apricots. Visit orchard villages and meet host families, then trek into the Ak-Suu valley in the Karavshin range, known to climbers for its granite walls. Border-zone permits are required here and we arrange them in advance. The trek is demanding and at altitude, with several nights in camp.",
      "Отправьтесь в Баткен — далёкий юго-запад Кыргызстана, известный своими абрикосами. Вы побываете в деревнях с садами, познакомитесь с принимающими семьями, а затем совершите поход в долину Ак-Суу в хребте Каравшин, известную скалолазам гранитными стенами. Для этого района нужен пропуск в приграничную зону, мы оформляем его заранее. Поход сложный, на высоте, с несколькими ночёвками в лагере.",
      "Өрүгү менен белгилүү Кыргызстандын алыскы түштүк-батышы — Баткенге барабыз. Бакчалуу айылдарга баруу жана үй ээлери менен таанышуудан кийин, аскачылар гранит аскалары менен билген Каравшин кыркасындагы Ак-Суу өрөөнүнө жөө жүрөбүз. Бул жерге кирүү үчүн чек ара зонасына уруксат талап кылынат, аны биз алдын ала тариздейбиз. Жөө жүрүш татаал, бийик тоодо өтөт жана лагерде бир нече түн болот.",
    ),
    pricePerPersonUsd: 1450,
    difficulty: "challenging",
    highlights: l(
      ["Batken orchard villages", "Ak-Suu valley trek", "Granite walls of the Karavshin range", "Remote mountain camps"],
      ["Баткенские деревни с садами", "Поход в долину Ак-Суу", "Гранитные стены хребта Каравшин", "Далёкие горные лагеря"],
      ["Баткендеги бакчалуу айылдар", "Ак-Суу өрөөнүнө жөө жүрүш", "Каравшин кыркасынын гранит аскалары", "Алыскы тоо лагерлери"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Osh → Batken", "Ош → Баткен", "Ош → Баткен"),
        description: l(
          "Long drive west from Osh to Batken through the foothills.",
          "Долгая дорога на запад из Оша в Баткен через предгорья.",
          "Оштон батышты көздөй тоо этектери аркылуу Баткенге узак жол.",
        ),
        overnight: l("Batken guesthouse", "Гостевой дом в Баткене", "Баткендеги конок үй"),
      },
      {
        days: 1,
        title: l("Batken orchards", "Сады Баткена", "Баткен бакчалары"),
        description: l(
          "Visit orchards and villages, learn how apricots are dried and meet a host family.",
          "Сады и деревни, знакомство с сушкой абрикосов и встреча с принимающей семьёй.",
          "Бакчаларга жана айылдарга баруу, өрүк кургатууну көрүп, үй ээси менен таанышуу.",
        ),
        overnight: l("Village host-family yurt", "Юрта в деревенской семье", "Айылдагы үй ээсинин боз үйү"),
      },
      {
        days: 2,
        title: l("Approach to Ak-Suu", "Дорога к Ак-Суу", "Ак-Суу тарапка жол"),
        description: l(
          "Transfer by 4x4 into the mountains toward the Ak-Suu valley, with an acclimatisation walk.",
          "Переезд на внедорожнике в горы в сторону долины Ак-Суу, акклиматизационная прогулка.",
          "Ак-Суу өрөөнүнө карай тоого внедорожникте барып, көнүгүү сейили.",
        ),
        overnight: l("Mountain camp tents or yurts", "Горный лагерь: палатки или юрты", "Тоо лагери: чатырлар же боз үйлөр"),
      },
      {
        days: 3,
        title: l("Ak-Suu valley trek", "Поход по долине Ак-Суу", "Ак-Суу өрөөнүндө жөө жүрүш"),
        description: l(
          "Trek among the granite walls of the valley, with days for exploring and rest. Weather can change quickly.",
          "Поход среди гранитных стен долины с днями для прогулок и отдыха. Погода может быстро измениться.",
          "Өрөөндүн гранит аскаларынын арасында жөө жүрүү, изилдөө жана эс алуу күндөрү менен. Аба ырайы тез өзгөрүшү мүмкүн.",
        ),
        overnight: l("Mountain camp tents or yurts", "Горный лагерь: палатки или юрты", "Тоо лагери: чатырлар же боз үйлөр"),
      },
      {
        days: 1,
        title: l("Return to Batken", "Возвращение в Баткен", "Баткенге кайтуу"),
        description: l(
          "Trek and drive out of the mountains to Batken.",
          "Спуск пешком и на машине из гор в Баткен.",
          "Тоодон жөө жана унаа менен Баткенге түшүү.",
        ),
        overnight: l("Batken guesthouse", "Гостевой дом в Баткене", "Баткендеги конок үй"),
      },
      {
        days: 1,
        title: l("Batken → Osh", "Баткен → Ош", "Баткен → Ош"),
        description: l(
          "Drive back east to Osh.",
          "Дорога на восток обратно в Ош.",
          "Чыгышты көздөй Ошко кайтуу.",
        ),
        overnight: l("Osh guesthouse", "Гостевой дом в Оше", "Ошто конок үй"),
      },
      {
        days: 1,
        title: l("Osh & departure", "Ош и отъезд", "Ош жана кетүү"),
        description: l(
          "Free morning at the bazaar and farewell lunch.",
          "Свободное утро на базаре и прощальный обед.",
          "Эртең менен базарда эркин убакыт жана коштошуу түшкү тамагы.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 8,
  },
  {
    slug: "issyk-kul-south-shore",
    title: l("Issyk-Kul South Shore Weekend", "Уикенд на южном берегу Иссык-Куля", "Ысык-Көлдүн түштүк жээгинде дем алыш"),
    region: "issyk_kul",
    summary: l(
      "A two-day taste of Issyk-Kul: the Skazka canyon, a swim in the lake and a night in a shoreline yurt.",
      "Два дня на Иссык-Куле: каньон Сказка, купание в озере и ночь в юрте на берегу.",
      "Ысык-Көлдө эки күн: Жомок капчыгайы, көлдө сууга түшүү жана жээктеги боз үйдө бир түн.",
    ),
    description: l(
      "The shortest and most affordable way to see the lake. Drive through the Boom gorge to the quiet south shore, walk among the red rock shapes of the Skazka (Fairy Tale) canyon and spend the evening by the water in a family yurt camp near Bokonbaevo.",
      "Самый короткий и доступный способ увидеть озеро. Через Боомское ущелье — на тихий южный берег, прогулка среди красных скал каньона Сказка и вечер у воды в семейном юртовом лагере возле Боконбаева.",
      "Көлдү көрүүнүн эң кыска жана арзан жолу. Боом капчыгайы аркылуу тынч түштүк жээкке барып, Жомок капчыгайынын кызыл аскаларын аралап, Бөкөнбаевдин жанындагы үй-бүлөлүк боз үй лагеринде суунун жээгинде кеч өткөрөсүз.",
    ),
    pricePerPersonUsd: 140,
    difficulty: "easy",
    highlights: l(
      ["Skazka canyon", "Swim in Issyk-Kul", "Shoreline yurt camp", "Shortest, lowest-priced trip"],
      ["Каньон Сказка", "Купание в Иссык-Куле", "Юрты на берегу", "Самая короткая и доступная поездка"],
      ["Жомок капчыгайы", "Ысык-Көлдө сууга түшүү", "Жээктеги боз үйлөр", "Эң кыска жана арзан саякат"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Skazka → south shore", "Бишкек → Сказка → южный берег", "Бишкек → Жомок → түштүк жээк"),
        description: l(
          "Drive through the Boom gorge, walk in the Skazka canyon, evening swim.",
          "Дорога через Боомское ущелье, прогулка по каньону Сказка, вечернее купание.",
          "Боом капчыгайы аркылуу жол, Жомок капчыгайында сейилдөө, кечки сууга түшүү.",
        ),
        overnight: l("Yurt camp near Bokonbaevo", "Юртовый лагерь возле Боконбаева", "Бөкөнбаевдин жанындагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("South shore → Bishkek", "Южный берег → Бишкек", "Түштүк жээк → Бишкек"),
        description: l(
          "Morning by the lake, lunch with the camp family, return drive.",
          "Утро у озера, обед с семьёй в лагере, дорога обратно.",
          "Көлдүн жээгинде таң, лагердеги үй-бүлө менен түшкү тамак, кайтуу жолу.",
        ),
        overnight: dash,
      },
    ]),
    capacity: 12,
  },
  {
    slug: "tash-rabat-caravanserai",
    title: l("Tash-Rabat Silk Road Caravanserai", "Караван-сарай Таш-Рабат", "Таш-Рабат кербен сарайы"),
    region: "naryn",
    summary: l(
      "Three days to a medieval stone caravanserai hidden in a high valley on the old Silk Road.",
      "Три дня к средневековому каменному караван-сараю в высокогорной долине на древнем Шёлковом пути.",
      "Байыркы Жибек жолундагы бийик өрөөндө жашырынган орто кылымдагы таш кербен сарайга үч күн.",
    ),
    description: l(
      "Follow the route of the caravans south through Naryn to Tash-Rabat, a stone caravanserai standing alone in a grassy valley at about 3,500 m. Sleep in the yurt camp beside it, hike up the valley and hear the stories of merchants who crossed these mountains.",
      "По пути караванов — на юг через Нарын к Таш-Рабату, каменному караван-сараю в одинокой травянистой долине на высоте около 3500 м. Ночёвки в юртовом лагере рядом, прогулки по долине и истории купцов, пересекавших эти горы.",
      "Кербендердин жолу менен Нарын аркылуу түштүккө — болжол менен 3500 м бийиктиктеги чөптүү өрөөндө жалгыз турган Таш-Рабат таш кербен сарайына. Жанындагы боз үй лагеринде түнөп, өрөөн бойлоп басып, бул тоолорду ашкан соодагерлер тууралуу аңгемелерди угасыз.",
    ),
    pricePerPersonUsd: 340,
    difficulty: "easy",
    highlights: l(
      ["Stone caravanserai", "Valley at about 3,500 m", "Silk Road history", "Yurt camp beside the monument"],
      ["Каменный караван-сарай", "Долина на высоте около 3500 м", "История Шёлкового пути", "Юрты рядом с памятником"],
      ["Таш кербен сарай", "Болжол менен 3500 м бийиктиктеги өрөөн", "Жибек жолунун тарыхы", "Эстеликтин жанындагы боз үйлөр"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Naryn → Tash-Rabat", "Бишкек → Нарын → Таш-Рабат", "Бишкек → Нарын → Таш-Рабат"),
        description: l(
          "A long scenic drive south through Kochkor and Naryn.",
          "Долгая живописная дорога на юг через Кочкор и Нарын.",
          "Кочкор жана Нарын аркылуу түштүккө узун кооз жол.",
        ),
        overnight: l("Tash-Rabat yurt camp", "Юртовый лагерь у Таш-Рабата", "Таш-Рабаттагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Caravanserai and valley hike", "Караван-сарай и прогулка по долине", "Кербен сарай жана өрөөн бойлоп басуу"),
        description: l(
          "Explore the caravanserai, then hike or ride up the valley.",
          "Осмотр караван-сарая, затем пешая или конная прогулка вверх по долине.",
          "Кербен сарайды көрүп, андан кийин өрөөн бойлоп жөө же ат менен чыгуу.",
        ),
        overnight: l("Tash-Rabat yurt camp", "Юртовый лагерь у Таш-Рабата", "Таш-Рабаттагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Tash-Rabat → Bishkek", "Таш-Рабат → Бишкек", "Таш-Рабат → Бишкек"),
        description: l("Return drive north.", "Дорога обратно на север.", "Түндүккө кайтуу жолу."),
        overnight: dash,
      },
    ]),
    capacity: 12,
  },
  {
    slug: "arslanbob-walnut-forest",
    title: l("Arslanbob Walnut Forest", "Ореховый лес Арсланбоба", "Арстанбаптын жаңгак токою"),
    region: "jalal_abad",
    summary: l(
      "Four gentle days in one of the world's largest walnut forests, with waterfalls and village life.",
      "Четыре неспешных дня в одном из крупнейших ореховых лесов мира: водопады и деревенская жизнь.",
      "Дүйнөдөгү эң чоң жаңгак токойлорунун биринде төрт шашылбаган күн: шаркыратмалар жана айыл турмушу.",
    ),
    description: l(
      "Starting in Osh, travel north to Arslanbob, a village surrounded by ancient walnut groves beneath the Babash-Ata range. Walk shaded forest trails to two waterfalls, visit the bazaar and spend the nights in a yurt camp at the forest edge.",
      "Из Оша — на север в Арсланбоб, село среди древних ореховых рощ у подножия хребта Бабаш-Ата. Прогулки по тенистым лесным тропам к двум водопадам, местный базар и ночёвки в юртовом лагере на краю леса.",
      "Оштон түндүккө, Бабаш-Ата кырка тоосунун этегиндеги байыркы жаңгак токойлору курчаган Арстанбап айылына. Көлөкөлүү токой жолдору менен эки шаркыратмага басып, базарды көрүп, токойдун четиндеги боз үй лагеринде түнөйсүз.",
    ),
    pricePerPersonUsd: 360,
    difficulty: "easy",
    highlights: l(
      ["Ancient walnut groves", "Two waterfalls", "Village bazaar", "Starts and ends in Osh"],
      ["Древние ореховые рощи", "Два водопада", "Сельский базар", "Начало и конец в Оше"],
      ["Байыркы жаңгак токойлору", "Эки шаркыратма", "Айыл базары", "Ошто башталып, Ошто бүтөт"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Osh → Arslanbob", "Ош → Арсланбоб", "Ош → Арстанбап"),
        description: l(
          "Drive through the Fergana valley foothills to Arslanbob.",
          "Дорога через предгорья Ферганской долины в Арсланбоб.",
          "Фергана өрөөнүнүн тоо этектери аркылуу Арстанбапка жол.",
        ),
        overnight: l("Arslanbob yurt camp", "Юртовый лагерь в Арсланбобе", "Арстанбаптагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Forest walks and waterfalls", "Лесные прогулки и водопады", "Токойдо сейилдөө жана шаркыратмалар"),
        description: l(
          "Easy walks through the walnut forest to the waterfalls; village and bazaar visit.",
          "Лёгкие прогулки по ореховому лесу к водопадам; село и базар.",
          "Жаңгак токою аркылуу шаркыратмаларга жеңил басуу; айыл жана базар.",
        ),
        overnight: l("Arslanbob yurt camp", "Юртовый лагерь в Арсланбобе", "Арстанбаптагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Arslanbob → Osh", "Арсланбоб → Ош", "Арстанбап → Ош"),
        description: l("Return drive to Osh.", "Дорога обратно в Ош.", "Ошко кайтуу жолу."),
        overnight: dash,
      },
    ]),
    capacity: 10,
  },
  {
    slug: "eagle-hunters-jeti-oguz",
    title: l("Eagle Hunters & Jeti-Oguz", "Беркутчи и Джеты-Огуз", "Бүркүтчүлөр жана Жети-Өгүз"),
    region: "issyk_kul",
    summary: l(
      "Five days on the south shore: meet eagle hunters, walk the red rocks of Jeti-Oguz and sleep in valley yurts.",
      "Пять дней на южном берегу: встреча с беркутчи, красные скалы Джеты-Огуза и юрты в горных долинах.",
      "Түштүк жээкте беш күн: бүркүтчүлөр менен жолугушуу, Жети-Өгүздүн кызыл аскалары жана өрөөндөгү боз үйлөр.",
    ),
    description: l(
      "Watch a berkutchi fly his golden eagle near Bokonbaevo, then travel east along the lake to the Jeti-Oguz gorge, famous for its 'Seven Bulls' red cliffs. Spend two days walking and riding in the green valleys above, with yurt camps every night.",
      "Посмотрите, как беркутчи запускает своего беркута возле Боконбаева, затем вдоль озера — на восток к ущелью Джеты-Огуз со знаменитыми красными скалами «Семь быков». Два дня пеших и конных прогулок по зелёным долинам и юрты каждую ночь.",
      "Бөкөнбаевдин жанында бүркүтчүнүн бүркүт салганын көрүп, андан кийин көлдүн жээги менен чыгышка — атактуу «Жети өгүз» кызыл аскалары бар Жети-Өгүз капчыгайына. Жогорку жашыл өрөөндөрдө эки күн жөө жана ат менен сейилдеп, ар түнү боз үйдө түнөйсүз.",
    ),
    pricePerPersonUsd: 560,
    difficulty: "easy",
    highlights: l(
      ["Golden eagle demonstration", "Jeti-Oguz red cliffs", "Valley horse rides", "Lake swims"],
      ["Показ охоты с беркутом", "Красные скалы Джеты-Огуза", "Конные прогулки по долинам", "Купание в озере"],
      ["Бүркүт салуу көрсөтмөсү", "Жети-Өгүздүн кызыл аскалары", "Өрөөндө ат минүү", "Көлдө сууга түшүү"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Bokonbaevo", "Бишкек → Боконбаево", "Бишкек → Бөкөнбаев"),
        description: l(
          "Drive to the south shore; evening with an eagle hunter family.",
          "Дорога на южный берег; вечер с семьёй беркутчи.",
          "Түштүк жээкке жол; бүркүтчүнүн үй-бүлөсү менен кеч.",
        ),
        overnight: l("Yurt camp near Bokonbaevo", "Юртовый лагерь возле Боконбаева", "Бөкөнбаевдин жанындагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Skazka canyon → Jeti-Oguz", "Каньон Сказка → Джеты-Огуз", "Жомок капчыгайы → Жети-Өгүз"),
        description: l(
          "Morning eagle demonstration, Skazka canyon, drive east along the lake.",
          "Утренний показ охоты с беркутом, каньон Сказка, дорога на восток вдоль озера.",
          "Эртең мененки бүркүт салуу, Жомок капчыгайы, көлдүн жээги менен чыгышка жол.",
        ),
        overnight: l("Jeti-Oguz yurt camp", "Юртовый лагерь в Джеты-Огузе", "Жети-Өгүздөгү боз үй лагери"),
      },
      {
        days: 2,
        title: l("Jeti-Oguz valleys", "Долины Джеты-Огуза", "Жети-Өгүздүн өрөөндөрү"),
        description: l(
          "Walks and horse rides through the gorge and the meadows above it.",
          "Пешие и конные прогулки по ущелью и лугам над ним.",
          "Капчыгай жана анын үстүндөгү шалбаалар аркылуу жөө жана ат менен сейилдөө.",
        ),
        overnight: l("Jeti-Oguz yurt camp", "Юртовый лагерь в Джеты-Огузе", "Жети-Өгүздөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Jeti-Oguz → Bishkek", "Джеты-Огуз → Бишкек", "Жети-Өгүз → Бишкек"),
        description: l("Return drive along the north shore.", "Дорога обратно по северному берегу.", "Түндүк жээк менен кайтуу жолу."),
        overnight: dash,
      },
    ]),
    capacity: 10,
  },
  {
    slug: "jailoo-family-stay",
    title: l("Nine Days with a Herder Family", "Девять дней с семьёй пастухов", "Малчы үй-бүлө менен тогуз күн"),
    region: "naryn",
    summary: l(
      "Slow travel on a summer pasture: herd, ride, make felt and cook alongside a Kyrgyz family.",
      "Неспешное путешествие на летнем пастбище: пасти скот, ездить верхом, валять войлок и готовить вместе с кыргызской семьёй.",
      "Жайлоодо шашылбаган саякат: кыргыз үй-бүлөсү менен бирге мал багып, ат минип, кийиз басып, тамак жасайсыз.",
    ),
    description: l(
      "Instead of moving every day, settle into one family's jailoo near Kochkor. Help bring the herds in, learn to ride, press a shyrdak with the women of the camp and listen to the komuz in the evenings. One day you ride over to Song-Kul before heading home.",
      "Вместо ежедневных переездов — жизнь на одном джайлоо у семьи возле Кочкора. Помогайте пригонять скот, учитесь ездить верхом, валяйте шырдак вместе с женщинами лагеря и слушайте комуз по вечерам. Один день — конная поездка к Сон-Кулю перед возвращением.",
      "Күн сайын көчпөй, Кочкордун жанындагы бир үй-бүлөнүн жайлоосуна токтойсуз. Малды айдап келүүгө жардам берип, ат минүүнү үйрөнүп, лагердеги аялдар менен шырдак басып, кечинде комуз угасыз. Үйгө кайтар алдында бир күн ат менен Соң-Көлгө барасыз.",
    ),
    pricePerPersonUsd: 960,
    difficulty: "easy",
    highlights: l(
      ["One family, one jailoo", "Learn to ride", "Shyrdak felt-making", "Komuz evenings"],
      ["Одна семья, одно джайлоо", "Обучение верховой езде", "Валяние шырдака", "Вечера с комузом"],
      ["Бир үй-бүлө, бир жайлоо", "Ат минүүнү үйрөнүү", "Шырдак басуу", "Комуз кечелери"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Kochkor → jailoo", "Бишкек → Кочкор → джайлоо", "Бишкек → Кочкор → жайлоо"),
        description: l(
          "Drive to Kochkor, meet your host family and settle into the camp.",
          "Дорога в Кочкор, знакомство с семьёй и заселение в лагерь.",
          "Кочкорго жол, үй-бүлө менен таанышуу жана лагерге орношуу.",
        ),
        overnight: l("Family yurt on the jailoo", "Семейная юрта на джайлоо", "Жайлоодогу үй-бүлөлүк боз үй"),
      },
      {
        days: 3,
        title: l("Herding and riding", "Выпас и верховая езда", "Мал багуу жана ат минүү"),
        description: l(
          "Morning milking, moving the herds, daily riding lessons.",
          "Утренняя дойка, перегон скота, ежедневные уроки верховой езды.",
          "Эртең мененки саан, малды айдоо, күн сайын ат минүү сабагы.",
        ),
        overnight: l("Family yurt on the jailoo", "Семейная юрта на джайлоо", "Жайлоодогу үй-бүлөлүк боз үй"),
      },
      {
        days: 3,
        title: l("Felt, food and music", "Войлок, еда и музыка", "Кийиз, тамак жана музыка"),
        description: l(
          "Shyrdak felt-making, cooking boorsok and beshbarmak, komuz in the evening.",
          "Валяние шырдака, готовим боорсоки и бешбармак, вечером — комуз.",
          "Шырдак басуу, боорсок жана бешбармак жасоо, кечинде комуз.",
        ),
        overnight: l("Family yurt on the jailoo", "Семейная юрта на джайлоо", "Жайлоодогу үй-бүлөлүк боз үй"),
      },
      {
        days: 1,
        title: l("Ride to Song-Kul", "Конная поездка к Сон-Кулю", "Ат менен Соң-Көлгө"),
        description: l(
          "A full day in the saddle to the lake shore.",
          "Целый день в седле до берега озера.",
          "Көлдүн жээгине чейин ээрде бир күн.",
        ),
        overnight: l("Song-Kul yurt camp", "Юртовый лагерь на Сон-Куле", "Соң-Көлдөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Song-Kul → Bishkek", "Сон-Куль → Бишкек", "Соң-Көл → Бишкек"),
        description: l("Return drive.", "Дорога обратно.", "Кайтуу жолу."),
        overnight: dash,
      },
    ]),
    capacity: 8,
  },
  {
    slug: "karakol-ala-kul-trek",
    title: l("Karakol Peaks & Ala-Kul Trek", "Трек к Ала-Кулю в горах Каракола", "Каракол тоолору жана Ала-Көл трек"),
    region: "issyk_kul",
    summary: l(
      "Twelve days of trekking in the Terskey Ala-Too, crossing high passes to the turquoise Ala-Kul lake.",
      "Двенадцать дней треккинга в Терскей Ала-Тоо: высокие перевалы и бирюзовое озеро Ала-Куль.",
      "Тескей Ала-Тоодо он эки күн трек: бийик ашуулар жана көгүлтүр Ала-Көл.",
    ),
    description: l(
      "A proper mountain trek for fit walkers. From Karakol head into the Terskey Ala-Too range, crossing passes of up to about 3,900 m, camping by the glacier-fed Ala-Kul lake and soaking in the hot springs of Altyn-Arashan. Pack horses carry the gear; nights are in yurt camps along the valleys.",
      "Настоящий горный поход для подготовленных. Из Каракола — в хребет Терскей Ала-Тоо, через перевалы высотой до 3900 м, к ледниковому озеру Ала-Куль и горячим источникам Алтын-Арашана. Вещи везут вьючные лошади, ночёвки — в юртовых лагерях в долинах.",
      "Даярдыгы бар жөө жүрүүчүлөр үчүн чыныгы тоо жүрүшү. Караколдон Тескей Ала-Тоо кырка тоосуна, болжол менен 3900 м чейинки ашуулар аркылуу мөңгүдөн агып келген Ала-Көлгө жана Алтын-Арашандын ысык булактарына. Жүктү жүк ташыган аттар көтөрөт, түндөрү өрөөндөрдөгү боз үй лагерлеринде.",
    ),
    pricePerPersonUsd: 1290,
    difficulty: "challenging",
    highlights: l(
      ["Ala-Kul glacier lake", "Passes up to about 3,900 m", "Altyn-Arashan hot springs", "Pack-horse support"],
      ["Ледниковое озеро Ала-Куль", "Перевалы до 3900 м", "Горячие источники Алтын-Арашана", "Вьючные лошади"],
      ["Ала-Көл мөңгү көлү", "3900 м чейинки ашуулар", "Алтын-Арашандын ысык булактары", "Жүк ташыган аттар"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Karakol", "Бишкек → Каракол", "Бишкек → Каракол"),
        description: l(
          "Drive along the north shore of Issyk-Kul to Karakol.",
          "Дорога по северному берегу Иссык-Куля в Каракол.",
          "Ысык-Көлдүн түндүк жээги менен Караколго жол.",
        ),
        overnight: l("Yurt camp near Karakol", "Юртовый лагерь возле Каракола", "Караколдун жанындагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Acclimatisation walks", "Акклиматизационные выходы", "Аклиматизация үчүн басуу"),
        description: l(
          "Day hikes in the Karakol valley to prepare for altitude.",
          "Однодневные походы по Каракольской долине для акклиматизации.",
          "Бийиктикке көнүү үчүн Каракол өрөөнүндө бир күндүк жүрүштөр.",
        ),
        overnight: l("Karakol valley yurt camp", "Юртовый лагерь в Каракольской долине", "Каракол өрөөнүндөгү боз үй лагери"),
      },
      {
        days: 4,
        title: l("Over the passes to Ala-Kul", "Через перевалы к Ала-Кулю", "Ашуулар аркылуу Ала-Көлгө"),
        description: l(
          "Trek higher each day and cross the pass above Ala-Kul lake.",
          "С каждым днём выше; переход перевала над озером Ала-Куль.",
          "Күн сайын бийикке чыгып, Ала-Көлдүн үстүндөгү ашууну ашуу.",
        ),
        overnight: l("Mountain yurt camp", "Горный юртовый лагерь", "Тоодогу боз үй лагери"),
      },
      {
        days: 2,
        title: l("Altyn-Arashan hot springs", "Горячие источники Алтын-Арашана", "Алтын-Арашандын ысык булактары"),
        description: l(
          "Descend to Altyn-Arashan, rest day in the hot springs.",
          "Спуск в Алтын-Арашан, день отдыха у горячих источников.",
          "Алтын-Арашанга түшүү, ысык булактарда эс алуу күнү.",
        ),
        overnight: l("Altyn-Arashan yurt camp", "Юртовый лагерь в Алтын-Арашане", "Алтын-Арашандагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Valleys of the Terskey Ala-Too", "Долины Терскей Ала-Тоо", "Тескей Ала-Тоонун өрөөндөрү"),
        description: l(
          "Two easier trekking days through flowering valleys.",
          "Два более лёгких дня похода по цветущим долинам.",
          "Гүлдөгөн өрөөндөр аркылуу эки жеңилирээк жүрүш күнү.",
        ),
        overnight: l("Valley yurt camp", "Юртовый лагерь в долине", "Өрөөндөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Karakol → Bishkek", "Каракол → Бишкек", "Каракол → Бишкек"),
        description: l("Return drive along the lake.", "Дорога обратно вдоль озера.", "Көлдүн жээги менен кайтуу жолу."),
        overnight: dash,
      },
    ]),
    capacity: 8,
  },
  {
    slug: "silk-road-north-to-south",
    title: l("Silk Road: Bishkek to Osh", "Шёлковый путь: из Бишкека в Ош", "Жибек жолу: Бишкектен Ошко"),
    region: "multi",
    summary: l(
      "Eighteen days crossing the country from north to south — lakes, caravanserais, walnut forests and the Alay valley.",
      "Восемнадцать дней через всю страну с севера на юг: озёра, караван-сараи, ореховые леса и Алайская долина.",
      "Өлкөнү түндүктөн түштүккө он сегиз күндө кесип өтүү: көлдөр, кербен сарайлар, жаңгак токойлору жана Алай өрөөнү.",
    ),
    description: l(
      "The classic overland journey. Start at the Burana tower near Bishkek, ride at Song-Kul, sleep beside the Tash-Rabat caravanserai, cross the Moldo-Ashuu pass to Kazarman, rest in the walnut forests of Arslanbob, climb Sulaiman-Too in Osh and finish under the snow wall of the Pamir in the Alay valley.",
      "Классическое путешествие по суше. Начало у башни Бурана под Бишкеком, верховые прогулки на Сон-Куле, ночёвка у караван-сарая Таш-Рабат, перевал Молдо-Ашуу и Казарман, отдых в ореховых лесах Арсланбоба, гора Сулайман-Тоо в Оше и финал под снежной стеной Памира в Алайской долине.",
      "Классикалык кургактык саякаты. Бишкектин жанындагы Бурана мунарасынан баштап, Соң-Көлдө ат минип, Таш-Рабат кербен сарайынын жанында түнөп, Молдо-Ашуу ашуусу аркылуу Казарманга өтүп, Арстанбаптын жаңгак токойлорунда эс алып, Оштогу Сулайман-Тоого чыгып, Алай өрөөнүндө Памирдин кар дубалынын алдында бүтөсүз.",
    ),
    pricePerPersonUsd: 2190,
    difficulty: "moderate",
    highlights: l(
      ["North to south overland", "Tash-Rabat caravanserai", "Arslanbob walnut forest", "Alay valley below the Pamir"],
      ["С севера на юг по суше", "Караван-сарай Таш-Рабат", "Ореховый лес Арсланбоба", "Алайская долина под Памиром"],
      ["Түндүктөн түштүккө кургактык менен", "Таш-Рабат кербен сарайы", "Арстанбаптын жаңгак токою", "Памирдин алдындагы Алай өрөөнү"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Burana → Kochkor", "Бишкек → Бурана → Кочкор", "Бишкек → Бурана → Кочкор"),
        description: l("Burana tower, then on to Kochkor.", "Башня Бурана, затем в Кочкор.", "Бурана мунарасы, андан кийин Кочкорго."),
        overnight: l("Yurt camp near Kochkor", "Юртовый лагерь возле Кочкора", "Кочкордун жанындагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Song-Kul", "Сон-Куль", "Соң-Көл"),
        description: l("Horse riding and herder life by the lake.", "Верховая езда и жизнь пастухов у озера.", "Көлдүн жээгинде ат минүү жана малчылардын турмушу."),
        overnight: l("Song-Kul yurt camp", "Юртовый лагерь на Сон-Куле", "Соң-Көлдөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Song-Kul → At-Bashy", "Сон-Куль → Ат-Башы", "Соң-Көл → Ат-Башы"),
        description: l("Drive south through Naryn.", "Дорога на юг через Нарын.", "Нарын аркылуу түштүккө жол."),
        overnight: l("Yurt camp near At-Bashy", "Юртовый лагерь возле Ат-Башы", "Ат-Башынын жанындагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Tash-Rabat", "Таш-Рабат", "Таш-Рабат"),
        description: l("The caravanserai and hikes up the valley.", "Караван-сарай и прогулки по долине.", "Кербен сарай жана өрөөн бойлоп басуу."),
        overnight: l("Tash-Rabat yurt camp", "Юртовый лагерь у Таш-Рабата", "Таш-Рабаттагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Moldo-Ashuu pass → Kazarman", "Перевал Молдо-Ашуу → Казарман", "Молдо-Ашуу ашуусу → Казарман"),
        description: l("A remote mountain road west to Kazarman.", "Глухая горная дорога на запад к Казарману.", "Казарманга батышты көздөй алыскы тоо жолу."),
        overnight: l("Yurt camp near Kazarman", "Юртовый лагерь возле Казармана", "Казармандын жанындагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Kazarman → Arslanbob", "Казарман → Арсланбоб", "Казарман → Арстанбап"),
        description: l("Down to the Fergana valley and up to Arslanbob.", "Спуск в Ферганскую долину и подъём в Арсланбоб.", "Фергана өрөөнүнө түшүп, Арстанбапка чыгуу."),
        overnight: l("Arslanbob yurt camp", "Юртовый лагерь в Арсланбобе", "Арстанбаптагы боз үй лагери"),
      },
      {
        days: 3,
        title: l("Arslanbob", "Арсланбоб", "Арстанбап"),
        description: l("Walnut forest walks, waterfalls, village life.", "Прогулки по ореховому лесу, водопады, жизнь села.", "Жаңгак токоюнда сейилдөө, шаркыратмалар, айыл турмушу."),
        overnight: l("Arslanbob yurt camp", "Юртовый лагерь в Арсланбобе", "Арстанбаптагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Osh and Sulaiman-Too", "Ош и Сулайман-Тоо", "Ош жана Сулайман-Тоо"),
        description: l("Climb the sacred mountain and explore the great bazaar.", "Подъём на священную гору и большой базар.", "Ыйык тоого чыгуу жана чоң базарды кыдыруу."),
        overnight: l("Yurt camp outside Osh", "Юртовый лагерь под Ошем", "Оштун сыртындагы боз үй лагери"),
      },
      {
        days: 3,
        title: l("Alay valley", "Алайская долина", "Алай өрөөнү"),
        description: l("Walks on the high pastures facing the Pamir range.", "Прогулки по высокогорным пастбищам напротив Памира.", "Памирге караган бийик жайлоолордо сейилдөө."),
        overnight: l("Alay valley yurt camp", "Юртовый лагерь в Алайской долине", "Алай өрөөнүндөгү боз үй лагери"),
      },
      {
        days: 1,
        title: l("Alay → Osh", "Алай → Ош", "Алай → Ош"),
        description: l("Return to Osh; the tour ends.", "Возвращение в Ош, окончание тура.", "Ошко кайтуу, тур аяктайт."),
        overnight: dash,
      },
    ]),
    capacity: 8,
  },
  {
    slug: "three-lakes-odyssey",
    title: l("Three Lakes Odyssey", "Одиссея трёх озёр", "Үч көл саякаты"),
    region: "multi",
    summary: l(
      "Three weeks linking Issyk-Kul, Song-Kul and Kel-Suu, the country's most beautiful lakes.",
      "Три недели по самым красивым озёрам страны: Иссык-Куль, Сон-Куль и Кель-Суу.",
      "Өлкөнүн эң кооз көлдөрү — Ысык-Көл, Соң-Көл жана Көл-Суу аркылуу үч жума.",
    ),
    description: l(
      "A long, unhurried journey for travellers who want time in each place. Spend five days around Issyk-Kul, four on the high shore of Song-Kul and five at remote Kel-Suu near the Chinese border, with the Tash-Rabat caravanserai on the way home. Kel-Suu lies in a border zone; we arrange the permit.",
      "Долгое неспешное путешествие для тех, кто хочет побыть в каждом месте подольше. Пять дней вокруг Иссык-Куля, четыре — на высокогорном берегу Сон-Куля и пять — на далёком Кель-Суу у китайской границы, а по дороге домой — караван-сарай Таш-Рабат. Кель-Суу находится в пограничной зоне, пропуск мы оформляем.",
      "Ар бир жерде көбүрөөк болгусу келгендер үчүн узун, шашылбаган саякат. Ысык-Көлдү айланып беш күн, Соң-Көлдүн бийик жээгинде төрт күн жана Кытай чек арасына жакын алыскы Көл-Сууда беш күн, үйгө кайтарда Таш-Рабат кербен сарайы. Көл-Суу чек ара зонасында жайгашкан, уруксат кагазын биз алабыз.",
    ),
    pricePerPersonUsd: 2690,
    difficulty: "moderate",
    highlights: l(
      ["Issyk-Kul, Song-Kul and Kel-Suu", "Five days at Kel-Suu", "Border permit arranged", "Unhurried pace"],
      ["Иссык-Куль, Сон-Куль и Кель-Суу", "Пять дней на Кель-Суу", "Оформляем пограничный пропуск", "Неспешный темп"],
      ["Ысык-Көл, Соң-Көл жана Көл-Суу", "Көл-Сууда беш күн", "Чек ара уруксатын биз алабыз", "Шашылбаган темп"],
    ),
    itinerary: itinerary([
      {
        days: 1,
        title: l("Bishkek → Chon-Kemin", "Бишкек → Чон-Кемин", "Бишкек → Чоң-Кемин"),
        description: l("Short drive to the green Chon-Kemin valley.", "Короткая дорога в зелёную долину Чон-Кемин.", "Жашыл Чоң-Кемин өрөөнүнө кыска жол."),
        overnight: l("Chon-Kemin yurt camp", "Юртовый лагерь в Чон-Кемине", "Чоң-Кеминдеги боз үй лагери"),
      },
      {
        days: 5,
        title: l("Around Issyk-Kul", "Вокруг Иссык-Куля", "Ысык-Көлдү айлануу"),
        description: l(
          "South shore, Skazka canyon, eagle hunters, Jeti-Oguz and lake swims.",
          "Южный берег, каньон Сказка, беркутчи, Джеты-Огуз и купание в озере.",
          "Түштүк жээк, Жомок капчыгайы, бүркүтчүлөр, Жети-Өгүз жана көлдө сууга түшүү.",
        ),
        overnight: l("Issyk-Kul yurt camps", "Юртовые лагеря на Иссык-Куле", "Ысык-Көлдөгү боз үй лагерлери"),
      },
      {
        days: 1,
        title: l("Issyk-Kul → Kochkor", "Иссык-Куль → Кочкор", "Ысык-Көл → Кочкор"),
        description: l("Drive to Kochkor; felt workshop visit.", "Дорога в Кочкор, мастерская войлока.", "Кочкорго жол, кийиз устаканасы."),
        overnight: l("Yurt camp near Kochkor", "Юртовый лагерь возле Кочкора", "Кочкордун жанындагы боз үй лагери"),
      },
      {
        days: 4,
        title: l("Song-Kul", "Сон-Куль", "Соң-Көл"),
        description: l("Riding, herder life and night skies at the high lake.", "Верховая езда, жизнь пастухов и звёздное небо на высокогорном озере.", "Бийик тоолуу көлдө ат минүү, малчылардын турмушу жана түнкү асман."),
        overnight: l("Song-Kul yurt camp", "Юртовый лагерь на Сон-Куле", "Соң-Көлдөгү боз үй лагери"),
      },
      {
        days: 2,
        title: l("Song-Kul → Naryn → At-Bashy", "Сон-Куль → Нарын → Ат-Башы", "Соң-Көл → Нарын → Ат-Башы"),
        description: l("Drive south with stops in Naryn.", "Дорога на юг с остановками в Нарыне.", "Нарында токтоп, түштүккө жол."),
        overnight: l("Yurt camp near At-Bashy", "Юртовый лагерь возле Ат-Башы", "Ат-Башынын жанындагы боз үй лагери"),
      },
      {
        days: 5,
        title: l("Kel-Suu", "Кель-Суу", "Көл-Суу"),
        description: l(
          "Reach the lake by horse or on foot; boat trips and walks among the cliffs.",
          "До озера верхом или пешком; прогулки на лодке и среди скал.",
          "Көлгө ат менен же жөө жетүү; кайыкта сейилдөө жана аскалар арасында басуу.",
        ),
        overnight: l("Kel-Suu yurt camp", "Юртовый лагерь на Кель-Суу", "Көл-Суудагы боз үй лагери"),
      },
      {
        days: 2,
        title: l("Tash-Rabat", "Таш-Рабат", "Таш-Рабат"),
        description: l("The Silk Road caravanserai and its valley.", "Караван-сарай Шёлкового пути и его долина.", "Жибек жолунун кербен сарайы жана анын өрөөнү."),
        overnight: l("Tash-Rabat yurt camp", "Юртовый лагерь у Таш-Рабата", "Таш-Рабаттагы боз үй лагери"),
      },
      {
        days: 1,
        title: l("Tash-Rabat → Bishkek", "Таш-Рабат → Бишкек", "Таш-Рабат → Бишкек"),
        description: l("Return drive north.", "Дорога обратно на север.", "Түндүккө кайтуу жолу."),
        overnight: dash,
      },
    ]),
    capacity: 8,
  },
];

const path = process.env.DATABASE_PATH ?? "data/nomadtrip.db";
const db = createDb(path);
migrate(db, { migrationsFolder: "drizzle" });

const start = new Date().toISOString().slice(0, 10);
const existing = new Set(db.select({ slug: trips.slug }).from(trips).all().map((t) => t.slug));
const fresh = catalog.filter((t) => !existing.has(t.slug));
if (fresh.length === 0) {
  console.log(`Database at ${path} already has all ${catalog.length} catalog trips — nothing to seed.`);
} else {
  db.transaction((tx) => {
    for (const { capacity, ...trip } of fresh) {
      const { id } = tx.insert(trips).values({ ...trip, durationDays: trip.itinerary.en.length }).returning().get();
      const starts = seasonDepartures(start, trip.itinerary.en.length);
      tx.insert(departures).values(starts.map((startDate) => ({ tripId: id, startDate, capacity }))).run();
    }
  });
  console.log(`Seeded ${fresh.length} new trip(s) into ${path}.`);
}
