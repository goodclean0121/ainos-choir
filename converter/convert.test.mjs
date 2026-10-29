import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { convert, CONVERT_TIMEOUT_MS } from "./convert.mjs";
import { createConverterServer } from "./server.mjs";

function fakeRun(onCall) {
  const calls = [];
  const run = async (cmd, args, opts) => {
    calls.push({ cmd, args, opts });
    await onCall?.(cmd, args, opts);
    return { stdout: "" };
  };
  return { run, calls };
}

test("MuseScore and MIDI files go through the MuseScore command line", async () => {
  for (const format of ["musescore", "midi"]) {
    const { run, calls } = fakeRun((cmd, args) => writeFileSync(args[1], "<score-partwise/>"));
    const result = await convert("/in/song.mscz", format, run);
    assert.equal(calls[0].cmd, "mscore");
    assert.equal(calls[0].args[0], "-o");
    assert.match(calls[0].args[1], /out\.musicxml$/);
    assert.equal(calls[0].args[2], "/in/song.mscz");
    assert.equal(calls[0].opts.timeout, CONVERT_TIMEOUT_MS);
    assert.equal(calls[0].opts.env.QT_QPA_PLATFORM, "offscreen");
    assert.equal(result.experimental, false);
    assert.equal(readFileSync(result.xmlPath, "utf8"), "<score-partwise/>");
  }
});

test("PDF and images go through Audiveris and are marked experimental", async () => {
  for (const format of ["pdf", "image"]) {
    const { run, calls } = fakeRun((cmd, args) => {
      const outDir = args[args.indexOf("-output") + 1];
      mkdirSync(join(outDir, "song"), { recursive: true });
      writeFileSync(join(outDir, "song", "song.mxl"), "PK");
    });
    const result = await convert("/in/song.pdf", format, run);
    assert.equal(calls[0].cmd, "audiveris");
    assert.deepEqual(calls[0].args.slice(0, 3), ["-batch", "-export", "-output"]);
    assert.equal(calls[0].args.at(-1), "/in/song.pdf");
    assert.match(result.xmlPath, /song\.mxl$/);
    assert.equal(result.experimental, true);
  }
});

test("a failing converter reports a plain error", async () => {
  const run = async () => {
    throw Object.assign(new Error("exit 1"), { code: 1 });
  };
  await assert.rejects(convert("/in/a.mscz", "musescore", run), { message: "변환에 실패했어요" });
});

test("a converter that runs past the time limit reports a timeout", async () => {
  assert.equal(CONVERT_TIMEOUT_MS, 600_000);
  const run = async () => {
    throw Object.assign(new Error("killed"), { killed: true, signal: "SIGTERM" });
  };
  await assert.rejects(convert("/in/a.pdf", "pdf", run), { message: "변환 시간이 너무 오래 걸려요" });
});

test("Audiveris finishing without a score is a failure", async () => {
  const { run } = fakeRun();
  await assert.rejects(convert("/in/a.pdf", "pdf", run), { message: "변환에 실패했어요" });
});

async function withServer(options, fn) {
  const server = createConverterServer(options);
  await new Promise((r) => server.listen(0, r));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(url);
  } finally {
    server.close();
  }
}

