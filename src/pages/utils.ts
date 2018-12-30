import * as firebase from 'firebase/app';

export const getTimeOffsetFromDatabaseAsync = async (
  database: firebase.database.Database
): Promise<number> => {
  return (await database.ref('.info/serverTimeOffset').once('value')).val();
};
