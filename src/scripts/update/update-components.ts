import {initCache} from '../cache/cache';
import {isGithubAction, updateComponents} from '../helpers';

if (!isGithubAction) {
  // Won't run on GitHub Actions
  initCache(true);
  updateComponents();
}
