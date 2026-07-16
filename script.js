const UNIT_ML = 0.01;
const SYRINGE_VISUAL_ML = 1;
const els = {
  form: document.querySelector("#calculatorForm"),
  amount: document.querySelector("#amountMg"),
  amountUnit: document.querySelector("#amountUnit"),
  waterMl: document.querySelector("#waterMl"),
  doseValue: document.querySelector("#doseValue"),
  doseUnit: document.querySelector("#doseUnit"),
  volumeMl: document.querySelector("#volumeMl"),
  unitResult: document.querySelector("#unitResult"),
  doseCount: document.querySelector("#doseCount"),
  syringeFill: document.querySelector("#syringeFill"),
  syringeDisclaimer: document.querySelector("#syringeDisclaimer"),
  faqList: document.querySelector("#faqList"),
  shareButton: document.querySelector("#shareButton"),
};

const state = {
  tip: null,
};

function numberFromInput(input) {
  return Number.parseFloat(input.value);
}

function formatNumber(value, max = 2) {
  if (!Number.isFinite(value)) return "0";
  const minimumFractionDigits = value > 0 && value < 1 ? Math.min(2, max) : 0;
  return new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: max,
    minimumFractionDigits,
  }).format(value);
}

function formatMl(value) {
  const digits = value < 0.1 ? 3 : 2;
  return `${formatNumber(value, digits)} mL`;
}

function doseInBaseUnits() {
  const dose = numberFromInput(els.doseValue);
  if (els.doseUnit.value === "mg") return dose * 1000;
  return dose;
}

function amountInBaseUnits() {
  const amount = numberFromInput(els.amount);
  return els.amountUnit.value === "mg" ? amount * 1000 : amount;
}

function unitsAreCompatible() {
  const amountIsIu = els.amountUnit.value === "iu";
  const doseIsIu = els.doseUnit.value === "iu";
  return amountIsIu === doseIsIu;
}

function setSyringeFill(volumeMl) {
  const fillWidth = Math.max(0, Math.min(300, (volumeMl / SYRINGE_VISUAL_ML) * 300));
  els.syringeFill.setAttribute("width", String(fillWidth));
}

function setResultError(message) {
  document.querySelector(".results-panel").classList.add("invalid-state");
  els.volumeMl.textContent = "-";
  els.unitResult.textContent = "-";
  els.doseCount.textContent = "-";
  els.syringeDisclaimer.textContent = message;
  setSyringeFill(0);
}

function clearResultError() {
  document.querySelector(".results-panel").classList.remove("invalid-state");
  els.volumeMl.classList.remove("invalid");
}

function calculate() {
  syncUrl();

  const amount = amountInBaseUnits();
  const dose = doseInBaseUnits();
  const waterMl = numberFromInput(els.waterMl);

  if (amount <= 0 || dose <= 0 || !Number.isFinite(amount) || !Number.isFinite(dose)) {
    setResultError("Amount and dose must be greater than zero.");
    return;
  }

  if (waterMl < 2 || waterMl > 10 || !Number.isFinite(waterMl)) {
    setResultError("Bacteriostatic water should be between 2 and 10 mL.");
    return;
  }

  if (!unitsAreCompatible()) {
    setResultError("IU is compound-specific. Use iU for both amount and dose, or use mg/mcg.");
    return;
  }

  clearResultError();

  const volumeMl = (dose / amount) * waterMl;
  const syringeUnits = volumeMl / UNIT_ML;
  const doses = amount / dose;

  els.volumeMl.textContent = formatMl(volumeMl);
  els.unitResult.textContent = formatNumber(syringeUnits, 1);
  els.doseCount.textContent = formatNumber(doses, doses < 1 ? 2 : 1);
  els.syringeDisclaimer.innerHTML = `This result is equivalent to <strong>${formatMl(volumeMl)}</strong>. We recommend you use a <strong>0.3 mL, 0.5 mL or 1 mL</strong> syringe.`;
  setSyringeFill(volumeMl);
}

function syncDoseUnitToAmount() {
  if (els.amountUnit.value === "iu") {
    els.doseUnit.value = "iu";
    return;
  }

  els.doseUnit.value = "mcg";
}

