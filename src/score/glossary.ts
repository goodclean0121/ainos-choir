export interface GlossaryEntry {
  id: string;
  /** How it looks on the score. */
  symbol: string;
  name: string;
  /** One short line in plain Korean. */
  meaning: string;
  match: (el: Element) => boolean;
}

const tag = (el: Element) => el.tagName;
const dynamic = (name: string) => (el: Element) => tag(el) === name && el.parentElement?.tagName === "dynamics";
const words = (re: RegExp) => (el: Element) => tag(el) === "words" && re.test(el.textContent ?? "");
const element = (name: string) => (el: Element) => tag(el) === name;
const sound = (attr: string) => (el: Element) => tag(el) === "sound" && el.hasAttribute(attr);
const any =
  (...tests: ((el: Element) => boolean)[]) =>
  (el: Element) =>
    tests.some((t) => t(el));

const dyn = (id: string, name: string, meaning: string): GlossaryEntry => ({
  id, symbol: id, name, meaning, match: dynamic(id),
});
const tempo = (word: string, name: string, meaning: string): GlossaryEntry => ({
  id: word.toLowerCase(), symbol: word, name, meaning, match: words(new RegExp(`\\b${word}\\b`, "i")),
});

export const GLOSSARY: GlossaryEntry[] = [
  dyn("ppp", "피아니시시모", "아주아주 여리게, 속삭이듯이"),
  dyn("pp", "피아니시모", "아주 여리게"),
  dyn("p", "피아노", "여리게"),
  dyn("mp", "메조 피아노", "조금 여리게"),
  dyn("mf", "메조 포르테", "조금 세게, 보통 목소리보다 약간 크게"),
  dyn("f", "포르테", "세게"),
  dyn("ff", "포르티시모", "아주 세게"),
  dyn("fff", "포르티시시모", "있는 힘껏 아주아주 세게"),
  dyn("sf", "스포르찬도", "그 음만 갑자기 세게"),
  dyn("sfz", "스포르찬도", "그 음만 갑자기 세게"),
  dyn("fp", "포르테 피아노", "세게 시작하고 곧바로 여리게"),
  {
    id: "crescendo", symbol: "<", name: "크레셴도",
    meaning: "점점 세게 (벌어지는 꺾쇠 모양)",
    match: (el) => tag(el) === "wedge" && el.getAttribute("type") === "crescendo",
  },
  {
    id: "diminuendo", symbol: ">", name: "디크레셴도",
    meaning: "점점 여리게 (모이는 꺾쇠 모양)",
    match: (el) => tag(el) === "wedge" && el.getAttribute("type") === "diminuendo",
  },
  { id: "cresc", symbol: "cresc.", name: "크레셴도", meaning: "점점 세게", match: words(/\bcresc/i) },
  { id: "dim", symbol: "dim.", name: "디미누엔도", meaning: "점점 여리게", match: words(/\b(dim(\.|inuendo)?|decresc\w*\.?)(?![a-z])/i) },
  { id: "rit", symbol: "rit.", name: "리타르단도", meaning: "점점 느리게", match: words(/\brit(\.|ard\.?|ardando|enuto)?(?![a-z])/i) },
  { id: "rall", symbol: "rall.", name: "랄렌탄도", meaning: "점점 느리게 (rit.와 같아요)", match: words(/\brall/i) },
  { id: "accel", symbol: "accel.", name: "아첼레란도", meaning: "점점 빠르게", match: words(/\baccel/i) },
  { id: "a-tempo", symbol: "a tempo", name: "아 템포", meaning: "원래 빠르기로 돌아가기", match: words(/\ba tempo\b/i) },
  { id: "molto", symbol: "molto", name: "몰토", meaning: "매우 (뒤에 오는 말을 더 강하게)", match: words(/\bmolto\b/i) },
  { id: "poco", symbol: "poco", name: "포코", meaning: "조금 (뒤에 오는 말을 살짝만)", match: words(/\bpoco\b/i) },
  { id: "subito", symbol: "subito", name: "수비토", meaning: "갑자기", match: words(/\bsub(ito\b|\.)/i) },
  { id: "fermata", symbol: "𝄐", name: "페르마타", meaning: "그 음을 지휘자가 끊을 때까지 충분히 길게", match: element("fermata") },
  { id: "staccato", symbol: "·", name: "스타카토", meaning: "짧게 끊어서", match: element("staccato") },
  { id: "accent", symbol: ">", name: "악센트", meaning: "그 음을 힘주어 강하게", match: any(element("accent"), element("strong-accent")) },
  { id: "tenuto", symbol: "–", name: "테누토", meaning: "그 음의 길이를 꽉 채워 충분히", match: element("tenuto") },
  { id: "breath", symbol: "’", name: "숨표", meaning: "여기서 숨을 쉬세요", match: any(element("breath-mark"), element("caesura")) },
  { id: "repeat", symbol: "𝄇", name: "도돌이표", meaning: "점 두 개가 있는 곳으로 돌아가 한 번 더", match: element("repeat") },
  { id: "ending", symbol: "1. 2.", name: "1·2번 괄호", meaning: "처음엔 1번 괄호, 돌아와서는 1번을 건너뛰고 2번으로", match: element("ending") },
  { id: "dc", symbol: "D.C.", name: "다 카포", meaning: "곡의 맨 처음으로 돌아가기", match: any(words(/\bD\.\s?C\.|\bda capo\b/i), sound("dacapo")) },
  { id: "ds", symbol: "D.S.", name: "달 세뇨", meaning: "세뇨(𝄋) 표시로 돌아가기", match: any(words(/\bD\.\s?S\.|\bdal segno\b/i), sound("dalsegno")) },
  { id: "segno", symbol: "𝄋", name: "세뇨", meaning: "D.S.를 만나면 돌아올 자리", match: element("segno") },
  { id: "coda", symbol: "𝄌", name: "코다", meaning: "마무리 부분으로 건너뛰는 표시", match: any(element("coda"), words(/\bcoda\b/i)) },
  { id: "fine", symbol: "Fine", name: "피네", meaning: "돌아와서 부를 때 여기서 끝", match: any(words(/\bfine\b/i), sound("fine")) },
  {
    id: "tie", symbol: "⁀", name: "붙임줄", meaning: "같은 높이 두 음을 이어서 한 음처럼 길게",
    match: (el) => tag(el) === "tied" && el.getAttribute("type") === "start",
  },
  {
    id: "slur", symbol: "⌒", name: "이음줄", meaning: "다른 높이 음들을 끊지 말고 부드럽게",
    match: (el) => tag(el) === "slur" && el.getAttribute("type") === "start",
  },
  tempo("Largo", "라르고", "아주 느리고 폭넓게"),
  tempo("Adagio", "아다지오", "느리게"),
  tempo("Andante", "안단테", "걷는 빠르기로"),
  tempo("Moderato", "모데라토", "보통 빠르기로"),
  tempo("Allegro", "알레그로", "빠르게"),
  tempo("Presto", "프레스토", "아주 빠르게"),
];

/** The glossary entries a score uses, in the order they first appear. */
export function findMarkings(xml: string): GlossaryEntry[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const found: GlossaryEntry[] = [];
  for (const el of Array.from(doc.getElementsByTagName("*"))) {
    const text = tag(el) === "words" ? el.textContent ?? "" : "";
    // Several terms can share one <words> ("molto rit."): order them by where they appear in the text.
    const hits = GLOSSARY.filter((e) => !found.includes(e) && e.match(el));
    if (text) hits.sort((a, b) => position(text, a) - position(text, b));
    found.push(...hits);
  }
  return found;
}

function position(text: string, entry: GlossaryEntry): number {
  const i = text.toLowerCase().indexOf(entry.symbol.toLowerCase().replace(/\.$/, ""));
  return i < 0 ? text.length : i;
}
