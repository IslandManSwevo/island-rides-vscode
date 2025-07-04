export function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  );
}

export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function transformKeys(obj: any, transform: (key: string) => string): any {
  if (Array.isArray(obj)) {
    return obj.map(v => transformKeys(v, transform));
  }
  
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((result, key) => {
      const value = obj[key];
      const newKey = transform(key);
      result[newKey] = transformKeys(value, transform);
      return result;
    }, {} as any);
  }
  
  return obj;
}

export function transformToCamelCase(data: any): any {
  return transformKeys(data, toCamelCase);
}

export function transformToSnakeCase(data: any): any {
  return transformKeys(data, toSnakeCase);
}