function syncUrl() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("mode");
    url.searchParams.set("amount", els.amount.value || "0");
    url.searchParams.set("amountUnit", els.amountUnit.value);
    url.searchParams.set("water", els.waterMl.value || "0");
    url.searchParams.set("dose", els.doseValue.value || "0");
    url.searchParams.set("unit", els.doseUnit.value);
    window.history.replaceState({}, "", url);
  } catch {
    // Some in-app browsers restrict history updates for local files.
  }
}

function restoreFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const amount = params.get("amount");
  const amountUnit = params.get("amountUnit");
  const water = params.get("water");
  const dose = params.get("dose");
  const unit = params.get("unit");

  if (amount) els.amount.value = amount;
  if (amountUnit === "mg" || amountUnit === "iu") els.amountUnit.value = amountUnit;
  if (water) els.waterMl.value = water;
  if (dose) els.doseValue.value = dose;
  if (unit === "mg" || unit === "mcg" || unit === "iu") els.doseUnit.value = unit;

  if (!unit) syncDoseUnitToAmount();
  calculate();
}

function showTip(button) {
  hideTip();

  const tip = document.createElement("div");
  tip.className = "tip-pop";
  tip.textContent = button.dataset.tip;
  document.body.append(tip);

  const rect = button.getBoundingClientRect();
  const top = rect.bottom + 10;
  const left = Math.min(rect.left - 12, window.innerWidth - tip.offsetWidth - 14);
  tip.style.top = `${top}px`;
  tip.style.left = `${Math.max(14, left)}px`;
  button.setAttribute("aria-label", button.dataset.tip);
  state.tip = tip;
}

function hideTip() {
  if (state.tip) {
    state.tip.remove();
    state.tip = null;
  }
}

function setTemporaryButtonText(button, text) {
  const original = button.textContent;
  button.textContent = text;
  window.setTimeout(() => {
    button.textContent = original;
  }, 1800);
}

async function copyShareText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  return false;
}

async function shareCalculator(event) {
  event.preventDefault();
  calculate();

  const canShareUrl = window.location.protocol === "http:" || window.location.protocol === "https:";
  const url = window.location.href;
  const text = canShareUrl
    ? `Renew Labs peptide calculator: ${url}`
    : "Renew Labs peptide calculator. Open the attached HTML file in your browser.";

  if (navigator.share) {
    try {
      const payload = {
        title: "Renew Labs Peptide Calculator",
        text,
      };
      if (canShareUrl) payload.url = url;
      await navigator.share(payload);
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }

  if (canShareUrl) {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    return;
  }

  try {
    if (await copyShareText(text)) {
      setTemporaryButtonText(els.shareButton, "Share text copied");
      return;
    }
  } catch {
    // Fall through to a visible, non-navigating fallback.
  }

  setTemporaryButtonText(els.shareButton, "Attach this HTML file");
}

els.amountUnit.addEventListener("change", () => {
  syncDoseUnitToAmount();
  calculate();
});

["input", "change"].forEach((eventName) => {
  els.form.addEventListener(eventName, () => calculate());
});

els.form.addEventListener("reset", (event) => {
  event.preventDefault();
  els.amount.value = "0";
  els.amountUnit.value = "mg";
  els.waterMl.value = "0";
  els.doseValue.value = "0";
  els.doseUnit.value = "mcg";
  calculate();
});

[els.amount, els.waterMl, els.doseValue].forEach((input) => {
  const clearZero = () => {
    if (input.value === "0") {
      input.value = "";
    }
  };

  input.addEventListener("pointerdown", clearZero);
  input.addEventListener("touchstart", clearZero, { passive: true });
  input.addEventListener("focus", clearZero);

  input.addEventListener("blur", () => {
    if (input.value.trim() === "") {
      input.value = "0";
      calculate();
    }
  });
});

document.querySelectorAll(".info-dot").forEach((button) => {
  button.title = button.dataset.tip;

  const openTip = (event) => {
    if (event.cancelable) event.preventDefault();
    event.stopPropagation();
    showTip(button);
  };

  button.addEventListener("pointerdown", openTip);
  button.addEventListener("click", openTip);
});

els.faqList.addEventListener("toggle", (event) => {
  const activeItem = event.target;
  if (!activeItem.open) return;

  els.faqList.querySelectorAll(".faq-item").forEach((item) => {
    if (item !== activeItem) item.open = false;
  });
}, true);

document.addEventListener("click", hideTip);
window.addEventListener("resize", hideTip);
els.shareButton.addEventListener("click", shareCalculator);

restoreFromUrl();
