import { describe, it, expect, afterEach, vi } from "vitest";
import { notifySupported, requestNotifyPermission, notifyReady } from "./notify";

afterEach(() => {
  delete (window as unknown as { Notification?: unknown }).Notification;
});

describe("notify (Brief v15 item 1) — feature-detected, safe under jsdom", () => {
  it("reports unsupported and no-ops when Notification is absent", async () => {
    expect(notifySupported()).toBe(false);
    await expect(requestNotifyPermission()).resolves.toBe(false);
    expect(() => notifyReady("Rice is ready")).not.toThrow();
  });

  it("constructs a notification when permission is granted", () => {
    const ctor = vi.fn();
    class StubNotification {
      static permission = "granted";
      static requestPermission = vi.fn().mockResolvedValue("granted");
      constructor(title: string, opts?: unknown) { ctor(title, opts); }
    }
    (window as unknown as { Notification: unknown }).Notification = StubNotification;

    expect(notifySupported()).toBe(true);
    notifyReady("Rice is ready", "kuzhambu rice");
    expect(ctor).toHaveBeenCalledWith("Rice is ready", { body: "kuzhambu rice" });
  });

  it("does not notify when permission is not granted", () => {
    const ctor = vi.fn();
    class StubNotification {
      static permission = "default";
      constructor(title: string) { ctor(title); }
    }
    (window as unknown as { Notification: unknown }).Notification = StubNotification;
    notifyReady("Rice is ready");
    expect(ctor).not.toHaveBeenCalled();
  });
});
