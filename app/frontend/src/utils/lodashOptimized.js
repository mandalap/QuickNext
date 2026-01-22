// Optimized lodash imports - only import what we need
// This reduces bundle size significantly compared to importing the entire lodash library

// Instead of: import _ from 'lodash'
// Use specific imports like:

// Array utilities
export { default as chunk } from 'lodash/chunk';
export { default as compact } from 'lodash/compact';
export { default as difference } from 'lodash/difference';
export { default as flatten } from 'lodash/flatten';
export { default as groupBy } from 'lodash/groupBy';
export { default as uniq } from 'lodash/uniq';
export { default as uniqBy } from 'lodash/uniqBy';

// Object utilities
export { default as cloneDeep } from 'lodash/cloneDeep';
export { default as get } from 'lodash/get';
export { default as merge } from 'lodash/merge';
export { default as omit } from 'lodash/omit';
export { default as pick } from 'lodash/pick';
export { default as set } from 'lodash/set';

// Function utilities
export { default as debounce } from 'lodash/debounce';
export { default as throttle } from 'lodash/throttle';

// String utilities
export { default as camelCase } from 'lodash/camelCase';
export { default as kebabCase } from 'lodash/kebabCase';
export { default as snakeCase } from 'lodash/snakeCase';
export { default as startCase } from 'lodash/startCase';

// Number utilities
export { default as clamp } from 'lodash/clamp';
export { default as random } from 'lodash/random';

// Collection utilities
export { default as filter } from 'lodash/filter';
export { default as find } from 'lodash/find';
export { default as map } from 'lodash/map';
export { default as orderBy } from 'lodash/orderBy';
export { default as reduce } from 'lodash/reduce';
export { default as sortBy } from 'lodash/sortBy';

// Date utilities (if needed, prefer dayjs)
export { default as isDate } from 'lodash/isDate';

// Type checking utilities
export { default as isArray } from 'lodash/isArray';
export { default as isEmpty } from 'lodash/isEmpty';
export { default as isFunction } from 'lodash/isFunction';
export { default as isNumber } from 'lodash/isNumber';
export { default as isObject } from 'lodash/isObject';
export { default as isString } from 'lodash/isString';

// Example usage:
// import { get, debounce, groupBy } from '../utils/lodashOptimized';
// const value = get(obj, 'path.to.value', 'default');
// const debouncedFn = debounce(fn, 300);
// const grouped = groupBy(array, 'category');
