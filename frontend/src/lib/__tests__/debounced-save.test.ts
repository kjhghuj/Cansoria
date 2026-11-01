import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import { createDebouncedSaver } from "@/lib/debounced-save";

describe("createDebouncedSaver", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it("coalesces rapid changes into one write with the newest value", async () => {
    const write = jest.fn(async () => {});
    const save = createDebouncedSaver(write, 500);
    save.schedule(["a"]);
    jest.advanceTimersByTime(200);
    save.schedule(["a", "b"]);
    jest.advanceTimersByTime(200);
    save.schedule(["a", "b", "c"]);
    expect(write).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(["a", "b", "c"]);
  });

  it("keeps the pending write when nothing else interferes before the delay", () => {
    const write = jest.fn(async () => {});
    const save = createDebouncedSaver(write, 500);
    save.schedule(["a"]);
    // An unrelated render/dep change must not be able to cancel the save:
    // there is no effect cleanup between schedule and the deadline.
    jest.advanceTimersByTime(499);
    expect(write).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("flush() writes the pending value immediately", () => {
    const write = jest.fn(async () => {});
    const save = createDebouncedSaver(write, 500);
    save.schedule(["a"]);
    save.flush();
    expect(write).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledWith(["a"]);
    jest.advanceTimersByTime(1000);
    expect(write).toHaveBeenCalledTimes(1);
  });

  it("flush() after a failed write still retries the kept value", async () => {
    let fail = true;
    const write = jest.fn(async () => {
      if (fail) throw new Error("offline");
    });
    const save = createDebouncedSaver(write, 500);
    save.schedule(["a"]);
    await jest.advanceTimersByTimeAsync(500);
    expect(write).toHaveBeenCalledTimes(1);
    // The value stays pending for the next change/flush to retry.
    fail = false;
    save.flush();
    expect(write).toHaveBeenCalledTimes(2);
    expect(write).toHaveBeenLastCalledWith(["a"]);
  });

  it("a newer schedule wins over a failed write's retry copy", async () => {
    const write = jest.fn(async () => {
      throw new Error("offline");
    });    const save = createDebouncedSaver(write, 500);
    save.schedule(["old"]);
    await jest.advanceTimersByTimeAsync(500);
    save.schedule(["new"]);
    await jest.advanceTimersByTimeAsync(500);
    expect(write).toHaveBeenLastCalledWith(["new"]);
  });

  it("discard() drops the pending value so nothing is written later", () => {
    const write = jest.fn(async () => {});
    const save = createDebouncedSaver(write, 500);
    save.schedule(["a"]);
    save.discard();
    jest.advanceTimersByTime(2000);
    save.flush();
    expect(write).not.toHaveBeenCalled();
  });
});
