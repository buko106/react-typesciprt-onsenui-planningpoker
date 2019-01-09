export const card2component = {
  zero: '0',
  half: '1/2',
  one: '1',
  two: '2',
  three: '3',
  five: '5',
  eight: '8',
  question_mark: '?',
};

export type CardChoice = keyof typeof card2component;
export const CARD_CHOICES = Object.keys(card2component) as CardChoice[];

export interface Member {
  last_seen_at: number;
  joined_at: number;
  display_name: string;
  card_choice: CardChoice;
}

export interface Room {
  last_seen_at: number;
  name: string;
  members?: { [key in string]: Member };
}
