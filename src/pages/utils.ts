import * as firebase from 'firebase/app';

export const getTimeOffsetFromDatabaseAsync = async (
  database: firebase.database.Database
): Promise<number> => {
  return (await database.ref('.info/serverTimeOffset').once('value')).val();
};

export const generatePermanentLinkFromRoomKey = (roomKey: string): string => {
  const url = new URL(window.location.href);
  url.searchParams.set('room_key', roomKey);
  return url.href;
};
