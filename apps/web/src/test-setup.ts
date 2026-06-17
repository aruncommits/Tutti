// Registers jest-dom matchers (toBeInTheDocument, etc.) and tears down the DOM between tests
// so renders don't accumulate (no auto-cleanup without globals).
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());
