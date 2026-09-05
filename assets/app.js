/* Arjean Amiscosa Financial - funnel behaviour (no build step, no dependencies) */
(function () {
  "use strict";

  var CFG = window.APP_CONFIG || {};
  var QUIZ = window.QUIZ || [];
  var DQ = String.fromCharCode(34);
  var SQ = String.fromCharCode(39);

  var state = {
    index: 0,
    answers: {},
    lead: null,
    results: null,
    saving: false,
    error: ""
  };

  var overlay, ovLabel, ovBars, ovBody;

  /* ---------------- helpers ---------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function all(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? "" : s)
      .split("&").join("&amp;")
      .split("<").join("&lt;")
      .split(">").join("&gt;")
      .split(DQ).join("&quot;")
      .split(SQ).join("&#39;");
  }

  function num(v) {
    var n = parseFloat(String(v == null ? "" : v).replace(/[^0-9.]/g, ""));
    return isFinite(n) ? n : 0;
  }

  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

  function roundTo(n, step) {
    step = step || 50000;
    return Math.max(0, Math.round(n / step) * step);
  }

  function peso(n) {
    var sym = CFG.currencySymbol || "P";
    try {
      return sym + Number(n).toLocaleString(CFG.locale || "en-PH", { maximumFractionDigits: 0 });
    } catch (e) {
      return sym + Math.round(n);
    }
  }

  function has(list, v) { return !!list && list.indexOf(v) !== -1; }

  function ageFrom(dobString) {
    var d = new Date(dobString);
    if (isNaN(d.getTime())) return null;
    var t = new Date();
    var a = t.getFullYear() - d.getFullYear();
    var m = t.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < d.getDate())) a--;
    return a;
  }

  function utmParams() {
    var out = {};
    try {
      var p = new URLSearchParams(window.location.search);
      ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"].forEach(function (k) {
        var v = p.get(k);
        if (v) out[k] = v.slice(0, 120);
      });
    } catch (e) {}
    return out;
  }

  /* ---------------- question flow ---------------- */
  function visibleQuestions() {
    return QUIZ.filter(function (q) {
      return typeof q.showIf !== "function" || q.showIf(state.answers) === true;
    });
  }

  /* ---------------- scoring engine ---------------- */
  function computeResults(a) {
    var support = num(a.support);
    var years = clamp(num(a.years), 0, 40);
    var dependents = clamp(num(a.dependents), 0, 15);
    var debt = a.debt === "yes" ? num(a.debtAmount) : 0;
    var income = num(a.income);
    var outflow = num(a.outflow);
    var sources = a.sources || [];
    var cover = a.coverage || [];

    var CI_MAP = { "750000": 750000, "1500000": 1500000, "2500000": 2500000, "unsure": 1500000 };
    var ciBase = CI_MAP[a.ciCost] || 1500000;
    var runway = a.runway === "unsure" ? 2 : num(a.runway);

    /* Recommended amounts */
    var life = roundTo(support * 12 * years + debt + 200000);
    var ci = roundTo(ciBase + outflow * 6);
    var cont = roundTo(outflow * 24);
    var legacy = roundTo(dependents > 0 ? dependents * 600000 : income * 12);

    /* Pillar 1 - income protection (out of 30) */
    var p1 = runway >= 12 ? 24 : runway >= 6 ? 17 : runway >= 3 ? 10 : 5;
    if (has(cover, "personal")) p1 += 6;
    p1 = clamp(p1, 0, 30);

    /* Pillar 2 - critical illness readiness (out of 25) */
    var p2 = 4;
    if (has(sources, "insurance")) p2 += 13;
    if (has(sources, "hmo")) p2 += 5;
    if (has(sources, "savings")) p2 += 4;
    if (has(sources, "government")) p2 += 2;
    if (has(sources, "loans")) p2 -= 3;
    if (has(sources, "family")) p2 -= 2;
    if (has(sources, "assets")) p2 -= 1;
    p2 = clamp(p2, 0, 25);

    /* Pillar 3 - cash flow and emergency fund (out of 25) */
    var ratio = income > 0 ? (income - outflow) / income : 0;
    var p3 = ratio >= 0.3 ? 25 : ratio >= 0.2 ? 20 : ratio >= 0.1 ? 14 : ratio > 0 ? 8 : 2;

    /* Pillar 4 - life and legacy (out of 20) */
    var p4 = 0;
    if (has(cover, "personal")) p4 += 12;
    else if (has(cover, "employer")) p4 += 7;
    else if (has(cover, "government")) p4 += 3;
    p4 += a.debt === "no" ? 6 : 2;
    if (has(cover, "none")) p4 = Math.min(p4, 3);
    p4 = clamp(p4, 0, 20);

    var score = clamp(Math.round(p1 + p2 + p3 + p4), 1, 100);

    var band = score >= 85 ? { key: "strong", label: "Well protected", cls: "band-ok" }
      : score >= 70 ? { key: "ontrack", label: "On track", cls: "band-ok" }
      : score >= 50 ? { key: "attention", label: "Needs attention", cls: "band-warn" }
      : { key: "highrisk", label: "High risk", cls: "band-bad" };

    function stat(v, max) {
      var r = max > 0 ? v / max : 0;
      if (r >= 0.75) return { cls: "good", label: "On track" };
      if (r >= 0.45) return { cls: "review", label: "Needs review" };
      return { cls: "gap", label: "Gap found" };
    }

    return {
      score: score,
      band: band,
      breakdown: { income_protection: p1, critical_illness: p2, cash_flow: p3, life_legacy: p4 },
      pillars: [
        { name: "Income protection", stat: stat(p1, 30) },
        { name: "Critical illness cover", stat: stat(p2, 25) },
        { name: "Cash flow and emergency fund", stat: stat(p3, 25) },
        { name: "Life and legacy protection", stat: stat(p4, 20) }
      ],
      recommendations: [
        { icon: "\u2661", name: "Life insurance coverage", amount: life, note: "Replaces the support your household depends on and clears what you owe." },
        { icon: "\u26E8", name: "Critical illness fund", amount: ci, note: "Cash for treatment plus about six months of living costs." },
        { icon: "\u2602", name: "Income continuation", amount: cont, note: "Roughly two years of expenses if you cannot work." },
        { icon: "\u2691", name: dependents > 0 ? "Education and legacy fund" : "Future goals fund", amount: legacy, note: "A separate pot so long-term plans are not funded out of emergency money." }
      ]
    };
  }

  /* ---------------- supabase ---------------- */
  function supabaseReady() {
    var u = String(CFG.supabaseUrl || "");
    var k = String(CFG.supabaseAnonKey || "");
    return u.indexOf("http") === 0 && u.indexOf("REPLACE_WITH") === -1 &&
           k.length > 20 && k.indexOf("REPLACE_WITH") === -1;
  }

  function sbInsert(table, payload) {
    var base = String(CFG.supabaseUrl || "").replace(/\/+$/, "");
    return fetch(base + "/rest/v1/" + table, {
      method: "POST",
      headers: {
        "apikey": CFG.supabaseAnonKey,
        "Authorization": "Bearer " + CFG.supabaseAnonKey,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(payload)
    }).then(function (r) {
      if (r.ok) return true;
      return r.text().then(function (t) { throw new Error("HTTP " + r.status + " " + t); });
    });
  }

  /* ---------------- overlay shell ---------------- */
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Financial Roadmap Test");
    overlay.innerHTML =
      "<div class=" + DQ + "ov-top" + DQ + "><div class=" + DQ + "wrap ov-top-inner" + DQ + ">" +
        "<button type=" + DQ + "button" + DQ + " class=" + DQ + "ov-close" + DQ + " data-close aria-label=" + DQ + "Close the test" + DQ + ">&times;</button>" +
        "<span class=" + DQ + "ov-label" + DQ + "></span>" +
        "<span class=" + DQ + "ov-bars" + DQ + "></span>" +
      "</div></div><div class=" + DQ + "ov-body" + DQ + "></div>";
    document.body.appendChild(overlay);
    ovLabel = $(".ov-label", overlay);
    ovBars = $(".ov-bars", overlay);
    ovBody = $(".ov-body", overlay);
    overlay.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeTest();
    });
  }

  function setBars(total, done) {
    var h = "";
    for (var i = 0; i < total; i++) {
      h += "<span class=" + DQ + (i < done ? "on" : "") + DQ + "></span>";
    }
    ovBars.innerHTML = h;
  }

  function openTest() {
    ensureOverlay();
    if (state.stage === "result") {
      state.index = 0;
      state.answers = {};
      state.lead = null;
      state.results = null;
    }
    state.stage = "quiz";
    state.error = "";
    overlay.classList.add("open");
    document.body.classList.add("noscroll");
    render();
    overlay.scrollTop = 0;
  }

  function closeTest() {
    if (!overlay) return;
    overlay.classList.remove("open");
    document.body.classList.remove("noscroll");
  }

  /* ---------------- render ---------------- */
  function render() {
    if (state.stage === "quiz") return renderQuestion();
    if (state.stage === "form") return renderForm();
    if (state.stage === "saving") return renderSaving();
    if (state.stage === "result") return renderResult();
  }

  function renderQuestion() {
    var qs = visibleQuestions();
    var q = qs[state.index];
    if (!q) { state.stage = "form"; return render(); }

    ovLabel.textContent = "QUESTION " + (state.index + 1) + " OF " + qs.length;
    setBars(qs.length, state.index + 1);

    var h = "<h2 class=" + DQ + "q-title" + DQ + ">" + esc(q.q) + "</h2>";
    if (q.hint) h += "<p class=" + DQ + "q-hint" + DQ + ">" + esc(q.hint) + "</p>";
    if (state.error) h += "<div class=" + DQ + "err" + DQ + ">" + esc(state.error) + "</div>";

    if (q.type === "single" || q.type === "multi") {
      var chosen = state.answers[q.id];
      h += "<div class=" + DQ + "options" + DQ + ">";
      q.options.forEach(function (o) {
        var on = q.type === "multi" ? has(chosen || [], o.v) : chosen === o.v;
        h += "<button type=" + DQ + "button" + DQ + " class=" + DQ + "option" + (on ? " on" : "") + DQ +
             " data-opt=" + DQ + esc(o.v) + DQ + "><span>" + esc(o.l) + "</span>" +
             "<span class=" + DQ + "box" + DQ + ">&#10003;</span></button>";
      });
      h += "</div>";
    } else {
      var val = state.answers[q.id] == null ? "" : state.answers[q.id];
      h += "<div class=" + DQ + "input-group" + DQ + ">";
      if (q.type === "currency") {
        h += "<span class=" + DQ + "prefix" + DQ + ">" + esc(CFG.currencySymbol || "P") + "</span>";
        h += "<input class=" + DQ + "input" + DQ + " id=" + DQ + "qnum" + DQ + " type=" + DQ + "number" + DQ +
             " inputmode=" + DQ + "numeric" + DQ + " min=" + DQ + "0" + DQ + " step=" + DQ + "100" + DQ +
             " placeholder=" + DQ + "0" + DQ + " value=" + DQ + esc(val) + DQ + ">";
      } else {
        h += "<input class=" + DQ + "input" + DQ + " id=" + DQ + "qnum" + DQ + " type=" + DQ + "number" + DQ +
             " inputmode=" + DQ + "numeric" + DQ + " min=" + DQ + "0" + DQ + " step=" + DQ + "1" + DQ +
             " placeholder=" + DQ + "0" + DQ + " value=" + DQ + esc(val) + DQ + ">";
        h += "<span class=" + DQ + "prefix" + DQ + ">" + esc(q.unit || "") + "</span>";
      }
      h += "</div>";
    }

    var needsNext = q.type !== "single";
    h += "<div class=" + DQ + "nav-row" + DQ + ">" +
         "<button type=" + DQ + "button" + DQ + " class=" + DQ + "btn btn-ghost" + DQ + " data-back>&larr; Back</button>" +
         (needsNext ? "<button type=" + DQ + "button" + DQ + " class=" + DQ + "btn btn-dark" + DQ + " data-next>Next</button>" : "<span></span>") +
         "</div>";

    ovBody.innerHTML = h;
    overlay.scrollTop = 0;
    wireQuestion(q);
  }

  function wireQuestion(q) {
    all("[data-opt]", ovBody).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var v = btn.getAttribute("data-opt");
        state.error = "";
        if (q.type === "single") {
          state.answers[q.id] = v;
          goNext();
        } else {
          var cur = state.answers[q.id] || [];
          var i = cur.indexOf(v);
          if (i === -1) cur.push(v); else cur.splice(i, 1);
          state.answers[q.id] = cur;
          renderQuestion();
        }
      });
    });

    var back = $("[data-back]", ovBody);
    if (back) back.addEventListener("click", goBack);

    var next = $("[data-next]", ovBody);
    var input = $("#qnum", ovBody);

    function commit() {
      state.error = "";
      if (q.type === "multi") {
        if (!(state.answers[q.id] || []).length) {
          state.error = "Please pick at least one option.";
          return renderQuestion();
        }
      } else {
        var raw = input ? input.value : "";
        if (raw === "" || isNaN(parseFloat(raw)) || parseFloat(raw) < 0) {
          state.error = "Please enter a number. An estimate is fine.";
          return renderQuestion();
        }
        state.answers[q.id] = parseFloat(raw);
      }
      goNext();
    }

    if (next) next.addEventListener("click", commit);
    if (input) {
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); commit(); }
      });
      setTimeout(function () { input.focus(); }, 30);
    }
  }

  function goNext() {
    var qs = visibleQuestions();
    if (state.index + 1 >= qs.length) {
      state.index = qs.length;
      state.stage = "form";
    } else {
      state.index += 1;
    }
    render();
  }

  function goBack() {
    state.error = "";
    if (state.stage === "form") {
      state.stage = "quiz";
      state.index = Math.max(0, visibleQuestions().length - 1);
      return render();
    }
    if (state.index === 0) return closeTest();
    state.index -= 1;
    render();
  }

  /* ---------------- lead form ---------------- */
  function renderForm() {
    ovLabel.textContent = "ALMOST THERE";
    setBars(1, 1);

    var h = "";
    h += "<h2 class=" + DQ + "q-title" + DQ + ">Where should we send your snapshot?</h2>";
    h += "<p class=" + DQ + "q-hint" + DQ + ">Takes about 20 seconds. Your report appears on the next screen.</p>";
    if (state.error) h += "<div class=" + DQ + "err" + DQ + ">" + esc(state.error) + "</div>";

    h += "<div class=" + DQ + "row2" + DQ + ">";
    h += field("f_surname", "Surname", "<input id=" + DQ + "f_surname" + DQ + " class=" + DQ + "input" + DQ + " autocomplete=" + DQ + "family-name" + DQ + " placeholder=" + DQ + "e.g. Amiscosa" + DQ + ">");
    h += field("f_first", "First name", "<input id=" + DQ + "f_first" + DQ + " class=" + DQ + "input" + DQ + " autocomplete=" + DQ + "given-name" + DQ + " placeholder=" + DQ + "e.g. Maria" + DQ + ">");
    h += "</div>";
    h += field("f_middle", "Middle name (optional)", "<input id=" + DQ + "f_middle" + DQ + " class=" + DQ + "input" + DQ + " autocomplete=" + DQ + "additional-name" + DQ + ">");
    h += field("f_email", "Email", "<input id=" + DQ + "f_email" + DQ + " class=" + DQ + "input" + DQ + " type=" + DQ + "email" + DQ + " autocomplete=" + DQ + "email" + DQ + " placeholder=" + DQ + "you@email.com" + DQ + ">");
    h += field("f_dob", "Date of birth", "<input id=" + DQ + "f_dob" + DQ + " class=" + DQ + "input" + DQ + " type=" + DQ + "date" + DQ + ">");

    h += "<div class=" + DQ + "field" + DQ + "><span class=" + DQ + "label" + DQ + ">Preferred contact</span><div class=" + DQ + "row2" + DQ + ">";
    h += "<select id=" + DQ + "f_channel" + DQ + " class=" + DQ + "input" + DQ + ">" +
         "<option value=" + DQ + "mobile" + DQ + ">Mobile or SMS</option>" +
         "<option value=" + DQ + "viber" + DQ + ">Viber</option>" +
         "<option value=" + DQ + "messenger" + DQ + ">Messenger</option>" +
         "<option value=" + DQ + "email" + DQ + ">Email only</option></select>";
    h += "<div class=" + DQ + "input-group" + DQ + "><span class=" + DQ + "prefix" + DQ + ">+63</span>" +
         "<input id=" + DQ + "f_mobile" + DQ + " class=" + DQ + "input" + DQ + " type=" + DQ + "tel" + DQ +
         " inputmode=" + DQ + "numeric" + DQ + " maxlength=" + DQ + "13" + DQ + " placeholder=" + DQ + "9XX XXX XXXX" + DQ + "></div>";
    h += "</div><p class=" + DQ + "micro" + DQ + ">Enter the 10 digits after +63, starting with 9.</p></div>";

    h += "<label class=" + DQ + "consent" + DQ + "><input type=" + DQ + "checkbox" + DQ + " id=" + DQ + "f_consent" + DQ + ">" +
         "<span>I agree to my answers being used to prepare my Financial Health Report and to be contacted about a free, no-obligation consultation. See the " +
         "<a href=" + DQ + "#" + DQ + " data-privacy>Privacy Notice</a>. I can ask to be removed at any time.</span></label>";

    h += "<div class=" + DQ + "nav-row" + DQ + ">" +
         "<button type=" + DQ + "button" + DQ + " class=" + DQ + "btn btn-ghost" + DQ + " data-back>&larr; Back</button>" +
         "<button type=" + DQ + "button" + DQ + " class=" + DQ + "btn btn-gold" + DQ + " data-submit>Get My Snapshot</button></div>";

    ovBody.innerHTML = h;
    overlay.scrollTop = 0;

    var L0 = state.lead || {};
    setVal("f_surname", L0.surname); setVal("f_first", L0.first_name); setVal("f_middle", L0.middle_name);
    setVal("f_email", L0.email); setVal("f_dob", L0.date_of_birth); setVal("f_mobile", L0.mobileRaw);
    if (L0.preferred_contact) setVal("f_channel", L0.preferred_contact);

    $("[data-back]", ovBody).addEventListener("click", goBack);
    $("[data-submit]", ovBody).addEventListener("click", submitForm);
  }

  function field(id, label, control) {
    return "<div class=" + DQ + "field" + DQ + "><label class=" + DQ + "label" + DQ + " for=" + DQ + id + DQ + ">" +
           esc(label) + "</label>" + control + "</div>";
  }

  function setVal(id, v) {
    var el = $("#" + id, ovBody);
    if (el && v != null) el.value = v;
  }

  function submitForm() {
    var surname = ($("#f_surname", ovBody).value || "").trim();
    var first = ($("#f_first", ovBody).value || "").trim();
    var middle = ($("#f_middle", ovBody).value || "").trim();
    var email = ($("#f_email", ovBody).value || "").trim();
    var dob = ($("#f_dob", ovBody).value || "").trim();
    var channel = $("#f_channel", ovBody).value;
    var mobileRaw = ($("#f_mobile", ovBody).value || "").replace(/[^0-9]/g, "");
    var consent = $("#f_consent", ovBody).checked;

    var err = "";
    if (!surname || !first) err = "Please fill in your first name and surname.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) err = "Please enter a valid email address.";
    else if (!dob) err = "Please enter your date of birth.";
    else {
      var age = ageFrom(dob);
      var minA = CFG.minAge || 18, maxA = CFG.maxAge || 75;
      if (age == null || age < minA || age > maxA) {
        err = "Please enter a date of birth between " + minA + " and " + maxA + " years of age.";
      }
    }
    if (!err && channel !== "email" && !/^9[0-9]{9}$/.test(mobileRaw)) {
      err = "Please enter a 10-digit mobile number starting with 9, or choose Email only.";
    }
    if (!err && !consent) err = "Please tick the consent box so we can prepare and send your report.";

    if (err) { state.error = err; return renderForm(); }

    state.error = "";
    state.lead = {
      surname: surname,
      first_name: first,
      middle_name: middle || null,
      email: email,
      date_of_birth: dob,
      preferred_contact: channel,
      mobileRaw: mobileRaw,
      mobile: mobileRaw ? "+63" + mobileRaw : null
    };
    state.results = computeResults(state.answers);
    state.stage = "saving";
    render();
    persist();
  }

  function persist() {
    var L0 = state.lead, R = state.results;
    var payload = {
      surname: L0.surname,
      first_name: L0.first_name,
      middle_name: L0.middle_name,
      email: L0.email,
      date_of_birth: L0.date_of_birth,
      preferred_contact: L0.preferred_contact,
      mobile: L0.mobile,
      consent: true,
      answers: state.answers,
      results: R,
      score: R.score,
      risk_band: R.band.key,
      source: "web",
      landing_path: window.location.pathname,
      utm: utmParams()
    };

    if (!supabaseReady()) {
      if (window.console) console.warn("Supabase is not configured - showing results without saving.");
      state.stage = "result";
      return render();
    }

    sbInsert("leads", payload).then(function () {
      state.stage = "result";
      render();
    }).catch(function (e) {
      if (window.console) console.error(e);
      state.error = "We could not save your answers just now. Please check your connection and try again.";
      state.stage = "form";
      render();
    });
  }

  function renderSaving() {
    ovLabel.textContent = "BUILDING YOUR REPORT";
    setBars(1, 1);
    ovBody.innerHTML = "<div class=" + DQ + "loading-wrap" + DQ + "><div class=" + DQ + "spin" + DQ + "></div>" +
      "<h2 class=" + DQ + "q-title" + DQ + ">Crunching your numbers</h2>" +
      "<p class=" + DQ + "q-hint" + DQ + ">This only takes a moment.</p></div>";
  }

  /* ---------------- results ---------------- */
  function renderResult() {
    var L0 = state.lead || {}, R = state.results;
    ovLabel.textContent = "YOUR FINANCIAL HEALTH REPORT";
    setBars(1, 1);

    var h = "";
    h += "<div class=" + DQ + "res-head" + DQ + ">";
    h += "<p class=" + DQ + "eyebrow" + DQ + ">GENERATED FOR YOU</p>";
    h += "<h2 class=" + DQ + "q-title" + DQ + ">Hi " + esc(L0.first_name || "there") + ", here is where you stand.</h2>";
    h += "<p class=" + DQ + "q-hint" + DQ + ">Based only on the answers you gave. " +
         esc(CFG.advisorFirstName || "Your advisor") + " has your details and will reach out about your free consultation.</p>";
    h += "</div>";

    h += "<div class=" + DQ + "report-card" + DQ + ">";
    h += "<div class=" + DQ + "gauge" + DQ + ">";
    if (CFG.showScore !== false) {
      h += "<div class=" + DQ + "ring" + DQ + " style=" + DQ + "--pct:" + R.score + DQ + ">" +
           "<span class=" + DQ + "ring-inner" + DQ + "><span class=" + DQ + "ring-num" + DQ + ">" + R.score + "</span>" +
           "<span class=" + DQ + "ring-of" + DQ + ">out of 100</span></span></div>";
    }
    h += "<div><span class=" + DQ + "band " + R.band.cls + DQ + ">" + esc(R.band.label) + "</span>" +
         "<p class=" + DQ + "card-muted" + DQ + " style=" + DQ + "margin:0" + DQ + ">" + esc(bandCopy(R.band.key)) + "</p></div>";
    h += "</div>";

    h += "<ul class=" + DQ + "pillars" + DQ + ">";
    R.pillars.forEach(function (p) {
      h += "<li><span>" + esc(p.name) + "</span><span class=" + DQ + "pstat " + p.stat.cls + DQ + ">" + esc(p.stat.label) + "</span></li>";
    });
    h += "</ul></div>";

    h += "<h3 style=" + DQ + "margin:34px 0 14px" + DQ + ">Your recommended coverage</h3>";
    h += "<div class=" + DQ + "rec-list" + DQ + ">";
    R.recommendations.forEach(function (r) {
      h += "<div class=" + DQ + "rec" + DQ + "><div class=" + DQ + "ico" + DQ + ">" + r.icon + "</div>" +
           "<div class=" + DQ + "s-body" + DQ + "><p class=" + DQ + "s-name" + DQ + ">" + esc(r.name) + "</p>" +
           "<p class=" + DQ + "s-amt" + DQ + ">" + esc(peso(r.amount)) + "</p>" +
           "<p class=" + DQ + "micro" + DQ + " style=" + DQ + "margin:2px 0 0" + DQ + ">" + esc(r.note) + "</p></div></div>";
    });
    h += "</div>";

    h += "<div class=" + DQ + "next" + DQ + ">";
    h += "<p class=" + DQ + "eyebrow" + DQ + ">STEP 2</p>";
    h += "<h3>Book your free 30-minute call</h3>";
    h += "<p class=" + DQ + "card-muted" + DQ + ">We walk through these numbers together, look at what fits your monthly budget, " +
         "and you decide what to do next. No obligation either way.</p>";
    if (CFG.bookingUrl) {
      h += "<button type=" + DQ + "button" + DQ + " class=" + DQ + "btn btn-gold btn-block" + DQ + " data-book>Book my free call</button>";
    } else {
      h += "<p class=" + DQ + "micro" + DQ + " style=" + DQ + "margin:0" + DQ + ">Your details are in. " +
           esc(CFG.advisorFirstName || "Your advisor") + " will message you on your preferred channel to set a time.</p>";
    }
    h += "<div data-book-note class=" + DQ + "micro hidden" + DQ + " style=" + DQ + "margin-top:10px" + DQ + "></div>";
    h += "</div>";

    h += "<p class=" + DQ + "disclaimer" + DQ + ">This snapshot is an educational estimate produced from the answers you gave. " +
         "It is not a policy quote, an offer of insurance, or personalised financial advice. Actual coverage, premiums and " +
         "eligibility depend on underwriting and the product you choose.</p>";

    h += "<div class=" + DQ + "nav-row" + DQ + "><button type=" + DQ + "button" + DQ + " class=" + DQ + "btn btn-light" + DQ + " data-close>Back to the site</button><span></span></div>";

    ovBody.innerHTML = h;
    overlay.scrollTop = 0;

    var book = $("[data-book]", ovBody);
    if (book) book.addEventListener("click", onBook);
  }

  function bandCopy(key) {
    if (key === "strong") return "Your foundations look solid. The call is about fine tuning, not fixing.";
    if (key === "ontrack") return "You are in reasonable shape, with one or two areas worth tightening.";
    if (key === "attention") return "There are real gaps here that are still cheap and easy to close today.";
    return "Right now your household carries most of the risk itself. That is the part worth talking about.";
  }

  function onBook() {
    var note = $("[data-book-note]", ovBody);
    if (CFG.bookingUrl) window.open(CFG.bookingUrl, "_blank", "noopener");
    if (supabaseReady() && state.lead) {
      sbInsert("call_requests", {
        email: state.lead.email,
        mobile: state.lead.mobile,
        preferred_contact: state.lead.preferred_contact,
        score: state.results ? state.results.score : null,
        notes: "Requested a call from the results screen."
      }).catch(function (e) { if (window.console) console.error(e); });
    }
    if (note) {
      note.textContent = "Booking page opened in a new tab. If it did not open, please allow pop-ups and try again.";
      note.classList.remove("hidden");
    }
  }

  /* ---------------- privacy notice ---------------- */
  function openPrivacy() {
    var m = $("#privacy");
    if (m) m.classList.add("open");
  }

  function closePrivacy() {
    var m = $("#privacy");
    if (m) m.classList.remove("open");
  }

  /* ---------------- boot ---------------- */
  function applyBranding() {
    all("[data-brand-name]").forEach(function (el) { el.textContent = CFG.brandName || el.textContent; });
    all("[data-brand-initials]").forEach(function (el) { el.textContent = CFG.brandInitials || el.textContent; });
    all("[data-brand-tagline]").forEach(function (el) { el.textContent = CFG.brandTagline || el.textContent; });
    all("[data-advisor-first]").forEach(function (el) { el.textContent = CFG.advisorFirstName || el.textContent; });
    all("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  function init() {
    applyBranding();

    document.addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest("[data-start-test]")) { e.preventDefault(); return openTest(); }
      if (t.closest("[data-privacy]")) { e.preventDefault(); return openPrivacy(); }
      if (t.closest("[data-privacy-close]")) { e.preventDefault(); return closePrivacy(); }
      var m = $("#privacy");
      if (m && t === m) closePrivacy();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var m = $("#privacy");
      if (m && m.classList.contains("open")) return closePrivacy();
      if (overlay && overlay.classList.contains("open")) closeTest();
    });

    if (!QUIZ.length && window.console) console.error("No questions loaded - check assets/quiz.js");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* exposed for debugging in the browser console */
  window.FunnelDebug = { state: state, compute: computeResults, open: openTest };
})();
