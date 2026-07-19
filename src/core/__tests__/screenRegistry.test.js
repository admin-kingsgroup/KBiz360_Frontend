// Guard for the stable screen-number registry (src/core/screenRegistry.json),
// mirroring routeManifest's drift guard. Numbers back the top-right "SCREEN #n"
// badge, so they must be COMPLETE (every renderable route numbered), UNIQUE, and
// STABLE (regenerating from the committed file never renumbers). If this fails,
// run `npm run gen` and commit the updated screenRegistry.json.
import gen from '../../../scripts/gen-route-manifest.cjs';
import registry from '../screenRegistry.json';

const { manifest, buildRegistry } = gen;
const routes = manifest().routes;
const active = registry.screens || {};
const retired = registry.retired || {};

describe('screen-number registry', () => {
  test('every renderable route has a number', () => {
    const missing = routes.filter((r) => active[r] == null);
    expect(missing).toEqual([]);
  });

  test('numbers are positive integers', () => {
    for (const n of Object.values(active)) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThan(0);
    }
  });

  test('no number is reused (unique across active + retired)', () => {
    const nums = [...Object.values(active), ...Object.values(retired)];
    expect(new Set(nums).size).toBe(nums.length);
  });

  test('`next` is beyond every assigned number', () => {
    const max = Math.max(0, ...Object.values(active), ...Object.values(retired));
    expect(registry.next).toBeGreaterThan(max);
  });

  test('committed registry is neither stale nor renumbering (regen is a no-op)', () => {
    const rebuilt = buildRegistry(registry, routes);
    expect(rebuilt.screens).toEqual(active);
    expect(rebuilt.retired).toEqual(retired);
  });
});
