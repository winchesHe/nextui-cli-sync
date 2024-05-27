import type {UpgradeOption} from './upgrade';

import {readFileSync} from 'node:fs';

import {type NextUIComponents} from 'src/constants/component';
import {NEXT_UI} from 'src/constants/required';
import {store} from 'src/constants/store';
import {getCacheExecData} from 'src/scripts/cache/cache';
import {getLatestVersion} from 'src/scripts/helpers';

import {Logger} from './logger';
import {colorMatchRegex} from './output-info';
import {getVersionAndMode} from './utils';

/**
 * Get the package information
 * @param packagePath string
 * @param transformVersion boolean
 */
export function getPackageInfo(packagePath: string, transformVersion = true) {
  let pkg;

  try {
    pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
  } catch (error) {
    Logger.prefix('error', `Error reading package.json file: ${packagePath} \nError: ${error}`);
  }

  const devDependencies = pkg.devDependencies || {};
  const dependencies = pkg.dependencies || {};
  const allDependencies = {...devDependencies, ...dependencies};
  const allDependenciesKeys = new Set(Object.keys(allDependencies));

  const currentComponents = (store.nextUIComponents as unknown as NextUIComponents)
    .map((component) => {
      let version = component.version;
      let versionMode = component.versionMode;

      if (allDependenciesKeys.has(component.package)) {
        const data = getVersionAndMode(allDependencies, component.package);

        version = transformVersion ? `${data.currentVersion} new: ${version}` : data.currentVersion;
        versionMode = data.versionMode;
      }

      return {
        ...component,
        version,
        versionMode
      };
    })
    .filter((component) => allDependenciesKeys.has(component.package)) as NextUIComponents;
  const isAllComponents = allDependenciesKeys.has(NEXT_UI);

  return {
    allDependencies,
    allDependenciesKeys,
    currentComponents,
    dependencies,
    devDependencies,
    isAllComponents,
    package: pkg
  };
}

export function transformComponentsToPackage(components: string[]) {
  return components.map((component) => {
    const nextuiComponent = store.nextUIComponentsMap[component];
    const packageName = nextuiComponent?.package;

    return packageName ? packageName : component;
  });
}

/**
 * Get the package detail information
 * @param components need package name
 * @param allDependencies
 * @returns
 */
export async function transformPackageDetail(
  components: string[],
  allDependencies: Record<string, string>,
  transformVersion = true
): Promise<NextUIComponents> {
  const result: NextUIComponents = [];

  for (const component of components) {
    let {currentVersion} = getVersionAndMode(allDependencies, component);
    const {versionMode} = getVersionAndMode(allDependencies, component);
    const docs = (
      ((await getCacheExecData(`npm show ${component} homepage`)) || '') as string
    ).replace(/\n/, '');
    const description = (
      ((await getCacheExecData(`npm show ${component} description`)) || '') as string
    ).replace(/\n/, '');
    const latestVersion =
      store.nextUIComponentsPackageMap[component]?.version || (await getLatestVersion(component));

    currentVersion = transformVersion ? `${currentVersion} new: ${latestVersion}` : currentVersion;

    const detailPackageInfo: NextUIComponents[0] = {
      description: description || '',
      docs: docs || '',
      name: component,
      package: component,
      peerDependencies: {},
      status: 'stable',
      style: '',
      version: currentVersion,
      versionMode: versionMode
    };

    result.push(detailPackageInfo);
  }

  return result;
}

/**
 * Get the complete version
 * @example getCompleteVersion({latestVersion: '1.0.0', versionMode: '^'}) --> '^1.0.0'
 */
export function getCompleteVersion(upgradeOption: UpgradeOption) {
  return `${upgradeOption.versionMode || ''}${upgradeOption.latestVersion.replace(
    colorMatchRegex,
    ''
  )}`;
}
