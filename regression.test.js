/**
 * Durga Digital Library — Full Production Regression Test Suite
 * =============================================================
 * Self-contained: uses only Node built-ins (http, child_process, crypto).
 * No external test framework required.
 *
 * Run:  node regression.test.js
 *
 * The suite:
 *  1. Starts the Express server as a child process on port 3099 (test port).
 *  2. Runs 18 test cases covering every critical workflow.
 *  3. Prints a PASS / FAIL report with evidence.
 *  4. Exits with code 0 (all pass) or 1 (any failure).
 */

'use strict';

require('dotenv').config();

const http         = require('http');
const { spawn }    = require('child_process');
const crypto       = require('crypto');
const jwt          = require('jsonwebtoken');
const path         = require('path');

// ── Config ────────────────────────────────────────────────────────────────────
const TEST_PORT   = 3099;
const BASE_URL    = `http://127.0.0.1:${TEST_PORT}`;
const JWT_SECRET  = process.env.JWT_SECRET || 'development-only-secret-change-me';
const ADMIN_USER  = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS  = process.env.ADMIN_PASS || 'admin123';

// Unique suffix per test run so MongoDB doesn't collide with previous runs
const RUN_ID      = crypto.randomBytes(4).toString('hex');
// Guaranteed 10-digit numeric mobile: take last 9 digits of Date.now() and prefix with 9
const TEST_MOBILE = '9' + String(Date.now()).slice(-9);
const TEST_SEAT   = 'DDL001';

// ── State shared across tests ─────────────────────────────────────────────────
let serverProcess = null;
let adminToken    = null;
let createdInquiryId  = null;
let createdStudentId  = null;

// ── Results collector ─────────────────────────────────────────────────────────
const results = [];
function pass(name, evidence) {
  results.push({ status: 'PASS', name, evidence });
  console.log(`  ✅ PASS  ${name}`);
}
function fail(name, evidence) {
  results.push({ status: 'FAIL', name, evidence });
  console.error(`  ❌ FAIL  ${name}`);
  console.error(`          Evidence: ${JSON.stringify(evidence)}`);
}

// ── HTTP helper ───────────────────────────────────────────────────────────────
function request(method, urlPath, { body = null, token = null } = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr  = body ? JSON.stringify(body) : null;
    const headers  = { 'Content-Type': 'application/json' };
    if (token)    headers['Authorization'] = `Bearer ${token}`;
    if (bodyStr)  headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const opts = {
      method,
      hostname: '127.0.0.1',
      port:     TEST_PORT,
      path:     urlPath,
      headers
    };

    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => { raw += c; });
      res.on('end', () => {
        let json = null;
        const ct = res.headers['content-type'] || '';
        try { json = JSON.parse(raw); } catch (_) {}
        resolve({ status: res.statusCode, body: json, raw, contentType: ct });
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Wait for server to be ready ───────────────────────────────────────────────
function waitForServer(retries = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      request('GET', '/api/v1/health')
        .then(r => {
          if (r.status === 200 || r.status === 503) {
            // 200 = db ready, 503 = db still connecting; either means server is up
            resolve();
          } else {
            retry();
          }
        })
        .catch(() => retry());
    };
    const retry = () => {
      if (++attempts >= retries) return reject(new Error('Server did not start in time'));
      setTimeout(check, interval);
    };
    check();
  });
}

// ── Wait for DB ready (health returns status:ok) ──────────────────────────────
function waitForDB(retries = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      request('GET', '/api/v1/health')
        .then(r => {
          if (r.body && r.body.status === 'ok') return resolve();
          retry();
        })
        .catch(() => retry());
    };
    const retry = () => {
      if (++attempts >= retries) return reject(new Error('DB did not become ready in time'));
      setTimeout(check, interval);
    };
    setTimeout(check, interval);
  });
}

