
const card2component = {
  one: '1',
  two: '2',
};

export type CardChoice = keyof typeof card2component;

export interface Member {
  last_seen_at: number;
  joined_at: number;
  display_name: string;
  card_choice?: CardChoice;
}

export interface Room {
  last_seen_at: number;
  name: string;
  members?: {[key in string]: Member};
}
