

export function prettyPrint(obj: any) {
  if (typeof obj !== 'object') {
    console.log(obj);
  } else {
    console.log(JSON.stringify(obj, (key, value) => {
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }, 2));
  }
}