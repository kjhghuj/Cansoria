// Runs actual component handlers with a small, deterministic hook scheduler.
// This fixture is not a DOM renderer; HTTP boundary checks are recorded separately.
import type { DependencyList, EffectCallback, SetStateAction } from "react";

type Effect = { deps?: DependencyList; cleanup?: () => void };
let active: ReturnType<typeof createHookHarness>;
export function createHookHarness<T>(component: () => T) {
  const slots: unknown[] = [], effects = new Map<number, Effect>();
  let cursor = 0, dirty = true, output: T;
  const pending: (() => void)[] = [];
  const harness = {
    state<S>(initial: S | (() => S)): [S, (value: SetStateAction<S>) => void] {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === "function" ? (initial as () => S)() : initial;
      return [slots[index] as S, value => { slots[index] = typeof value === "function" ? (value as (old: S) => S)(slots[index] as S) : value; dirty = true; }];
    },
    ref<S>(initial: S): { current: S } {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index] as { current: S };
    },
    memo<F>(value: F, deps: DependencyList): F {
      const index = cursor++, previous = slots[index] as { value: F; deps: DependencyList } | undefined;
      if (previous && deps.length === previous.deps.length && deps.every((d, i) => Object.is(d, previous.deps[i]))) return previous.value;
      slots[index] = { value, deps }; return value;
    },
    effect(callback: EffectCallback, deps?: DependencyList) {
      const index = cursor++, previous = effects.get(index);
      if (previous && deps && previous.deps?.length === deps.length && deps.every((d, i) => Object.is(d, previous.deps![i]))) return;
      pending.push(() => {
        previous?.cleanup?.();
        const cleanup = callback();
        effects.set(index, { deps, cleanup: typeof cleanup === "function" ? cleanup : undefined });
      });
    },
    render() { active = harness; cursor = 0; dirty = false; output = component(); return output; },
    async flush() {
      for (let turn = 0; turn < 20; turn++) {
        if (dirty) harness.render();
        while (pending.length) pending.shift()!();
        await Promise.resolve();
      }
      return output;
    },
    unmount() { for (const effect of effects.values()) effect.cleanup?.(); },
  };
  return harness;
}
export const hookMocks = {
  useState: <S,>(initial: S | (() => S)) => active.state(initial),
  useRef: <S,>(initial: S) => active.ref(initial),
  useEffect: (effect: EffectCallback, deps?: DependencyList) => active.effect(effect, deps),
  useCallback: <T,>(fn: T, deps: DependencyList) => active.memo(fn, deps),
};
