export const getRandomString = (array: string[] ) => {
  return array[Math.floor(Math.random() * array.length)];
};
