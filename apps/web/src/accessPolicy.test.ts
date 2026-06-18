import { describe, it, expect } from "vitest";
import { isLoopback, allowRequest } from "../server/accessPolicy";

describe("dev AI endpoint access policy (Brief v40)", () => {
  it("recognises loopback addresses", () => {
    expect(isLoopback("127.0.0.1")).toBe(true);
    expect(isLoopback("::1")).toBe(true);
    expect(isLoopback("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopback("192.168.1.50")).toBe(false);
    expect(isLoopback(undefined)).toBe(false);
  });

  it("always allows loopback, regardless of LAN/token settings", () => {
    expect(allowRequest({ remoteAddr: "127.0.0.1", allowLan: false }).ok).toBe(true);
    expect(allowRequest({ remoteAddr: "::1", allowLan: false, expectedToken: "x" }).ok).toBe(true);
  });

  it("denies a LAN request with 403 by default (secure-by-default)", () => {
    const r = allowRequest({ remoteAddr: "192.168.1.50", allowLan: false });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(403);
  });

  it("allows a LAN request when opted in and no token is required", () => {
    expect(allowRequest({ remoteAddr: "10.0.0.4", allowLan: true }).ok).toBe(true);
  });

  it("requires the matching dev token for LAN when one is configured", () => {
    expect(allowRequest({ remoteAddr: "10.0.0.4", allowLan: true, expectedToken: "s3cret" }).ok).toBe(false);
    expect(allowRequest({ remoteAddr: "10.0.0.4", allowLan: true, token: "nope", expectedToken: "s3cret" }).status).toBe(403);
    expect(allowRequest({ remoteAddr: "10.0.0.4", allowLan: true, token: "s3cret", expectedToken: "s3cret" }).ok).toBe(true);
  });
});