test("server returns the converted MusicXML with the experimental flag", async () => {
  const convertFn = async (path, format) => {
    const out = path + ".out.mxl";
    writeFileSync(out, "PK-converted");
    return { xmlPath: out, experimental: format === "pdf" };
  };
  await withServer({ convertFn }, async (url) => {
    const res = await fetch(`${url}/convert`, {
      method: "POST",
      headers: { "x-filename": encodeURIComponent("악보 1.pdf") },
      body: "%PDF-1.7",
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-experimental"), "1");
    assert.equal(res.headers.get("access-control-expose-headers"), "x-experimental");
    assert.equal(await res.text(), "PK-converted");
  });
});

test("server rejects unknown formats and oversized uploads", async () => {
  await withServer({ convertFn: async () => assert.fail("should not convert"), maxBytes: 10 }, async (url) => {
    const bad = await fetch(`${url}/convert`, { method: "POST", headers: { "x-filename": "a.txt" }, body: "x" });
    assert.equal(bad.status, 400);
    assert.match((await bad.json()).error, /지원하지 않는/);
    const big = await fetch(`${url}/convert`, { method: "POST", headers: { "x-filename": "a.pdf" }, body: "x".repeat(11) });
    assert.equal(big.status, 413);
  });
});

test("server reports conversion errors as 500 with the message", async () => {
  const convertFn = async () => {
    throw new Error("변환에 실패했어요");
  };
  await withServer({ convertFn }, async (url) => {
    const res = await fetch(`${url}/convert`, { method: "POST", headers: { "x-filename": "a.mscz" }, body: "PK" });
    assert.equal(res.status, 500);
    assert.equal((await res.json()).error, "변환에 실패했어요");
  });
});

test("health check and CORS preflight", async () => {
  await withServer({ convertFn: async () => ({}) }, async (url) => {
    assert.equal((await fetch(`${url}/health`)).status, 200);
    const pre = await fetch(`${url}/convert`, { method: "OPTIONS" });
    assert.equal(pre.status, 204);
    assert.match(pre.headers.get("access-control-allow-headers"), /x-filename/);
  });
});

test("a missing converter program is reported as a setup problem", async () => {
  const run = async () => {
    throw Object.assign(new Error("spawn audiveris ENOENT"), { code: "ENOENT" });
  };
  await assert.rejects(convert("/in/a.pdf", "pdf", run), { message: "변환 프로그램이 서버에 설치되어 있지 않아요" });
});

test("a malformed file name header gets a 400 instead of crashing the server", async () => {
  await withServer({ convertFn: async () => assert.fail("should not convert") }, async (url) => {
    const res = await fetch(`${url}/convert`, { method: "POST", headers: { "x-filename": "%E0%A4%A.pdf" }, body: "x" });
    assert.equal(res.status, 400);
    assert.equal((await fetch(`${url}/health`)).status, 200);
  });
});

test("temporary upload and output folders are removed after each conversion", async () => {
  const { existsSync } = await import("node:fs");
  const seen = [];
  const convertFn = async (path) => {
    const out = path + ".out.musicxml";
    writeFileSync(out, "<score-partwise/>");
    seen.push(path);
    return { xmlPath: out, experimental: false, cleanup: () => seen.push("cleaned") };
  };
  await withServer({ convertFn }, async (url) => {
    const res = await fetch(`${url}/convert`, { method: "POST", headers: { "x-filename": "a.mscz" }, body: "PK" });
    assert.equal(res.status, 200);
    await res.text();
  });
  assert.equal(existsSync(seen[0]), false);
  assert.equal(seen[1], "cleaned");
});

test("convert offers a cleanup that deletes its output folder", async () => {
  const { existsSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  const { run } = fakeRun((cmd, args) => writeFileSync(args[1], "<score-partwise/>"));
  const result = await convert("/in/song.mscz", "musescore", run);
  result.cleanup();
  assert.equal(existsSync(dirname(result.xmlPath)), false);
});

test("too many conversions at once are turned away with a retry message", async () => {
  let release;
  const gate = new Promise((r) => (release = r));
  const convertFn = async (path) => {
    await gate;
    const out = path + ".out.musicxml";
    writeFileSync(out, "<score-partwise/>");
    return { xmlPath: out, experimental: false };
  };
  await withServer({ convertFn, maxJobs: 1 }, async (url) => {
    const first = fetch(`${url}/convert`, { method: "POST", headers: { "x-filename": "a.mscz" }, body: "PK" });
    await new Promise((r) => setTimeout(r, 50));
    const second = fetch(`${url}/convert`, { method: "POST", headers: { "x-filename": "b.mscz" }, body: "PK" });
    const early = await Promise.race([second, new Promise((r) => setTimeout(() => r("waiting"), 500))]);
    release();
    assert.notEqual(early, "waiting", "second request should be answered without waiting");
    assert.equal(early.status, 503);
    assert.match((await early.json()).error, /잠시 후 다시/);
    assert.equal((await first).status, 200);
  });
});
