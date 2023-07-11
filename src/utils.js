/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

export function getIncubatorName(name) {
  return `${name} [INCUBATOR]`;
}

// since v17.3.0, yargs is preserving inner quotes so we need to strip
// them again from argument values where they were added
// see https://github.com/yargs/yargs-parser/pull/407
export function stripQuotes(value) {
  const isArray = Array.isArray(value);
  const newValues = (isArray ? value : [value]).map((v) => {
    if (!v) return undefined;
    const match = /^"(.*)"$/.exec(v);
    return match ? match[1] : v;
  });
  return isArray ? newValues : newValues[0];
}
