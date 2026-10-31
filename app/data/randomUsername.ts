const ADJECTIVES = [
  "Bold",
  "Brave",
  "Bright",
  "Calm",
  "Clever",
  "Curious",
  "Eager",
  "Gentle",
  "Happy",
  "Kind",
  "Lively",
  "Lucky",
  "Merry",
  "Nimble",
  "Quick",
  "Quiet",
  "Sharp",
  "Steady",
  "Swift",
  "Witty",
];

const ANIMALS = [
  "Badger",
  "Beaver",
  "Falcon",
  "Fox",
  "Gecko",
  "Heron",
  "Koala",
  "Lynx",
  "Otter",
  "Owl",
  "Panda",
  "Penguin",
  "Puffin",
  "Rabbit",
  "Raven",
  "Seal",
  "Sparrow",
  "Tiger",
  "Turtle",
  "Wolf",
];

const pick = (words: readonly string[]) =>
  words[Math.floor(Math.random() * words.length)];

export const getRandomUsername = () => `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