// ── Start server child process ────────────────────────────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      PORT:        String(TEST_PORT),
      NODE_ENV:    'test',         // disables IS_PRODUCTION guards
      ALLOWED_ORIGINS: '',
    };

    serverProcess = spawn(process.execPath, [path.join(__dirname, 'index.js')], {
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    serverProcess.stdout.on('data', d => process.stdout.write(`  [server] ${d}`));
    serverProcess.stderr.on('data', d => process.stderr.write(`  [server:err] ${d}`));
    serverProcess.on('error', reject);
    resolve();
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcess = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────────────────────

async function t01_health() {
  const r = await request('GET', '/api/v1/health');
  if (r.status === 200 && r.body && r.body.db === 'connected' && r.body.status === 'ok') {
    pass('T01 GET /api/v1/health — returns 200 with db:connected', r.body);
  } else {
    fail('T01 GET /api/v1/health — returns 200 with db:connected', { status: r.status, body: r.body });
  }
}

async function t02_config() {
  const r = await request('GET', '/api/v1/config');
  if (r.status === 200 && r.body && r.body.success === true && typeof r.body.inquiryLink === 'string') {
    pass('T02 GET /api/v1/config — returns 200 with inquiryLink', r.body);
  } else {
    fail('T02 GET /api/v1/config — returns 200 with inquiryLink', { status: r.status, body: r.body });
  }
}

async function t03_login_wrong_credentials() {
  const r = await request('POST', '/api/v1/admin/login', {
    body: { username: 'admin', password: 'wrongpassword' }
  });
  if (r.status === 401 && r.body && r.body.success === false) {
    pass('T03 POST /api/v1/admin/login — 401 on wrong credentials', { status: r.status });
  } else {
    fail('T03 POST /api/v1/admin/login — 401 on wrong credentials', { status: r.status, body: r.body });
  }
}

async function t04_login_correct() {
  const r = await request('POST', '/api/v1/admin/login', {
    body: { username: ADMIN_USER, password: ADMIN_PASS }
  });
  if (r.status === 200 && r.body && r.body.token && r.body.success === true) {
    adminToken = r.body.token;
    pass('T04 POST /api/v1/admin/login — 200 + JWT token returned', { tokenLength: adminToken.length });
  } else {
    fail('T04 POST /api/v1/admin/login — 200 + JWT token returned', { status: r.status, body: r.body });
  }
}

async function t05_protected_route_no_token() {
  const r = await request('GET', '/api/v1/students');
  if (r.status === 401 && r.body && r.body.success === false) {
    pass('T05 GET /api/v1/students — 401 without token (auth guard works)', { status: r.status });
  } else {
    fail('T05 GET /api/v1/students — 401 without token (auth guard works)', { status: r.status, body: r.body });
  }
}

async function t06_html_never_returned_from_api() {
  // Hitting a non-existent API path must return JSON 404, never HTML
  const r = await request('GET', '/api/v1/nonexistent-route', { token: adminToken });
  const isHtml = (r.contentType || '').includes('text/html');
  const isJson = (r.contentType || '').includes('application/json');
  if (!isHtml && r.status === 404 && isJson && r.body && r.body.success === false) {
    pass('T06 Non-existent /api/v1/* — 404 JSON, no HTML returned', { status: r.status, ct: r.contentType });
  } else {
    fail('T06 Non-existent /api/v1/* — 404 JSON, no HTML returned', { status: r.status, ct: r.contentType, body: r.body });
  }
}

async function t07_inquiry_missing_fields() {
  const r = await request('POST', '/api/v1/inquiries', {
    body: { name: 'Test' }   // missing mobile
  });
  if (r.status === 400 && r.body && r.body.success === false) {
    pass('T07 POST /api/v1/inquiries — 400 on missing mobile', { message: r.body.message });
  } else {
    fail('T07 POST /api/v1/inquiries — 400 on missing mobile', { status: r.status, body: r.body });
  }
}

async function t08_inquiry_create() {
  const r = await request('POST', '/api/v1/inquiries', {
    body: {
      name:           `RegTest_${RUN_ID}`,
      mobile:         TEST_MOBILE,
      email:          `regtest_${RUN_ID}@example.com`,
      preparation:    'UPSC',
      preferred_shift:'Shift 1'
    }
  });
  if (r.status === 200 && r.body && r.body.success === true) {
    pass('T08 POST /api/v1/inquiries — 200 inquiry created', { message: r.body.message });
  } else {
    fail('T08 POST /api/v1/inquiries — 200 inquiry created', { status: r.status, body: r.body });
  }
}

async function t09_duplicate_inquiry_blocked() {
  const r = await request('POST', '/api/v1/inquiries', {
    body: {
      name:   `RegTest_${RUN_ID}_dup`,
      mobile: TEST_MOBILE   // same mobile as T08
    }
  });
  if (r.status === 409 && r.body && r.body.success === false) {
    pass('T09 POST /api/v1/inquiries — 409 on duplicate pending mobile', { message: r.body.message });
  } else {
    fail('T09 POST /api/v1/inquiries — 409 on duplicate pending mobile', { status: r.status, body: r.body });
  }
}

async function t10_list_inquiries_and_find_created() {
  const r = await request('GET', '/api/v1/inquiries', { token: adminToken });
  if (r.status !== 200 || !r.body || !r.body.success) {
    fail('T10 GET /api/v1/inquiries — 200 + inquiry list loaded', { status: r.status, body: r.body });
    return;
  }
  const found = (r.body.inquiries || []).find(i => i.mobile === TEST_MOBILE);
  if (found && found.id) {
    createdInquiryId = found.id;
    pass('T10 GET /api/v1/inquiries — 200 + inquiry list loaded, test inquiry found', { id: createdInquiryId });
  } else {
    fail('T10 GET /api/v1/inquiries — test inquiry not found in list', { count: (r.body.inquiries || []).length });
  }
}

async function t11_online_admissions_loaded() {
  const r = await request('GET', '/api/v1/online-admissions', { token: adminToken });
  if (r.status === 200 && r.body && r.body.success === true && Array.isArray(r.body.admissions)) {
    const found = r.body.admissions.find(a => a.mobile === TEST_MOBILE);
    pass('T11 GET /api/v1/online-admissions — 200 + pending list returned', {
      count: r.body.admissions.length,
      testInquiryPresent: !!found
    });
  } else {
    fail('T11 GET /api/v1/online-admissions — 200 + pending list returned', { status: r.status, body: r.body });
  }
}

async function t12_seat_matrix_loads() {
  const r = await request('GET', '/api/v1/seats?shift=1', { token: adminToken });
  if (r.status === 200 && r.body && Array.isArray(r.body.seats) && r.body.seats.length === 24) {
    pass('T12 GET /api/v1/seats?shift=1 — 200 + 24 seats returned', { count: r.body.seats.length });
  } else {
    fail('T12 GET /api/v1/seats?shift=1 — 200 + 24 seats returned', { status: r.status, count: r.body?.seats?.length });
  }
}

async function t13_student_create_missing_fields() {
  const r = await request('POST', '/api/v1/students', {
    token: adminToken,
    body:  { name: 'No Mobile Student' }  // missing required fields
  });
  if (r.status === 400 && r.body && r.body.success === false) {
    pass('T13 POST /api/v1/students — 400 on missing required fields', { message: r.body.message });
  } else {
    fail('T13 POST /api/v1/students — 400 on missing required fields', { status: r.status, body: r.body });
  }
}

async function t14_accept_admission_wa_email_failure_does_not_break() {
  // Accept the inquiry created in T08.
  // WhatsApp isWaReady=false (server just started in test mode).
  // Email credentials may be invalid in test env.
  // The admission MUST still succeed (201) regardless.
  if (!createdInquiryId) {
    fail('T14 Accept admission — skipped, no inquiry ID from T10', {});
    return;
  }

  const today   = new Date();
  const expiry  = new Date(today); expiry.setMonth(expiry.getMonth() + 1);
  const fmt     = d => d.toISOString().slice(0, 10);

  const r = await request('POST', `/api/v1/online-admissions/accept/${createdInquiryId}`, {
    token: adminToken,
    body: {
      seatCode:    'DDL001',
      shift:       'Shift 1',
      shiftHours:  '6 AM - 12 PM (6 Hours)',
      fee:         400,
      duration:    '1 Month(s)',
      joiningDate: fmt(today),
      expiryDate:  fmt(expiry)
    }
  });

  if (r.status === 201 && r.body && r.body.success === true) {
    pass('T14 POST /api/v1/online-admissions/accept/:id — 201 even when WA/Email unavailable', {
      message: r.body.message,
      notification: r.body.notification
    });
  } else {
    fail('T14 POST /api/v1/online-admissions/accept/:id — 201 even when WA/Email unavailable', {
      status: r.status, body: r.body
    });
  }
}

async function t15_student_directory_updated_after_accept() {
  const r = await request('GET', '/api/v1/students', { token: adminToken });
  if (r.status !== 200 || !r.body || !r.body.students) {
    fail('T15 Student directory updated after accept — GET /students failed', { status: r.status });
    return;
  }
  const found = r.body.students.find(s => s.mobile === TEST_MOBILE);
  if (found && found.id) {
    createdStudentId = found.id;
    pass('T15 Student directory updated after accept — student appears in directory', {
      id: createdStudentId, seat: found.seatCode, shift: found.shift
    });
  } else {
    fail('T15 Student directory updated after accept — student NOT in directory', {
      count: r.body.students.length
    });
  }
}

async function t16_seat_matrix_updated_after_accept() {
  const r = await request('GET', '/api/v1/seats?shift=1', { token: adminToken });
  const booked = (r.body?.seats || []).find(s => s.seat_number === 1 && s.is_booked === true);
  if (booked) {
    pass('T16 Seat matrix updated after accept — DDL001/Shift1 is booked', {
      seat_number: booked.seat_number, student_name: booked.student_name
    });
  } else {
    fail('T16 Seat matrix updated after accept — DDL001/Shift1 NOT booked', {
      seats: (r.body?.seats || []).slice(0, 3)
    });
  }
}

async function t17_accept_already_accepted_inquiry() {
  // Trying to accept the same inquiry again must return 400
  if (!createdInquiryId) {
    fail('T17 Re-accept blocked — skipped, no inquiry ID', {});
    return;
  }
  const today  = new Date();
  const expiry = new Date(today); expiry.setMonth(expiry.getMonth() + 1);
  const fmt    = d => d.toISOString().slice(0, 10);

  const r = await request('POST', `/api/v1/online-admissions/accept/${createdInquiryId}`, {
    token: adminToken,
    body: {
      seatCode: 'DDL002', shift: 'Shift 1', shiftHours: '6 AM - 12 PM',
      fee: 400, duration: '1 Month(s)', joiningDate: fmt(today), expiryDate: fmt(expiry)
    }
  });
  if (r.status === 400 && r.body && r.body.success === false) {
    pass('T17 Re-accept blocked — 400 on already-accepted inquiry', { message: r.body.message });
  } else {
    fail('T17 Re-accept blocked — 400 on already-accepted inquiry', { status: r.status, body: r.body });
  }
}

async function t18_invalid_objectid_returns_400() {
  const badId = 'not-a-valid-id';
  const results18 = [];

  const r1 = await request('PUT',    `/api/v1/students/${badId}`,                      { token: adminToken, body: {} });
  const r2 = await request('DELETE', `/api/v1/students/${badId}`,                      { token: adminToken });
  const r3 = await request('POST',   `/api/v1/online-admissions/accept/${badId}`,      { token: adminToken, body: {} });
  const r4 = await request('POST',   `/api/v1/online-admissions/reject/${badId}`,      { token: adminToken });

  const checks = [
    { label: 'PUT /students/bad-id',           r: r1 },
    { label: 'DELETE /students/bad-id',        r: r2 },
    { label: 'POST /accept/bad-id',            r: r3 },
    { label: 'POST /reject/bad-id',            r: r4 },
  ];

  let allPassed = true;
  for (const c of checks) {
    if (c.r.status !== 400 || !c.r.body || c.r.body.success !== false) {
      allPassed = false;
      results18.push({ label: c.label, status: c.r.status, ok: false });
    } else {
      results18.push({ label: c.label, status: c.r.status, ok: true });
    }
  }

  if (allPassed) {
    pass('T18 All :id routes — 400 on invalid ObjectId', results18);
  } else {
    fail('T18 All :id routes — 400 on invalid ObjectId', results18);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function runAll() {
  console.log('\n══════════════════════════════════════════════════════════');
  console.log(' Durga Digital Library — Production Regression Test Suite');
  console.log('══════════════════════════════════════════════════════════\n');

  console.log('▶ Starting server on port', TEST_PORT, '...');
  await startServer();

  console.log('▶ Waiting for server to accept connections...');
  await waitForServer();

  console.log('▶ Waiting for MongoDB Atlas to become ready...');
  await waitForDB();

  console.log('\n── Running test cases ───────────────────────────────────\n');

  const tests = [
    t01_health,
    t02_config,
    t03_login_wrong_credentials,
    t04_login_correct,
    t05_protected_route_no_token,
    t06_html_never_returned_from_api,
    t07_inquiry_missing_fields,
    t08_inquiry_create,
    t09_duplicate_inquiry_blocked,
    t10_list_inquiries_and_find_created,
    t11_online_admissions_loaded,
    t12_seat_matrix_loads,
    t13_student_create_missing_fields,
    t14_accept_admission_wa_email_failure_does_not_break,
    t15_student_directory_updated_after_accept,
    t16_seat_matrix_updated_after_accept,
    t17_accept_already_accepted_inquiry,
    t18_invalid_objectid_returns_400,
  ];

  for (const t of tests) {
    try {
      await t();
    } catch (err) {
      fail(t.name, { error: err.message });
    }
  }

  stopServer();

  // ── Final Report ────────────────────────────────────────────────────────────
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const total  = results.length;

  console.log('\n══════════════════════════════════════════════════════════');
  console.log(` REGRESSION TEST REPORT — Durga Digital Library`);
  console.log('══════════════════════════════════════════════════════════');
  console.log(` Total:  ${total}   Passed: ${passed}   Failed: ${failed}`);
  console.log('──────────────────────────────────────────────────────────');

  results.forEach(r => {
    const icon  = r.status === 'PASS' ? '✅' : '❌';
    const evStr = r.status === 'FAIL' ? `\n         → ${JSON.stringify(r.evidence)}` : '';
    console.log(` ${icon}  ${r.name}${evStr}`);
  });

  console.log('══════════════════════════════════════════════════════════\n');

  if (failed > 0) {
    console.error(`❌ ${failed} test(s) FAILED. System is NOT production-ready.\n`);
    process.exit(1);
  } else {
    console.log(`✅ All ${passed} tests PASSED. System is production-ready.\n`);
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('Fatal runner error:', err);
  stopServer();
  process.exit(1);
});
